/* script.js - Mastermind (jQuery) */
(() => {
  "use strict";

  const CONFIG = {
    codeLength: 4,
    maxTurns: 10,
    colors: ["red", "yellow", "green", "blue", "pink", "black", "white"],
    rowNames: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
    selectors: {
      paletteColors: ".bottom span:not(.delete):not(.submit)",
      deleteBtn: ".delete",
      submitBtn: ".submit",

      // matchar din HTML
      resetBtn: "#resetBtn",
      chooseCodeBtn: "#chooseCodeBtn",
      modeSelect: "#modeSelect",

      topSlots: [".color-one", ".color-two", ".color-three", ".color-four"],
      dotsBox: (rowIndex) => `.dots${rowIndex + 1}`,
      slot: (rowName, posIndex) => `.${rowName}-${posIndex + 1}`,
      rowSlots: (rowName) => `.${rowName}-1, .${rowName}-2, .${rowName}-3, .${rowName}-4`,
    },
  };

  class MastermindGame {
    constructor(config) {
      this.config = config;

      this.mode = "computer";
      this.codeChosen = true;
      this.settingSecret = false;
      this.secretDraft = [];
      this.secretPos = 0;

      this.secret = createSecret(config);
      this.currentRowIndex = 0;
      this.currentPosIndex = 0;
      this.currentGuess = [];
    }

    init() {
      this.bindEvents();
      this.syncModeFromUI();
    }

    bindEvents() {
      $(this.config.selectors.paletteColors).on("click", this.handlePaletteClick.bind(this));
      $(this.config.selectors.deleteBtn).on("click", this.handleDeleteClick.bind(this));
      $(this.config.selectors.submitBtn).on("click", this.handleSubmitClick.bind(this));

      $(this.config.selectors.resetBtn).on("click", this.handleResetClick.bind(this));
      $(this.config.selectors.chooseCodeBtn).on("click", this.handleChooseCodeClick.bind(this));
      $(this.config.selectors.modeSelect).on("change", this.handleModeChange.bind(this));
    }

    // ----- Mode -----
    syncModeFromUI() {
      this.mode = ($(this.config.selectors.modeSelect).val() || "computer");
      this.applyMode();
    }

    handleModeChange() {
      this.mode = ($(this.config.selectors.modeSelect).val() || "computer");
      this.applyMode();
    }

    applyMode() {
      const $choose = $(this.config.selectors.chooseCodeBtn);

      if (this.mode === "computer") {
        this.codeChosen = true;
        this.settingSecret = false;
        $choose.prop("disabled", true);
        this.reset(true, true);
      } else {
        this.codeChosen = false;
        this.settingSecret = false;
        $choose.prop("disabled", false);
        this.reset(false, true);
      }
    }

    // ----- Secret setup -----
    enterSecretSetup() {
      this.settingSecret = true;
      this.codeChosen = false;
      this.secretDraft = [];
      this.secretPos = 0;

      this.reset(false, false);
      this.showTopSlotsEmpty();
    }

    showTopSlotsEmpty() {
      this.config.selectors.topSlots.forEach((selector) => {
        const $slot = $(selector);
        $slot.removeClass(this.config.colors.join(" "));
        $slot.css("display", "block");
      });
    }

    hideTopSlots() {
      this.config.selectors.topSlots.forEach((selector) => {
        const $slot = $(selector);
        $slot.css("display", "");
      });
    }

    putSecretColor(color) {
      if (this.secretPos >= this.config.codeLength) return;

      const selector = this.config.selectors.topSlots[this.secretPos];
      const $slot = $(selector);
      $slot.removeClass(this.config.colors.join(" "));
      $slot.addClass(color);
      $slot.css("display", "block");

      this.secretDraft.push(color);
      this.secretPos++;
    }

    deleteSecretColor() {
      if (this.secretPos <= 0) return;

      this.secretPos--;
      this.secretDraft.pop();

      const selector = this.config.selectors.topSlots[this.secretPos];
      const $slot = $(selector);
      $slot.removeClass(this.config.colors.join(" "));
    }

    confirmSecret() {
      if (this.secretDraft.length !== this.config.codeLength) {
        showNotification("Invalid Code", `You must select exactly ${this.config.codeLength} colors.`);
        return;
      }

      this.secret = [...this.secretDraft];
      this.settingSecret = false;
      this.codeChosen = true;

      this.hideTopSlots();
      this.reset(false, true);
    }

    // ----- Click handlers -----
    handleChooseCodeClick() {
      if (this.mode !== "human") return;
      this.enterSecretSetup();
    }

    handleResetClick() {
      if (this.mode === "computer") {
        this.codeChosen = true;
        this.settingSecret = false;
        this.reset(true, true);
      } else {
        this.codeChosen = false;
        this.settingSecret = false;
        this.reset(false, true);
      }
    }

    handlePaletteClick(event) {
      const chosenColor = getPaletteColor(event.currentTarget, this.config.colors);
      if (!chosenColor) return;

      if (this.settingSecret) {
        this.putSecretColor(chosenColor);
        return;
      }

      if (this.mode === "human" && !this.codeChosen) {
        showNotification("Action Required", "In human mode, click Set Code first.");
        return;
      }

      if (this.isGameOver() || this.isRowFull()) return;

      this.placeColor(chosenColor);
    }

    handleDeleteClick() {
      if (this.settingSecret) {
        this.deleteSecretColor();
        return;
      }

      if (this.mode === "human" && !this.codeChosen) {
        showNotification("Action Required", "In human mode, click Set Code first.");
        return;
      }

      if (this.isGameOver() || this.currentPosIndex === 0) return;

      this.currentPosIndex--;
      this.currentGuess.pop();

      const slot = this.getSlot(this.currentRowIndex, this.currentPosIndex);
      clearSlot(slot, this.config.colors);
    }

    handleSubmitClick() {
      if (this.settingSecret) {
        this.confirmSecret();
        return;
      }

      if (this.mode === "human" && !this.codeChosen) {
        showNotification("Action Required", "In human mode, click Set Code first.");
        return;
      }

      if (this.isGameOver()) return;

      if (!this.isRowComplete()) {
        this.wiggleRow(this.currentRowIndex);
        return;
      }

      const feedback = scoreGuess(this.secret, this.currentGuess);
      this.renderFeedback(this.currentRowIndex, feedback);

      if (feedback.black === this.config.codeLength) {
        this.finishGame(true);
        return;
      }

      this.advanceRowOrLose();
    }

    // ----- Reset / Game Ops -----
    reset(makeNewSecret = false, hideTop = true) {
      if (makeNewSecret) {
        this.secret = createSecret(this.config);
      }

      this.currentRowIndex = 0;
      this.currentPosIndex = 0;
      this.currentGuess = [];

      this.config.rowNames.forEach((rowName) => {
        const $rowSlots = $(this.config.selectors.rowSlots(rowName));
        $rowSlots.removeClass(this.config.colors.join(" "));
        $rowSlots.stop(true).css("left", "");
      });

      for (let i = 0; i < this.config.maxTurns; i++) {
        $(this.config.selectors.dotsBox(i))
          .children("div")
          .css({ backgroundColor: "" });
      }

      this.config.selectors.topSlots.forEach((selector) => {
        const $slot = $(selector);
        $slot.removeClass(this.config.colors.join(" "));
        if (hideTop) $slot.css("display", "");
      });
    }

    placeColor(color) {
      const slot = this.getSlot(this.currentRowIndex, this.currentPosIndex);
      fillSlot(slot, color, this.config.colors);

      this.currentGuess.push(color);
      this.currentPosIndex++;
    }

    advanceRowOrLose() {
      this.currentRowIndex++;
      this.currentPosIndex = 0;
      this.currentGuess = [];

      if (this.currentRowIndex >= this.config.maxTurns) {
        this.finishGame(false);
      }
    }

    renderFeedback(rowIndex, { black, white }) {
      const $dots = $(this.config.selectors.dotsBox(rowIndex)).children("div");
      $dots.css({ backgroundColor: "" });

      const pegs = shuffle([
        ...Array(black).fill("black"),
        ...Array(white).fill("white"),
      ]);

      pegs.forEach((pegColor, i) => {
        $dots.eq(i).css({
          backgroundColor: pegColor === "black" ? "#111" : "#eee",
        });
      });
    }

    finishGame(won) {
      this.revealSecret();

      if (won) {
        showNotification("You Win", "You cracked the code.", () => {
          this.currentRowIndex = this.config.maxTurns;
        });
      } else {
        showNotification("No More Turns", "You ran out of attempts. The code is now revealed.", () => {
          this.currentRowIndex = this.config.maxTurns;
        });
      }
    }

    revealSecret() {
      this.config.selectors.topSlots.forEach((selector, i) => {
        const $slot = $(selector);
        $slot.removeClass(this.config.colors.join(" "));
        $slot.addClass(this.secret[i]);
        $slot.css("display", "block");
      });
    }

    wiggleRow(rowIndex) {
      const rowName = this.config.rowNames[rowIndex];
      const $rowSlots = $(this.config.selectors.rowSlots(rowName));

      $rowSlots
        .stop(true)
        .animate({ left: "-=5px" }, 50)
        .animate({ left: "+=10px" }, 50)
        .animate({ left: "-=5px" }, 50);
    }

    getSlot(rowIndex, posIndex) {
      const rowName = this.config.rowNames[rowIndex];
      return $(this.config.selectors.slot(rowName, posIndex));
    }

    isRowComplete() {
      return this.currentGuess.length === this.config.codeLength;
    }

    isRowFull() {
      return this.currentPosIndex >= this.config.codeLength;
    }

    isGameOver() {
      return this.currentRowIndex >= this.config.maxTurns;
    }
  }

  // ---------- Pure helpers ----------
  function createSecret({ codeLength, colors }) {
    return Array.from({ length: codeLength }, () => randomChoice(colors));
  }

  function scoreGuess(secret, guess) {
    let black = 0;
    let white = 0;

    const secretLeft = [];
    const guessLeft = [];

    for (let i = 0; i < secret.length; i++) {
      if (guess[i] === secret[i]) black++;
      else {
        secretLeft.push(secret[i]);
        guessLeft.push(guess[i]);
      }
    }

    const freq = countFrequencies(secretLeft);

    for (const g of guessLeft) {
      if (freq[g] > 0) {
        white++;
        freq[g]--;
      }
    }

    return { black, white };
  }

  function countFrequencies(arr) {
    return arr.reduce((map, item) => {
      map[item] = (map[item] || 0) + 1;
      return map;
    }, {});
  }

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
  }

  // ---------- DOM helpers ----------
  function getPaletteColor(element, colors) {
    const $el = $(element);
    return colors.find((c) => $el.hasClass(c)) || null;
  }

  function fillSlot($slot, color, colors) {
    $slot.removeClass(colors.join(" "));
    $slot.addClass(color);
  }

  function clearSlot($slot, colors) {
    $slot.removeClass(colors.join(" "));
  }

  // ---------- Start ----------
  $(document).ready(() => {
    new MastermindGame(CONFIG).init();
  });
})();

function showNotification(title, message, callback = null) {
  const box = document.getElementById("game-notification");
  const notifTitle = document.getElementById("notif-title");
  const notifMessage = document.getElementById("notif-message");
  const button = document.getElementById("notif-button");

  notifTitle.textContent = title;
  notifMessage.textContent = message;

  box.classList.remove("hidden");

  button.onclick = () => {
    box.classList.add("hidden");
    if (callback) callback();
  };
}

function goToGame() {
  window.location.href = "https://samiboi1.github.io/mastermind/";
}

function goToRules() {
  window.location.href = "https://samiboi1.github.io/mastermind/rules.html";
}
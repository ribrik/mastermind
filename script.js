/* script.js - Mastermind (jQuery) - MERGED */
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
      resetBtn: "#resetBtn",
      topSlots: [".color-one", ".color-two", ".color-three", ".color-four"],
      dotsBox: (rowIndex) => `.dots${rowIndex + 1}`,
      slot: (rowName, posIndex) => `.${rowName}-${posIndex + 1}`,
      rowSlots: (rowName) => `.${rowName}-1, .${rowName}-2, .${rowName}-3, .${rowName}-4`,
    },
  };

  class MastermindGame {
    constructor(config) {
      this.config = config;

      // mode feature
      this.mode = "computer";   // "computer" | "human"
      this.codeChosen = true;   // human mode: must set code first

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
      $(this.config.selectors.paletteColors).on(
        "click",
        this.handlePaletteClick.bind(this)
      );
      $(this.config.selectors.deleteBtn).on(
        "click",
        this.handleDeleteClick.bind(this)
      );
      $(this.config.selectors.submitBtn).on(
        "click",
        this.handleSubmitClick.bind(this)
      );
      $(this.config.selectors.resetBtn).on(
        "click",
        this.handleResetClick.bind(this)
      );
      if (input == null) return;

      const picked = input.toLowerCase().split(/[\s,]+/).filter(Boolean);

      if (picked.length !== this.config.codeLength) {
        alert(`You must enter exactly ${this.config.codeLength} colors.`);
        return;
      }
      if (!picked.every((c) => allowed.includes(c))) {
        alert("One or more colors were not allowed (check spelling).");
        return;
      }

      this.secret = picked;
      this.codeChosen = true;
      this.reset(false); // reset board but keep chosen secret
    }

    handlePaletteClick(event) {
      if (this.mode === "human" && !this.codeChosen) {
        alert('Human mode: click "set code" first.');
        return;
      }
      if (this.isGameOver() || this.isRowFull()) return;

      const chosenColor = getPaletteColor(event.currentTarget, this.config.colors);
      if (!chosenColor) return;

      this.placeColor(chosenColor);
    }

    handleDeleteClick() {
      if (this.mode === "human" && !this.codeChosen) {
        alert('Human mode: click "set code" first.');
        return;
      }
      if (this.isGameOver() || this.currentPosIndex === 0) return;

      this.currentPosIndex--;
      this.currentGuess.pop();

      const slot = this.getSlot(this.currentRowIndex, this.currentPosIndex);
      clearSlot(slot, this.config.colors);
    }

    handleSubmitClick() {
      if (this.mode === "human" && !this.codeChosen) {
        alert('Human mode: click "set code" first.');
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

    handleResetClick() {
      this.reset();
    }

    reset() {
      this.secret = createSecret(this.config);
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
        $slot.css("display", "");
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
          backgroundColor: pegColor === "black" ? "#111" : "#ff4444",
        });
      });
    }

    finishGame(won) {
      this.revealSecret();
      alert(
        won
          ? "🎉 You cracked the code!"
          : "💀 Out of turns! The code is revealed."
      );
      this.currentRowIndex = this.config.maxTurns;
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

  $(document).ready(() => {
    new MastermindGame(CONFIG).init();
  });
})();

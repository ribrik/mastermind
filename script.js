// script.js
$(function () {
  const CODE_LENGTH = 4;
  const MAX_TURNS = 8;

  const COLORS = ["red", "yellow", "green", "blue", "black"];
  const rowNames = ["one", "two", "three", "four", "five", "six", "seven", "eight"];

  let secret = generateSecret();
  let currentRow = 0;   // 0..7
  let currentPos = 0;   // 0..3
  let currentGuess = [];

  // ----- palette click -----
  $(".bottom span").not(".delete, .submit").on("click", function () {
    if (currentRow >= MAX_TURNS) return;
    if (currentPos >= CODE_LENGTH) return;

    const color = getColorFromPalette(this);
    if (!color) return;

    placeColor(color);
  });

  // ----- delete click -----
  $(".delete").on("click", function () {
    if (currentPos <= 0) return;

    currentPos--;
    currentGuess.pop();

    const slot = getSlot(currentRow, currentPos);
    clearSlot(slot);
  });

  // ----- submit click -----
  $(".submit").on("click", function () {
    if (currentGuess.length !== CODE_LENGTH) {
      flashRow(currentRow);
      return;
    }

    const feedback = checkGuess(secret, currentGuess);
    renderFeedback(currentRow, feedback);

    if (feedback.black === CODE_LENGTH) {
      endGame(true);
      return;
    }

    currentRow++;
    currentPos = 0;
    currentGuess = [];

    if (currentRow >= MAX_TURNS) {
      endGame(false);
    }
  });

  // ---------------- helpers ----------------

  function generateSecret() {
    const s = [];
    for (let i = 0; i < CODE_LENGTH; i++) {
      s.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }
    return s;
  }

  function getColorFromPalette(el) {
    for (const c of COLORS) {
      if ($(el).hasClass(c)) return c;
    }
    return null;
  }

  function placeColor(color) {
    const slot = getSlot(currentRow, currentPos);
    fillSlot(slot, color);

    currentGuess.push(color);
    currentPos++;
  }

  function getSlot(rowIndex, posIndex) {
    const rowClass = rowNames[rowIndex];
    return $(`.${rowClass}-${posIndex + 1}`);
  }

  function fillSlot($slot, color) {
    // remove any prior color classes
    $slot.removeClass(COLORS.join(" "));
    // add new color class (your CSS likely colors based on these)
    $slot.addClass(color);
  }

  function clearSlot($slot) {
    $slot.removeClass(COLORS.join(" "));
  }

  function flashRow(rowIndex) {
    const rowClass = rowNames[rowIndex];
    const $rowSlots = $(`.${rowClass}-1, .${rowClass}-2, .${rowClass}-3, .${rowClass}-4`);
    $rowSlots.addClass("flash");
    setTimeout(() => $rowSlots.removeClass("flash"), 250);
  }

  /**
   * Mastermind scoring with duplicates handled.
   * black = correct color+position
   * white = correct color wrong position
   */
  function checkGuess(secretArr, guessArr) {
    let black = 0;
    let white = 0;

    const secretLeft = [];
    const guessLeft = [];

    // blacks + leftovers
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (guessArr[i] === secretArr[i]) {
        black++;
      } else {
        secretLeft.push(secretArr[i]);
        guessLeft.push(guessArr[i]);
      }
    }

    // whites via frequency map
    const freq = {};
    for (const s of secretLeft) freq[s] = (freq[s] || 0) + 1;

    for (const g of guessLeft) {
      if (freq[g] > 0) {
        white++;
        freq[g]--;
      }
    }

    return { black, white };
  }

  function renderFeedback(rowIndex, { black, white }) {
    const $dotsBox = $(`.dots${rowIndex + 1}`);
    const $pegs = $dotsBox.children("div"); // 4 small peg divs

    // clear old styling
    $pegs.removeClass("feedback-black feedback-white");
    $pegs.css({ backgroundColor: "", border: "" });

    // make an array like ["black","black","white",...]
    const pegColors = [
      ...Array(black).fill("black"),
      ...Array(white).fill("white"),
    ];

    // shuffle so order doesn't reveal positions
    pegColors.sort(() => Math.random() - 0.5);

    pegColors.forEach((pc, i) => {
      const $peg = $pegs.eq(i);
      if (pc === "black") {
        $peg.addClass("feedback-black");
        $peg.css({ backgroundColor: "#111", border: "1px solid #111" });
      } else {
        $peg.addClass("feedback-white");
        $peg.css({ backgroundColor: "#eee", border: "1px solid #999" });
      }
    });
  }

  function endGame(won) {
    revealSecret();

    // simple message
    if (won) {
      alert("🎉 You cracked the code!");
    } else {
      alert("💀 Out of turns! The code is revealed.");
    }

    currentRow = MAX_TURNS; // lock input
  }

  function revealSecret() {
    const topSlots = [".color-one", ".color-two", ".color-three", ".color-four"];
    topSlots.forEach((sel, i) => {
      const $s = $(sel);
      $s.removeClass(COLORS.join(" "));
      $s.addClass(secret[i]);
    });
  }
});



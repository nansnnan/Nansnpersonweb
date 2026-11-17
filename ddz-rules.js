(() => {
  'use strict';

  const RANKS = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
  const ALL_RANKS = [...RANKS, 'X', 'D'];
  const CARD_VALUE = {};
  ALL_RANKS.forEach((card, index) => {
    CARD_VALUE[card] = index;
  });

  function sortCards(cards) {
    return [...cards].sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);
  }

  function countBombs(cards) {
    const counts = {};
    cards.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });

    let bombs = 0;
    Object.values(counts).forEach((count) => {
      if (count >= 4) bombs++;
    });
    if (counts.X && counts.D) bombs++;

    return bombs;
  }

  function isConsecutive(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
  }

  function getType(cards) {
    const n = cards.length;
    if (n === 0) return null;

    const counts = {};
    cards.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });

    const values = Object.values(counts).sort((a, b) => b - a);
    const keys = Object.keys(counts).sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);
    const maxValue = CARD_VALUE[keys[0]];

    if (n === 2 && counts.X && counts.D) return { type: 'rocket' };
    if (n === 1) return { type: 'single', val: maxValue };
    if (n === 2 && values[0] === 2) return { type: 'pair', val: maxValue };
    if (n === 3 && values[0] === 3) return { type: 'triple', val: maxValue };
    if (n === 4 && values[0] === 4) return { type: 'bomb', val: maxValue };

    const tripleKeys = keys.filter((key) => counts[key] === 3);
    const tripleRanks = tripleKeys.map((key) => CARD_VALUE[key]);

    if (n === 4 && values[0] === 3 && values[1] === 1) {
      return { type: 'three1', val: CARD_VALUE[tripleKeys[0]] };
    }
    if (n === 5 && values[0] === 3 && values[1] === 2) {
      return { type: 'three2', val: CARD_VALUE[tripleKeys[0]] };
    }

    if (n === 6) {
      const quadKey = keys.find((key) => counts[key] === 4);
      if (quadKey && values[0] === 4 && (values[1] === 1 || values[1] === 2)) {
        return { type: 'four2', val: CARD_VALUE[quadKey] };
      }
    }

    if (n === 8 && values[0] === 4 && values[1] === 2 && values[2] === 2) {
      const quadKey = keys.find((key) => counts[key] === 4);
      if (quadKey) return { type: 'four2pair', val: CARD_VALUE[quadKey] };
    }

    if (n >= 5 && values.every((value) => value === 1)) {
      const ranks = cards.map((card) => CARD_VALUE[card]);
      if (isConsecutive(ranks) && Math.max(...ranks) <= CARD_VALUE.A) {
        return { type: 'straight', len: n, val: maxValue };
      }
    }

    if (n >= 6 && n % 2 === 0 && values.every((value) => value === 2)) {
      const pairRanks = keys.map((key) => CARD_VALUE[key]);
      if (pairRanks.length >= 3 && isConsecutive(pairRanks) && Math.max(...pairRanks) <= CARD_VALUE.A) {
        return { type: 'stra-pair', len: pairRanks.length, val: maxValue };
      }
    }

    const validPlaneBody = tripleKeys.length >= 2 &&
      isConsecutive(tripleRanks) &&
      Math.max(...tripleRanks) <= CARD_VALUE.A;

    if (validPlaneBody && n === tripleKeys.length * 3 && values.every((value) => value === 3)) {
      return { type: 'plane', len: tripleKeys.length, val: Math.max(...tripleRanks) };
    }

    if (validPlaneBody) {
      const groups = tripleKeys.length;
      const wingCounts = keys
        .filter((key) => counts[key] !== 3)
        .map((key) => counts[key]);
      const wings = n - groups * 3;

      if (wings === groups && wingCounts.every((count) => count === 1)) {
        return { type: 'plane1', len: groups, val: Math.max(...tripleRanks) };
      }

      if (wings === groups * 2 && wingCounts.every((count) => count === 2)) {
        return { type: 'plane2', len: groups, val: Math.max(...tripleRanks) };
      }
    }

    return null;
  }

  function beats(last, current) {
    if (current.type === 'rocket') return true;
    if (last.type === 'rocket') return false;

    if (current.type === 'bomb') {
      if (last.type === 'bomb') return current.val > last.val;
      return true;
    }

    if (last.type === 'bomb') return false;
    if (current.type !== last.type) return false;
    if (current.len !== undefined && current.len !== last.len) return false;

    return current.val > last.val;
  }

  window.DDZRules = {
    RANKS,
    ALL_RANKS,
    CARD_VALUE,
    sortCards,
    countBombs,
    getType,
    beats
  };
})();

(() => {
  'use strict';

  const RANK_ORDER = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2', 'X', 'D'];
  const CARD_VALUE = {};
  RANK_ORDER.forEach((card, index) => {
    CARD_VALUE[card] = index;
  });

  const setupEl = document.getElementById('setup');
  const gameEl = document.getElementById('game');
  const tipEl = document.getElementById('tip');
  const recordEl = document.getElementById('record');
  const playBtn = document.getElementById('play-btn');
  const passBtn = document.getElementById('pass-btn');

  const game = {
    lord: [],
    player1: [],
    player2: [],
    currentTurn: 'lord',
    lastPlay: null,
    selected: [],
    passCount: 0,
    record: [],
    over: false
  };

  function seatKey(seat) {
    return seat === 'lord' ? 'Lord' : seat;
  }

  function seatName(seat) {
    if (seat === 'lord') return '地主';
    if (seat === '1') return '地主上家';
    return '地主下家';
  }

  function seatCards(seat) {
    if (seat === 'lord') return game.lord;
    if (seat === '1') return game.player1;
    return game.player2;
  }

  function parseCards(text) {
    return text
      .toUpperCase()
      .trim()
      .split(/\s+/)
      .filter((card) => Object.prototype.hasOwnProperty.call(CARD_VALUE, card))
      .sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);
  }

  function startStudy() {
    const lord = parseCards(document.getElementById('lord').value);
    const player1 = parseCards(document.getElementById('player1').value);
    const player2 = parseCards(document.getElementById('player2').value);

    if (lord.length === 0 || player1.length === 0 || player2.length === 0) {
      document.getElementById('setup-tip').textContent = '请先填写三家的手牌';
      return;
    }

    document.getElementById('setup-tip').textContent = '';

    game.lord = lord;
    game.player1 = player1;
    game.player2 = player2;
    game.currentTurn = 'lord';
    game.lastPlay = null;
    game.selected = [];
    game.passCount = 0;
    game.record = [];
    game.over = false;

    playBtn.disabled = false;
    passBtn.disabled = false;

    setupEl.hidden = true;
    gameEl.hidden = false;

    renderAll();
    updateRecord();
    showTip(`当前回合：${seatName(game.currentTurn)}，可自由出牌`);
  }

  function renderAll() {
    ['lord', '1', '2'].forEach((seat) => {
      renderSeat(seat);
      document.getElementById(`count${seatKey(seat)}`).textContent = seatCards(seat).length;

      document.getElementById(`seat${seatKey(seat)}`).classList.toggle(
        'is-turn',
        !game.over && game.currentTurn === seat
      );
    });
  }

  function renderSeat(seat) {
    const container = document.getElementById(`cards${seatKey(seat)}`);
    const cards = seatCards(seat);
    const canPlay = !game.over && game.currentTurn === seat;

    container.textContent = '';

    cards.forEach((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'study-card';
      button.textContent = card;
      button.disabled = !canPlay;
      button.setAttribute('aria-pressed', String(isSelected(seat, index)));

      if (isSelected(seat, index)) button.classList.add('selected');

      button.addEventListener('click', () => toggleCard(seat, index));
      container.append(button);
    });
  }

  function isSelected(seat, index) {
    return game.selected.some((item) => item.seat === seat && item.index === index);
  }

  function toggleCard(seat, index) {
    if (game.over || game.currentTurn !== seat) return;

    const existing = game.selected.findIndex((item) => item.seat === seat && item.index === index);

    if (existing > -1) {
      game.selected.splice(existing, 1);
    } else {
      game.selected.push({ seat, index, card: seatCards(seat)[index] });
    }

    renderSeat(seat);
  }

  function showTip(message, isWin) {
    tipEl.textContent = message;
    tipEl.classList.toggle('is-win', Boolean(isWin));
  }

  function addRecord(text) {
    game.record.push(text);
    updateRecord();
  }

  function updateRecord() {
    recordEl.textContent = '';

    if (game.record.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'record-empty';
      empty.textContent = '暂无出牌记录';
      recordEl.append(empty);
      return;
    }

    game.record.forEach((line) => {
      const item = document.createElement('div');
      item.textContent = line;
      recordEl.append(item);
    });

    recordEl.scrollTop = recordEl.scrollHeight;
  }

  function nextSeat() {
    if (game.currentTurn === 'lord') game.currentTurn = '2';
    else if (game.currentTurn === '2') game.currentTurn = '1';
    else game.currentTurn = 'lord';
  }

  playBtn.addEventListener('click', () => {
    if (game.over) return;

    if (game.selected.length === 0) {
      showTip('请选择要出的牌');
      return;
    }

    const seat = game.currentTurn;
    const cards = game.selected
      .map((item) => item.card)
      .sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);
    const currentType = getType(cards);

    if (!currentType) {
      showTip('牌型不合法，请重新选择');
      return;
    }

    if (game.lastPlay && !beats(game.lastPlay, currentType)) {
      showTip('管不上上一手牌，请重新选择');
      return;
    }

    const hand = seatCards(seat);
    game.selected
      .map((item) => item.index)
      .sort((a, b) => b - a)
      .forEach((index) => hand.splice(index, 1));

    addRecord(`${seatName(seat)}：${cards.join(' ')}`);
    game.lastPlay = currentType;
    game.selected = [];
    game.passCount = 0;

    if (hand.length === 0) {
      game.over = true;
      playBtn.disabled = true;
      passBtn.disabled = true;
      renderAll();
      showTip(`${seatName(seat)}获胜！`, true);
      return;
    }

    nextSeat();
    renderAll();
    showTip(`当前回合：${seatName(game.currentTurn)}`);
  });

  passBtn.addEventListener('click', () => {
    if (game.over) return;

    if (!game.lastPlay) {
      showTip('首家拥有自由出牌权，不能不出');
      return;
    }

    addRecord(`${seatName(game.currentTurn)}：不出`);
    game.passCount++;
    game.selected = [];

    if (game.passCount >= 2) {
      game.passCount = 0;
      game.lastPlay = null;
      const previous = game.currentTurn;
      nextSeat();
      showTip(`${seatName(previous)}后两人不出，${seatName(game.currentTurn)}获得自由出牌权`);
    } else {
      nextSeat();
      showTip(`当前回合：${seatName(game.currentTurn)}`);
    }

    renderAll();
  });

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
      const isFourTwoSingles = values[0] === 4 && values[1] === 1 && values[2] === 1;
      const isFourTwoPair = values[0] === 4 && values[1] === 2;
      if (quadKey && (isFourTwoSingles || isFourTwoPair)) {
        return { type: 'four2', val: CARD_VALUE[quadKey] };
      }
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

  document.getElementById('start-btn').addEventListener('click', startStudy);
})();

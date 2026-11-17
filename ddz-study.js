(() => {
  'use strict';

  const { CARD_VALUE, getType, beats } = window.DDZRules;

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

  document.getElementById('start-btn').addEventListener('click', startStudy);
})();

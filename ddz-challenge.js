(() => {
  'use strict';

  const { CARD_VALUE, RANKS, ALL_RANKS, getType, beats, sortCards } = window.DDZRules;
  const MIN_HAND = 5;
  const MAX_HAND = 15;
  const AI_DELAY = 700;
  const STORAGE_KEY = 'ddz-challenge-stats-v1';

  const RANK_TIERS = [
    { name: '橡木', min: -Infinity, max: 10 },
    { name: '岩石', min: 11, max: 30 },
    { name: '钢铁', min: 31, max: 60 },
    { name: '青铜', min: 61, max: 120 },
    { name: '白银', min: 121, max: 200 },
    { name: '黄金', min: 201, max: 300 },
    { name: '铂金', min: 301, max: 420 },
    { name: '钻石', min: 421, max: 550 },
    { name: '星耀', min: 551, max: 700 },
    { name: '下界合金', min: 701, max: 1000 },
    { name: '顶尖高手', min: 1001, max: 2000 },
    { name: '神明', min: 2001, max: 3000 },
    { name: '超神', min: 3001, max: Infinity }
  ];

  const myCardsEl = document.getElementById('my-cards');
  const opponentCardsEl = document.getElementById('opponent-cards');
  const lastPlayEl = document.getElementById('last-play');
  const tipEl = document.getElementById('challenge-tip');
  const recordEl = document.getElementById('challenge-record');
  const playBtn = document.getElementById('challenge-play');
  const passBtn = document.getElementById('challenge-pass');
  const newBtn = document.getElementById('challenge-new');
  const turnBadge = document.getElementById('turn-badge');
  const opponentVisible = document.getElementById('opponent-visible');
  const rankNameEl = document.getElementById('rank-name');
  const pointsEl = document.getElementById('points-value');
  const coinsEl = document.getElementById('coins-value');
  const claimCoinsBtn = document.getElementById('claim-coins');
  const rankTbody = document.getElementById('rank-tbody');

  const state = {
    me: [],
    opponent: [],
    turn: 'me',
    lastPlay: null,
    lastCards: [],
    selected: [],
    record: [],
    round: 0,
    started: false,
    over: false
  };

  let aiTimer = null;
  const profile = loadProfile();

  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { points: 0, coins: 100 };

      const data = JSON.parse(raw);
      const points = Number.isFinite(data?.points) ? Math.trunc(data.points) : 0;
      const coins = Number.isFinite(data?.coins) ? Math.max(0, Math.trunc(data.coins)) : 100;
      return { points, coins };
    } catch {
      return { points: 0, coins: 100 };
    }
  }

  function saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // 浏览器禁用存储时仅保留当前会话数据
    }
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function getRank(points) {
    return RANK_TIERS.find((tier) => points >= tier.min && points <= tier.max) || RANK_TIERS[0];
  }

  function rankRange(tier) {
    const min = tier.min === -Infinity ? '-∞' : tier.min;
    const max = tier.max === Infinity ? '∞' : tier.max;
    return `${min} ～ ${max}`;
  }

  function buildRankTable() {
    RANK_TIERS.forEach((tier) => {
      const row = document.createElement('tr');
      row.dataset.rank = tier.name;

      const name = document.createElement('td');
      name.textContent = tier.name;

      const range = document.createElement('td');
      range.textContent = rankRange(tier);

      row.append(name, range);
      rankTbody.append(row);
    });
  }

  function renderProfile() {
    const rank = getRank(profile.points);
    rankNameEl.textContent = rank.name;
    pointsEl.textContent = profile.points;
    coinsEl.textContent = profile.coins;
    claimCoinsBtn.hidden = profile.coins >= 10;

    rankTbody.querySelectorAll('tr').forEach((row) => {
      row.classList.toggle('is-current', row.dataset.rank === rank.name);
    });
  }

  function updateRestartButton() {
    const roundLocked = state.started && !state.over;
    const noCoins = profile.coins < 10;

    newBtn.disabled = roundLocked || noCoins;
    newBtn.title = roundLocked
      ? '本局进行中，打完这局后才能重新发牌'
      : noCoins
        ? '金币不足，请先领取免费金币'
        : '';
  }

  function createDeck() {
    const deck = [];
    for (let i = 0; i < 4; i++) deck.push(...RANKS);
    deck.push('X', 'D');
    return deck;
  }

  function shuffle(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function formatCards(cards) {
    return sortCards(cards).join(' ');
  }

  function showTip(message, isWin) {
    tipEl.textContent = message;
    tipEl.classList.toggle('is-win', Boolean(isWin));
  }

  function addRecord(text) {
    state.record.push(text);
    updateRecord();
  }

  function updateRecord() {
    recordEl.textContent = '';

    if (state.record.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'record-empty';
      empty.textContent = '暂无出牌记录';
      recordEl.append(empty);
      return;
    }

    state.record.forEach((line) => {
      const item = document.createElement('div');
      item.textContent = line;
      recordEl.append(item);
    });

    recordEl.scrollTop = recordEl.scrollHeight;
  }

  function newRound(paid = false) {
    clearTimeout(aiTimer);

    state.round++;
    const mySize = MIN_HAND + Math.floor(Math.random() * (MAX_HAND - MIN_HAND + 1));
    const opponentSize = MIN_HAND + Math.floor(Math.random() * (MAX_HAND - MIN_HAND + 1));

    const deck = shuffle(createDeck());
    state.me = sortCards(deck.slice(0, mySize));
    state.opponent = sortCards(deck.slice(mySize, mySize + opponentSize));
    state.turn = 'me';
    state.lastPlay = null;
    state.lastCards = [];
    state.selected = [];
    state.record = [];
    state.started = false;
    state.over = false;

    renderAll();
    updateRecord();
    showTip(`第 ${state.round} 局：你 ${mySize} 张，对手 ${opponentSize} 张，你先出牌。${paid ? '（消耗 10 金币）' : ''}`);
  }

  function renderAll() {
    renderMyCards();
    renderOpponent();
    renderLastPlay();

    document.getElementById('my-count').textContent = state.me.length;
    document.getElementById('opponent-count').textContent = state.opponent.length;
    document.getElementById('round-num').textContent = state.round;
    document.getElementById('round-my').textContent = state.me.length;
    document.getElementById('round-opp').textContent = state.opponent.length;

    renderProfile();

    const myTurn = !state.over && state.turn === 'me';
    playBtn.disabled = !myTurn;
    passBtn.disabled = !myTurn;

    updateRestartButton();

    turnBadge.textContent = state.over
      ? '本局结束'
      : state.turn === 'me'
        ? '你的回合'
        : '对手出牌中';
    turnBadge.classList.toggle('is-mine', myTurn);
  }

  function renderMyCards() {
    myCardsEl.textContent = '';
    const canSelect = !state.over && state.turn === 'me';

    state.me.forEach((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'study-card';
      button.textContent = card;
      button.disabled = !canSelect;
      button.setAttribute('aria-pressed', String(state.selected.includes(index)));

      if (state.selected.includes(index)) button.classList.add('selected');

      button.addEventListener('click', () => toggleCard(index));
      myCardsEl.append(button);
    });
  }

  function toggleCard(index) {
    if (state.over || state.turn !== 'me') return;

    const position = state.selected.indexOf(index);
    if (position > -1) state.selected.splice(position, 1);
    else state.selected.push(index);

    renderMyCards();
  }

  function renderOpponent() {
    opponentCardsEl.textContent = '';

    if (opponentVisible.checked) {
      state.opponent.forEach((card) => {
        const chip = document.createElement('span');
        chip.className = 'card-chip opponent-card';
        chip.textContent = card;
        opponentCardsEl.append(chip);
      });
      return;
    }

    for (let i = 0; i < state.opponent.length; i++) {
      const back = document.createElement('span');
      back.className = 'card-back';
      opponentCardsEl.append(back);
    }
  }

  function renderLastPlay() {
    lastPlayEl.textContent = '';

    if (state.lastCards.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'table-empty';
      empty.textContent = '自由出牌';
      lastPlayEl.append(empty);
      return;
    }

    sortCards(state.lastCards).forEach((card) => {
      const chip = document.createElement('span');
      chip.className = 'card-chip';
      chip.textContent = card;
      lastPlayEl.append(chip);
    });
  }

  function removeCards(hand, cards) {
    cards.forEach((card) => {
      const index = hand.indexOf(card);
      if (index > -1) hand.splice(index, 1);
    });
    hand.sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);
  }

  function isBombMove(move) {
    return move.type === 'bomb' || move.type === 'rocket';
  }

  function moveRank(move) {
    return move.val === undefined ? 99 : move.val;
  }

  function pickLead(moves) {
    const normal = moves.filter((move) => !isBombMove(move));
    const pool = normal.length > 0 ? normal : moves;
    pool.sort((a, b) => moveRank(a) - moveRank(b) || b.cards.length - a.cards.length);
    return pool[0];
  }

  function pickResponse(moves) {
    if (moves.length === 0) return null;

    const normal = moves.filter((move) => !isBombMove(move));
    if (normal.length > 0) {
      normal.sort((a, b) => moveRank(a) - moveRank(b) || a.cards.length - b.cards.length);
      return normal[0];
    }

    moves.sort((a, b) => moveRank(a) - moveRank(b) || a.cards.length - b.cards.length);
    return moves[0];
  }

  function aiTurn() {
    if (state.over || state.turn !== 'opponent') return;

    const hand = state.opponent;
    const moves = generateMoves(hand);
    const move = state.lastPlay
      ? pickResponse(moves.filter((item) => beats(state.lastPlay, item)))
      : pickLead(moves);

    if (!move) {
      addRecord('对手：不出');
      state.lastPlay = null;
      state.lastCards = [];
      state.turn = 'me';
      renderAll();
      showTip('对手不出，你获得自由出牌权。');
      return;
    }

    removeCards(hand, move.cards);
    addRecord(`对手：${formatCards(move.cards)}`);
    state.lastPlay = move;
    state.lastCards = move.cards;

    if (hand.length === 0) {
      finish('opponent');
      return;
    }

    state.turn = 'me';
    renderAll();
    showTip(`对手出了 ${formatCards(move.cards)}，轮到你了。`);
  }

  function scheduleAi() {
    clearTimeout(aiTimer);
    aiTimer = setTimeout(aiTurn, AI_DELAY);
  }

  function finish(winner) {
    state.over = true;
    clearTimeout(aiTimer);

    const pointDelta = winner === 'me' ? randomInt(2, 10) : -randomInt(2, 10);
    const coinDelta = winner === 'me' ? randomInt(1, 10) * 10 : -randomInt(1, 5) * 10;

    profile.points += pointDelta;
    const previousCoins = profile.coins;
    profile.coins = Math.max(0, profile.coins + coinDelta);
    const appliedCoins = profile.coins - previousCoins;
    saveProfile();

    renderAll();

    if (winner === 'me') {
      showTip(`你出完了所有手牌，挑战成功！积分 +${pointDelta}，金币 +${appliedCoins}。`, true);
    } else {
      const coinText = appliedCoins === 0 ? '，金币不足未扣除' : `，金币 ${appliedCoins}`;
      showTip(`对手先出完牌，挑战失败。积分 ${pointDelta}${coinText}。`);
    }
  }

  playBtn.addEventListener('click', () => {
    if (state.over || state.turn !== 'me') return;

    if (state.selected.length === 0) {
      showTip('请选择要出的牌');
      return;
    }

    const cards = state.selected.map((index) => state.me[index]).sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);
    const currentType = getType(cards);

    if (!currentType) {
      showTip('牌型不合法，请重新选择');
      return;
    }

    if (state.lastPlay && !beats(state.lastPlay, currentType)) {
      showTip('管不上上一手牌，请重新选择');
      return;
    }

    const indices = [...state.selected].sort((a, b) => b - a);
    indices.forEach((index) => state.me.splice(index, 1));
    state.me.sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);

    state.started = true;

    addRecord(`我：${formatCards(cards)}`);
    state.lastPlay = currentType;
    state.lastCards = cards;
    state.selected = [];

    if (state.me.length === 0) {
      finish('me');
      return;
    }

    state.turn = 'opponent';
    renderAll();
    showTip('对手正在出牌…');
    scheduleAi();
  });

  passBtn.addEventListener('click', () => {
    if (state.over || state.turn !== 'me') return;

    if (!state.lastPlay) {
      showTip('你拥有自由出牌权，不能不出');
      return;
    }

    addRecord('我：不出');
    state.lastPlay = null;
    state.lastCards = [];
    state.selected = [];
    state.turn = 'opponent';

    renderAll();
    showTip('你选择不出，对手获得自由出牌权。');
    scheduleAi();
  });

  function requestNewRound() {
    if (state.started && !state.over) return;

    if (profile.coins < 10) {
      showTip('金币不足，请先领取免费金币。');
      return;
    }

    profile.coins -= 10;
    saveProfile();
    newRound(true);
  }

  newBtn.addEventListener('click', requestNewRound);

  claimCoinsBtn.addEventListener('click', () => {
    if (profile.coins >= 10) return;

    profile.coins += 20;
    saveProfile();
    renderProfile();
    updateRestartButton();
    showTip('已领取 20 金币。');
  });

  opponentVisible.addEventListener('change', renderOpponent);

  /* ---------- Move generation ---------- */

  function combinations(list, count) {
    const result = [];

    function walk(start, picked) {
      if (picked.length === count) {
        result.push([...picked]);
        return;
      }

      for (let i = start; i < list.length; i++) {
        picked.push(list[i]);
        walk(i + 1, picked);
        picked.pop();
      }
    }

    walk(0, []);
    return result;
  }

  function generateMoves(hand) {
    const counts = {};
    hand.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });

    const present = ALL_RANKS.filter((rank) => counts[rank] > 0);
    const moves = [];
    const seen = new Set();

    function add(cards) {
      const key = cards.join(',');
      if (seen.has(key)) return;

      const type = getType(cards);
      if (!type) return;

      seen.add(key);
      moves.push({ ...type, cards });
    }

    present.forEach((rank) => {
      const count = counts[rank];
      if (count >= 1) add([rank]);
      if (count >= 2) add([rank, rank]);
      if (count >= 3) {
        add([rank, rank, rank]);

        present.forEach((other) => {
          if (other === rank) return;
          if (counts[other] >= 1) add([rank, rank, rank, other]);
          if (counts[other] >= 2) add([rank, rank, rank, other, other]);
        });
      }

      if (count >= 4) {
        add([rank, rank, rank, rank]);

        const others = present.filter((other) => other !== rank);

        for (let i = 0; i < others.length; i++) {
          for (let j = i + 1; j < others.length; j++) {
            add([rank, rank, rank, rank, others[i], others[j]]);
          }
        }

        others.forEach((other) => {
          if (counts[other] >= 2) add([rank, rank, rank, rank, other, other]);
        });

        for (let i = 0; i < others.length; i++) {
          for (let j = i + 1; j < others.length; j++) {
            if (counts[others[i]] >= 2 && counts[others[j]] >= 2) {
              add([
                rank, rank, rank, rank,
                others[i], others[i],
                others[j], others[j]
              ]);
            }
          }
        }
      }
    });

    if (counts.X && counts.D) add(['X', 'D']);

    const straightRanks = RANKS.slice(0, -1);

    for (let start = 0; start < straightRanks.length; start++) {
      const sequence = [];
      for (let i = start; i < straightRanks.length; i++) {
        if (counts[straightRanks[i]] >= 1) sequence.push(straightRanks[i]);
        else break;
      }
      for (let length = 5; length <= sequence.length; length++) {
        add(sequence.slice(0, length));
      }
    }

    for (let start = 0; start < straightRanks.length; start++) {
      const sequence = [];
      for (let i = start; i < straightRanks.length; i++) {
        if (counts[straightRanks[i]] >= 2) sequence.push(straightRanks[i]);
        else break;
      }
      for (let length = 3; length <= sequence.length; length++) {
        const cards = [];
        sequence.slice(0, length).forEach((rank) => cards.push(rank, rank));
        add(cards);
      }
    }

    for (let start = 0; start < straightRanks.length; start++) {
      const sequence = [];
      for (let i = start; i < straightRanks.length; i++) {
        if (counts[straightRanks[i]] >= 3) sequence.push(straightRanks[i]);
        else break;
      }

      for (let length = 2; length <= sequence.length; length++) {
        const body = sequence.slice(0, length);
        const bodyCards = [];
        body.forEach((rank) => bodyCards.push(rank, rank, rank));
        add(bodyCards);

        const singleWings = present.filter((rank) => !body.includes(rank) && counts[rank] >= 1);
        combinations(singleWings, length).forEach((wings) => {
          add([...bodyCards, ...wings]);
        });

        const pairWings = present.filter((rank) => !body.includes(rank) && counts[rank] >= 2);
        combinations(pairWings, length).forEach((wings) => {
          const wingCards = [];
          wings.forEach((rank) => wingCards.push(rank, rank));
          add([...bodyCards, ...wingCards]);
        });
      }
    }

    return moves;
  }

  buildRankTable();
  newRound();
})();

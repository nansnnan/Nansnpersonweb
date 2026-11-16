(() => {
  'use strict';

  const RANK_ORDER = {
    '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6,
    'T': 7, 'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12, 'X': 13, 'D': 14
  };
  const RANKS = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
  const ALL_RANKS = [...RANKS, 'X', 'D'];

  const handsEl = document.getElementById('hands');
  const statEl = document.getElementById('stat');
  const bottomResultEl = document.getElementById('bottom-result');

  let totalDealTimes = 0;
  let totalBombCount = 0;

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

  function sortCards(cards) {
    return cards.sort((a, b) => RANK_ORDER[b] - RANK_ORDER[a]);
  }

  function countBombs(cards) {
    const counts = {};
    cards.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });

    let bombs = 0;
    Object.values(counts).forEach((n) => {
      if (n >= 4) bombs++;
    });
    if (counts.X && counts.D) bombs++;

    return bombs;
  }

  function baseDeal() {
    const deck = shuffle(createDeck());
    const data = {
      bottom: sortCards(deck.slice(0, 3)),
      p1: sortCards(deck.slice(3, 20)),
      p2: sortCards(deck.slice(20, 37)),
      p3: sortCards(deck.slice(37, 54))
    };

    const bombs = countBombs(data.bottom) + countBombs(data.p1) +
      countBombs(data.p2) + countBombs(data.p3);

    return { data, bombs };
  }

  function renderHands(data) {
    handsEl.textContent = '';

    [
      ['底牌', data.bottom, true],
      ['头家', data.p1, false],
      ['二家', data.p2, false],
      ['尾家', data.p3, false]
    ].forEach(([label, cards, isBottom]) => {
      const hand = document.createElement('div');
      hand.className = isBottom ? 'hand is-bottom' : 'hand';

      const name = document.createElement('span');
      name.className = 'hand-label';
      name.textContent = label;

      const list = document.createElement('div');
      list.className = 'hand-cards';

      cards.forEach((card) => {
        const chip = document.createElement('span');
        chip.className = 'card-chip';
        chip.textContent = card;
        list.append(chip);
      });

      hand.append(name, list);
      handsEl.append(hand);
    });
  }

  function statItem(label, value, accent) {
    const item = document.createElement('div');
    item.className = accent ? 'stat-item is-accent' : 'stat-item';

    const name = document.createElement('span');
    name.className = 'stat-label';
    name.textContent = label;

    const amount = document.createElement('span');
    amount.className = 'stat-value';
    amount.textContent = value;

    item.append(name, amount);
    return item;
  }

  function renderStat(currentBombs) {
    const average = totalDealTimes ? (totalBombCount / totalDealTimes).toFixed(2) : '0.00';

    statEl.textContent = '';
    statEl.append(
      statItem('本次炸弹数', String(currentBombs), true),
      statItem('累计发牌', `${totalDealTimes} 次`, false),
      statItem('累计炸弹', `${totalBombCount} 个`, false),
      statItem('平均每局炸弹', `${average} 个`, false)
    );
    statEl.hidden = false;
  }

  function recordDeal(bombs) {
    totalDealTimes++;
    totalBombCount += bombs;
    renderStat(bombs);
  }

  function deal() {
    const { data, bombs } = baseDeal();
    renderHands(data);
    recordDeal(bombs);
  }

  function dealUntilBomb(target) {
    let result;
    do {
      result = baseDeal();
    } while (
      (target === 3 && result.bombs !== 3) ||
      (target === 4 && result.bombs !== 4) ||
      (target === 5 && result.bombs < 5)
    );

    renderHands(result.data);
    recordDeal(result.bombs);
  }

  function clearAll() {
    handsEl.textContent = '';

    const empty = document.createElement('p');
    empty.className = 'hands-empty';
    empty.textContent = '点击「随机发牌」，生成三家手牌与底牌';
    handsEl.append(empty);

    statEl.textContent = '';
    statEl.hidden = true;
    totalDealTimes = 0;
    totalBombCount = 0;
  }

  function randomBottom() {
    const deck = shuffle(createDeck());
    return sortCards(deck.slice(0, 3));
  }

  function bottomSection(title, content) {
    const section = document.createElement('div');
    section.className = 'bottom-section';

    const heading = document.createElement('h4');
    heading.textContent = title;

    section.append(heading, content);
    return section;
  }

  function runBottom(times) {
    const cardCount = {};
    ALL_RANKS.forEach((rank) => {
      cardCount[rank] = 0;
    });

    let triple = 0;
    let pairSingle = 0;
    let jokersTogether = 0;

    for (let i = 0; i < times; i++) {
      const cards = randomBottom();
      cards.forEach((card) => {
        cardCount[card]++;
      });

      const counts = {};
      cards.forEach((card) => {
        counts[card] = (counts[card] || 0) + 1;
      });

      const keys = Object.keys(counts);
      if (counts.X && counts.D) jokersTogether++;
      if (keys.length === 1 && counts[keys[0]] === 3) triple++;
      if (keys.length === 2 && (counts[keys[0]] === 2 || counts[keys[1]] === 2)) pairSingle++;
    }

    const totalCards = times * 3;
    const percent = (n) => `${((n / totalCards) * 100).toFixed(2)}%`;
    const specialPercent = (n) => `${((n / times) * 100).toFixed(2)}%`;

    const summary = document.createElement('p');
    summary.className = 'bottom-summary';
    summary.textContent = `抽样 ${times} 次 · 共 ${totalCards} 张底牌`;

    const grid = document.createElement('ul');
    grid.className = 'bottom-grid';

    ALL_RANKS.forEach((rank) => {
      const item = document.createElement('li');

      const name = document.createElement('span');
      name.className = 'rank';
      name.textContent = rank;

      const count = document.createElement('span');
      count.textContent = `${cardCount[rank]} 次`;

      const rate = document.createElement('span');
      rate.className = 'rate';
      rate.textContent = percent(cardCount[rank]);

      item.append(name, count, rate);
      grid.append(item);
    });

    const special = document.createElement('ul');
    special.className = 'bottom-special';

    [
      ['大王 + 小王同时出现', jokersTogether],
      ['三张相同', triple],
      ['一对一张', pairSingle]
    ].forEach(([label, count]) => {
      const item = document.createElement('li');

      const name = document.createElement('span');
      name.textContent = label;

      const value = document.createElement('strong');
      value.textContent = `${count} 次 (${specialPercent(count)})`;

      item.append(name, value);
      special.append(item);
    });

    bottomResultEl.textContent = '';
    bottomResultEl.append(summary, bottomSection('每张牌出现次数', grid), bottomSection('特殊牌型', special));

    document.getElementById('bottom-hint').hidden = true;
  }

  document.getElementById('deal-btn').addEventListener('click', deal);
  document.getElementById('clear-btn').addEventListener('click', clearAll);

  document.querySelectorAll('[data-bomb]').forEach((button) => {
    button.addEventListener('click', () => dealUntilBomb(Number(button.dataset.bomb)));
  });

  document.querySelectorAll('[data-bottom]').forEach((button) => {
    button.addEventListener('click', () => runBottom(Number(button.dataset.bottom)));
  });
})();

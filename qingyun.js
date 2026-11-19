(() => {
  'use strict';

  const DATA = window.QINGYUN_DATA;
  const { CARD_VALUE, RANKS, ALL_RANKS, getType, beats, sortCards } = window.DDZRules;
  const STAGE_NAMES = [
    '第一赛段 · 瑞士轮 24 进 16',
    '第二赛段 · 瑞士轮 16 进 8',
    '第三赛段 · 三败淘汰赛 8 进 4',
    '第四赛段 · 半决赛',
    '第五赛段 · 决赛'
  ];
  const ROUND_LABELS = ['第一轮', '第二轮', '第三轮', '第四轮', '第五轮'];
  const BOARDS_PER_GAME = [12, 16, 20, 20, 20];
  const DECIDING_BOARDS = 8;

  function cloneTeamData(team, index) {
    return {
      name: team.name,
      seed: Boolean(team.seed),
      id: index,
      players: team.players.map((player) => ({ ...player }))
    };
  }

  function cloneTeamList(list) {
    return list.map((team, index) => cloneTeamData(team, index));
  }

  let officialTeams = cloneTeamList(DATA.teams);
  let teams = officialTeams;
  let sandboxTeams = null;
  let sandboxDraft = null;
  let sandboxActive = false;
  let sandboxEditing = false;
  let preserveStrengths = false;
  let sandboxSeq = 0;
  const stageEl = document.getElementById('qy-stage');
  const roundEl = document.getElementById('qy-round');
  const teamAEl = document.getElementById('qy-team-a');
  const teamBEl = document.getElementById('qy-team-b');
  const seedAEl = document.getElementById('qy-team-a-seed');
  const seedBEl = document.getElementById('qy-team-b-seed');
  const formatEl = document.getElementById('qy-format');
  const scoreEl = document.getElementById('qy-score');
  const tipEl = document.getElementById('qy-tip');
  const singleBtn = document.getElementById('qy-single');
  const wholeBtn = document.getElementById('qy-whole');
  const nextBtn = document.getElementById('qy-next');
  const restartBtn = document.getElementById('qy-restart');
  const summaryBtn = document.getElementById('qy-summary');
  const roundSummaryEl = document.getElementById('qy-round-summary');
  const roundListEl = document.getElementById('qy-round-list');
  const resultBody = document.getElementById('qy-result-body');
  const summaryModal = document.getElementById('summary-modal');
  const summaryTitle = document.getElementById('summary-title');
  const summaryBody = document.getElementById('summary-body');
  const summaryAction = document.getElementById('summary-action');
  const restartModal = document.getElementById('restart-modal');
  const restartConfirm = document.getElementById('restart-confirm');
  const sandboxToggle = document.getElementById('qy-sandbox-toggle');
  const sandboxStatus = document.getElementById('qy-sandbox-status');
  const sandboxEditBtn = document.getElementById('qy-sandbox-edit');
  const sandboxEditor = document.getElementById('qy-sandbox-editor');
  const sandboxTeamsEl = document.getElementById('qy-sb-teams');
  const sandboxSummary = document.getElementById('qy-sb-summary');
  const sandboxTip = document.getElementById('qy-sb-tip');
  const sandboxAddTeamBtn = document.getElementById('qy-sb-add-team');
  const sandboxApplyBtn = document.getElementById('qy-sb-apply');
  const sandboxCancelBtn = document.getElementById('qy-sb-cancel');
  const realtimeBtn = document.getElementById('qy-realtime');
  const rtModal = document.getElementById('realtime-modal');
  const rtClose = document.getElementById('rt-close');
  const rtScore = document.getElementById('rt-score');
  const rtNotice = document.getElementById('rt-notice');
  const rtTableView = document.getElementById('rt-table-view');
  const rtFastBoard = document.getElementById('rt-fast-board');
  const rtFastGame = document.getElementById('rt-fast-game');
  const rtLog = document.getElementById('rt-log');
  const rtResult = document.getElementById('rt-result');

  let season = null;
  let lastResult = null;
  let lastSummary = null;

  function shuffle(list) {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function formatPercent(wins, games) {
    return games > 0 ? `${((wins / games) * 100).toFixed(1)}%` : '—';
  }

  function formatAverage(sum, games) {
    return games > 0 ? (sum / games).toFixed(2) : '—';
  }

  function compareMetrics(a, b) {
    return b.w - a.w || b.gw - a.gw || b.pts - a.pts;
  }

  function prepareTeams(list = teams, preserve = false) {
    list.forEach((team) => {
      team.seedBonus = team.seed ? 5 + (hash(`${team.name}:seed`) % 4) : 0;
      team.players.forEach((player) => {
        if (preserve && Number.isFinite(player.strength)) return;

        let strength = 50 + (hash(`${player.account}:${team.name}`) % 41);
        if (player.gold) strength += 3 + (hash(`${player.account}:gold`) % 3);
        if (player.role === '领队' || player.role === '队长' || player.role === '教练') {
          strength += 3 + (hash(`${player.account}:role`) % 3);
        }
        strength += team.seedBonus;
        player.strength = strength;
      });
    });
  }

  function playerKey(player) {
    return player.account || player.name;
  }

  function weightedPick(pool, count) {
    const source = [...pool];
    const chosen = [];

    while (chosen.length < count && source.length > 0) {
      const total = source.reduce((sum, player) => sum + player.strength ** 2, 0);
      let ticket = Math.random() * total;
      let index = 0;
      for (; index < source.length; index++) {
        ticket -= source[index].strength ** 2;
        if (ticket <= 0) break;
      }
      chosen.push(source.splice(Math.min(index, source.length - 1), 1)[0]);
    }

    return chosen;
  }

  function pickSquad(team, stageIdx, excluded = new Set()) {
    const eligible = team.players.filter((player) =>
      stageIdx >= 2 ? player.role !== '领队' && player.role !== '教练' : true
    );
    const free = eligible.filter((player) => !excluded.has(playerKey(player)));
    const pool = free.length >= 4 ? free : eligible;
    const maxSize = Math.min(pool.length, 7);

    if (maxSize === 0) return [];

    const size = maxSize <= 4 ? maxSize : 4 + Math.floor(Math.random() * (maxSize - 3));
    const squad = weightedPick(pool, size);
    squad.forEach((player) => excluded.add(playerKey(player)));
    return squad;
  }

  function chooseActive(squad) {
    return weightedPick(squad, Math.min(4, squad.length));
  }

  function assignPairs(match) {
    const shuffledA = shuffle(match.activeA);
    const shuffledB = shuffle(match.activeB);
    match.pairA1 = shuffledA.slice(0, 2);
    match.pairA2 = shuffledA.slice(2, 4);
    match.pairB1 = shuffledB.slice(0, 2);
    match.pairB2 = shuffledB.slice(2, 4);
  }

  function maybeSubstitute(match) {
    if (match.games.length === 0) return;

    const sides = [
      { squad: match.squadA, active: match.activeA, key: 'activeA' },
      { squad: match.squadB, active: match.activeB, key: 'activeB' }
    ];

    sides.forEach((side) => {
      const bench = side.squad.filter((player) => !side.active.includes(player));
      if (bench.length === 0 || Math.random() > 0.45) return;

      const count = Math.min(
        bench.length,
        side.active.length - 1,
        Math.random() < 0.35 ? 2 : 1
      );
      if (count <= 0) return;

      const incoming = shuffle(bench).slice(0, count);
      const outgoing = shuffle(side.active).slice(0, count);

      incoming.forEach((player, index) => {
        const position = side.active.indexOf(outgoing[index]);
        if (position > -1) side.active[position] = player;
      });

      match[side.key] = [...side.active];
    });

    assignPairs(match);
    match.seatMaps = [rtBuildSeats(match, 0), rtBuildSeats(match, 1)];
  }

  function blankStat(player, team) {
    return {
      name: player.name,
      teams: new Set([team.name]),
      games: 0,
      wins: 0,
      landlordGames: 0,
      landlordWins: 0,
      farmerGames: 0,
      farmerWins: 0,
      bidSum: 0,
      bidCount: 0,
      net: 0
    };
  }

  function ensureStat(map, player, team) {
    const key = player.account || player.name;
    if (!map.has(key)) map.set(key, blankStat(player, team));
    const stat = map.get(key);
    stat.teams.add(team.name);
    return stat;
  }

  function recordPlayer(maps, player, team, role, bid, teamWon, net) {
    maps.forEach((map) => {
      const stat = ensureStat(map, player, team);
      stat.games++;
      if (teamWon) stat.wins++;
      if (role === 'landlord') {
        stat.landlordGames++;
        if (teamWon) stat.landlordWins++;
      } else {
        stat.farmerGames++;
        if (teamWon) stat.farmerWins++;
      }
      stat.bidSum += bid;
      if (bid > 0) stat.bidCount++;
      stat.net += net;
    });
  }

  function mergeStatsMap(target, source) {
    source.forEach((stat, key) => {
      if (!target.has(key)) {
        target.set(key, {
          name: stat.name,
          teams: new Set(),
          games: 0,
          wins: 0,
          landlordGames: 0,
          landlordWins: 0,
          farmerGames: 0,
          farmerWins: 0,
          bidSum: 0,
          bidCount: 0,
          net: 0
        });
      }
      const out = target.get(key);
      stat.teams.forEach((team) => out.teams.add(team));
      out.games += stat.games;
      out.wins += stat.wins;
      out.landlordGames += stat.landlordGames;
      out.landlordWins += stat.landlordWins;
      out.farmerGames += stat.farmerGames;
      out.farmerWins += stat.farmerWins;
      out.bidSum += stat.bidSum;
      out.bidCount += stat.bidCount;
      out.net += stat.net;
    });
  }

  function createStatsMap() {
    return new Map();
  }

  function createMatch(teamA, teamB, format, label) {
    const formatN = Number(format.replace('BO', ''));
    const used = season.roundUsed || new Set();
    const squadA = pickSquad(teamA, season.stageIdx, used);
    const squadB = pickSquad(teamB, season.stageIdx, used);

    const match = {
      teamA,
      teamB,
      format,
      formatN,
      target: Math.ceil(formatN / 2),
      label,
      squadA,
      squadB,
      activeA: chooseActive(squadA),
      activeB: chooseActive(squadB),
      winsA: 0,
      winsB: 0,
      games: [],
      stats: createStatsMap(),
      done: false,
      recorded: false,
      winnerTeam: null
    };

    assignPairs(match);
    match.seatMaps = [rtBuildSeats(match, 0), rtBuildSeats(match, 1)];
    return match;
  }

  function moveCombinations(list, count) {
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
              add([rank, rank, rank, rank, others[i], others[i], others[j], others[j]]);
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

        const singles = present.filter((rank) => !body.includes(rank) && counts[rank] >= 1);
        moveCombinations(singles, length).forEach((wings) => add([...bodyCards, ...wings]));

        const pairs = present.filter((rank) => !body.includes(rank) && counts[rank] >= 2);
        moveCombinations(pairs, length).forEach((wings) => {
          const wingCards = [];
          wings.forEach((rank) => wingCards.push(rank, rank));
          add([...bodyCards, ...wingCards]);
        });
      }
    }

    return moves;
  }

  function handPower(cards) {
    const counts = {};
    cards.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });

    let power = 0;
    cards.forEach((card) => {
      if (CARD_VALUE[card] >= 12) power += 3;
      else if (CARD_VALUE[card] >= 9) power += 1.2;
    });
    Object.values(counts).forEach((count) => {
      if (count === 4) power += 9;
    });
    if (counts.X && counts.D) power += 13;
    return power;
  }

  function chooseBid(entry, hand, highestBid) {
    const highCards = hand.filter((card) => card === '2' || card === 'X' || card === 'D').length;
    let desire;

    if (highCards >= 4) {
      desire = 3;
    } else {
      desire = handPower(hand) + (entry.player.strength - 70) * 0.45 + (Math.random() - 0.5) * 10;
      desire += highCards * 3;
    }

    let bid = 0;
    if (desire > 42) bid = 3;
    else if (desire > 28) bid = 2;
    else if (desire > 15) bid = 1;

    if (bid <= highestBid) bid = 0;
    return bid;
  }

  function cardsWithout(hand, cards) {
    const rest = [...hand];
    cards.forEach((card) => {
      const index = rest.indexOf(card);
      if (index > -1) rest.splice(index, 1);
    });
    return rest;
  }

  function handStructure(cards) {
    const counts = {};
    cards.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });

    let singles = 0;
    let pairs = 0;
    let bombs = 0;
    Object.values(counts).forEach((count) => {
      if (count === 1) singles++;
      if (count === 2) pairs++;
      if (count >= 4) bombs++;
    });
    if (counts.X && counts.D) bombs++;

    return { singles, pairs, bombs };
  }

  function moveTopValue(move) {
    if (Number.isFinite(move.val)) return move.val;
    return CARD_VALUE[sortCards(move.cards)[0]];
  }

  function estimateMoves(cards) {
    const counts = {};
    cards.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });

    const ranks = RANKS.slice(0, -1);
    let moves = 0;

    if (counts.X && counts.D) {
      moves++;
      counts.X--;
      counts.D--;
    }

    RANKS.forEach((rank) => {
      if (counts[rank] >= 4) {
        moves++;
        counts[rank] -= 4;
      }
    });

    const take = (rank, count) => {
      if ((counts[rank] || 0) < count) return false;
      counts[rank] -= count;
      return true;
    };

    const takeRun = (minCount, minLength, width) => {
      let found = false;
      for (;;) {
        let best = [];
        let current = [];
        ranks.forEach((rank) => {
          if ((counts[rank] || 0) >= minCount) {
            current.push(rank);
          } else {
            if (current.length > best.length) best = current;
            current = [];
          }
        });
        if (current.length > best.length) best = current;
        if (best.length < minLength) break;

        best.forEach((rank) => {
          counts[rank] -= width;
        });
        moves++;
        found = true;
      }
      return found;
    };

    takeRun(3, 2, 3);
    takeRun(1, 5, 1);
    takeRun(2, 3, 2);

    RANKS.forEach((rank) => {
      if (counts[rank] >= 3) {
        counts[rank] -= 3;
        moves++;
        const wing = RANKS.find((other) => other !== rank && counts[other] >= 2);
        if (wing) counts[wing] -= 2;
        else {
          const single = RANKS.find((other) => other !== rank && counts[other] >= 1);
          if (single) counts[single] -= 1;
        }
      }
    });

    RANKS.forEach((rank) => {
      while (counts[rank] >= 2) {
        counts[rank] -= 2;
        moves++;
      }
    });

    RANKS.forEach((rank) => {
      if (counts[rank] > 0) moves += counts[rank];
    });
    if (counts.X > 0) moves += counts.X;
    if (counts.D > 0) moves += counts.D;

    return moves;
  }

  function leadMoveScore(move, hand) {
    const remain = cardsWithout(hand, move.cards);
    const before = handStructure(hand);
    const after = handStructure(remain);
    const bomb = move.type === 'bomb' || move.type === 'rocket';

    let score = estimateMoves(remain) * 8;
    score += (after.singles - before.singles) * 4;
    score += (after.pairs - before.pairs) * 1.5;
    score += (before.bombs - after.bombs) * 26;
    score += bomb ? 55 : 0;
    score += moveTopValue(move) * 0.3;
    const typeOrder = {
      single: 0,
      pair: 1,
      'stra-pair': 2,
      straight: 3,
      three1: 4,
      three2: 4,
      triple: 5,
      plane1: 6,
      plane2: 6,
      plane: 7,
      four2: 8,
      four2pair: 8
    };
    score += (typeOrder[move.type] ?? 6) * 0.7;
    if ((move.type === 'single' || move.type === 'pair') && moveTopValue(move) >= 14 && hand.length > 1) {
      score += 10;
    }
    score -= move.cards.length * 1.2;
    if (remain.length === 0) score -= 1000;
    return score;
  }

  function followMoveScore(move, hand) {
    const remain = cardsWithout(hand, move.cards);
    const before = handStructure(hand);
    const after = handStructure(remain);
    const bomb = move.type === 'bomb' || move.type === 'rocket';

    let score = estimateMoves(remain) * 10;
    score += (after.singles - before.singles) * 5;
    score += (after.pairs - before.pairs) * 1.5;
    score += (before.bombs - after.bombs) * 30;
    score += bomb ? 50 : 0;
    score += moveTopValue(move) * 0.7;
    score -= move.cards.length;
    if (remain.length === 0) score -= 1000;
    return score;
  }

  function pickBestMove(candidates, hand, strength, follow) {
    const scored = candidates.map((move) => ({
      move,
      score: follow ? followMoveScore(move, hand) : leadMoveScore(move, hand)
    }));
    scored.sort((a, b) => a.score - b.score);

    const quality = Math.min(1, Math.max(0, (strength - 50) / 40));
    const poolSize = Math.max(1, Math.round(4 - quality * 3));
    const pool = scored.slice(0, Math.min(poolSize, scored.length));
    return pool[Math.floor(Math.random() * pool.length)].move;
  }

  function handGroupCount(cards) {
    return new Set(cards).size;
  }

  function selectMoveByRules(table, seat, hand, moves, nextSeat) {
    const entry = table.seatPlayers[seat];

    if (!table.lastPlay) {
      let leadMoves = moves;
      const next = nextSeat(table, seat);
      const nextEntry = table.seatPlayers[next];
      const nextLeft = (table.hands[next] || []).length;

      if (nextLeft === 1) {
        if (nextEntry.team.id === entry.team.id) {
          const singles = leadMoves.filter((move) => move.type === 'single');
          if (singles.length > 0) {
            singles.sort((a, b) => moveTopValue(a) - moveTopValue(b));
            return singles[0];
          }
        } else {
          const nonSingles = leadMoves.filter((move) => move.type !== 'single');
          if (nonSingles.length > 0) {
            leadMoves = nonSingles;
          } else {
            const singles = leadMoves.filter((move) => move.type === 'single');
            singles.sort((a, b) => moveTopValue(b) - moveTopValue(a));
            return singles[0];
          }
        }
      }

      const opponents = table.activeOrder.filter((other) =>
        other !== seat &&
        table.seatPlayers[other].team.id !== entry.team.id &&
        (table.hands[other] || []).length > 0
      );
      const danger = opponents.some((other) => table.hands[other].length <= 2);

      if (danger) {
        const bombs = leadMoves.filter((move) => move.type === 'bomb' || move.type === 'rocket');
        if (bombs.length > 0) return bombs[0];
        const singles = leadMoves.filter((move) => move.type === 'single');
        if (singles.length > 0) {
          singles.sort((a, b) => moveTopValue(b) - moveTopValue(a));
          return singles[0];
        }
      }

      return pickBestMove(leadMoves, hand, entry.player.strength, false);
    }

    let candidates = moves.filter((move) => beats(table.lastPlay, move));
    if (candidates.length === 0) return null;
    if (!table.lastPlayer) return pickBestMove(candidates, hand, entry.player.strength, true);

    const lastEntry = table.seatPlayers[table.lastPlayer.seat];
    const ally = lastEntry && lastEntry.team.id === entry.team.id;
    const lastLeft = lastEntry ? (table.hands[lastEntry.seat] || []).length : 99;

    if (ally) {
      if (lastLeft <= 4 && hand.length - table.lastCards.length > 4) return null;

      const finish = candidates.find((move) => move.cards.length === hand.length);
      if (finish) return finish;

      const nonBomb = candidates.filter((move) => move.type !== 'bomb' && move.type !== 'rocket');
      if (nonBomb.length === 0) return null;

      const best = pickBestMove(nonBomb, hand, entry.player.strength, true);
      if (!best) return null;

      const groups = handGroupCount(hand);
      if (groups <= 2) return best;

      const before = handStructure(hand);
      const after = handStructure(cardsWithout(hand, best.cards));
      const improved = before.singles - after.singles;
      if (moveTopValue(best) <= 14 && improved >= 1) return best;

      const weakFumble = entry.player.strength < 65 && Math.random() < 0.16;
      return weakFumble ? best : null;
    }

    if (table.lastPlay.type === 'rocket') return null;

    const normal = candidates.filter((move) => move.type !== 'bomb' && move.type !== 'rocket');

    if (normal.length > 0) {
      if (lastLeft <= 3) {
        normal.sort((a, b) => moveTopValue(b) - moveTopValue(a));
        return normal[0];
      }
      return pickBestMove(normal, hand, entry.player.strength, true);
    }

    const lastValue = moveTopValue(table.lastPlay);
    const allowBomb = lastLeft <= 3 ||
      table.lastCards.length > 3 ||
      lastValue >= 14 ||
      hand.length <= 6 ||
      table.lastPlay.type === 'bomb' ||
      table.lastPlay.type === 'rocket';

    if (!allowBomb) return null;

    const bombs = [...candidates].sort((a, b) => moveTopValue(a) - moveTopValue(b));
    return bombs[0] || null;
  }

  function chooseRealtimeMove(table, seat, hand, moves) {
    return selectMoveByRules(table, seat, hand, moves, rtNextSeat);
  }

  function bestScoredMove(candidates, hand, follow, randomness = 0) {
    if (candidates.length === 0) return null;
    const scored = candidates.map((move) => ({
      move,
      score: follow ? followMoveScore(move, hand) : leadMoveScore(move, hand)
    }));
    scored.sort((a, b) => a.score - b.score);
    if (scored.length > 1 && Math.random() < randomness) {
      return scored[1].move;
    }
    return scored[0].move;
  }

  function cloneSimTable(table) {
    const hands = {};
    table.activeOrder.forEach((seat) => {
      hands[seat] = [...table.hands[seat]];
    });
    return {
      hands,
      activeOrder: [...table.activeOrder],
      turnOrder: [...table.turnOrder],
      turnSeat: table.turnSeat,
      lastPlay: table.lastPlay,
      lastCards: [...table.lastCards],
      lastPlayer: table.lastPlayer ? { ...table.lastPlayer } : null,
      passCount: table.passCount,
      bombs: table.bombs,
      farmerPlayed: table.farmerPlayed,
      landlordSeat: table.landlordSeat,
      landlordTeam: table.landlordTeam,
      seatPlayers: table.seatPlayers,
      match: table.match
    };
  }

  function simNextSeat(table, seat) {
    const index = table.turnOrder.indexOf(seat);
    return table.turnOrder[(index + 1) % table.turnOrder.length];
  }

  function simWinnerTeam(table, seat) {
    if (seat === table.landlordSeat) return table.landlordTeam;
    return table.landlordTeam.id === table.match.teamA.id ? table.match.teamB : table.match.teamA;
  }

  function simApplyMove(table, seat, move) {
    if (!move) {
      table.passCount++;
      if (table.passCount >= 2) {
        table.lastPlay = null;
        table.lastCards = [];
        table.lastPlayer = null;
        table.passCount = 0;
      }
      table.turnSeat = simNextSeat(table, seat);
      return null;
    }

    rtRemoveCards(table.hands[seat], move.cards);
    if (move.type === 'bomb' || move.type === 'rocket') table.bombs++;
    if (seat !== table.landlordSeat) table.farmerPlayed = true;
    table.lastPlay = move;
    table.lastCards = move.cards;
    table.lastPlayer = { seat, team: table.seatPlayers[seat].team };
    table.passCount = 0;

    if (table.hands[seat].length === 0) return simWinnerTeam(table, seat);
    table.turnSeat = simNextSeat(table, seat);
    return null;
  }

  function simChooseMove(table, seat) {
    const hand = table.hands[seat];
    const moves = generateMoves(hand);
    return selectMoveByRules(table, seat, hand, moves, simNextSeat);
  }

  function simulateCandidate(table, seat, firstMove) {
    const sim = cloneSimTable(table);
    const team = table.seatPlayers[seat].team;
    let winner = simApplyMove(sim, seat, firstMove);
    if (winner) return winner.id === team.id;

    let guard = 0;
    while (guard++ < 160) {
      const actor = sim.turnSeat;
      const move = simChooseMove(sim, actor);
      winner = simApplyMove(sim, actor, move);
      if (winner) return winner.id === team.id;
    }

    return false;
  }

  function searchRealtimeMove(table, seat, moves) {
    if (realtime.instant) return null;

    const hand = table.hands[seat];
    const lastPlay = table.lastPlay;
    let options = [];
    const legal = lastPlay ? moves.filter((move) => beats(lastPlay, move)) : moves;

    const scored = legal.map((move) => ({
      move,
      score: lastPlay ? followMoveScore(move, hand) : leadMoveScore(move, hand)
    }));
    scored.sort((a, b) => a.score - b.score);
    options = scored.slice(0, 3).map((entry) => entry.move);

    const finish = legal.find((move) => move.cards.length === hand.length);
    if (finish && !options.includes(finish)) options.unshift(finish);

    if (lastPlay) options.push(null);
    if (options.length === 0) return null;

    let bestMove = options[0];
    let bestWins = -1;
    const rollouts = 3;

    options.forEach((move) => {
      let wins = 0;
      for (let i = 0; i < rollouts; i++) {
        if (simulateCandidate(table, seat, move)) wins++;
      }
      if (wins > bestWins) {
        bestWins = wins;
        bestMove = move;
      }
    });

    return bestMove;
  }

  function makeBoardHands() {
    const seats = ['E', 'S', 'W', 'N'];
    const hands = {};
    seats.forEach((seat) => {
      hands[seat] = {
        score: 25 + Math.random() * 65,
        bombs: (Math.random() < 0.22 ? 1 : 0) + (Math.random() < 0.08 ? 1 : 0)
      };
    });
    return hands;
  }

  function simulateTable(match, table, hands, boardIndex, maps) {
    const seatPlayers = match.seatMaps[table - 1];

    const baseOrder = ['S', 'E', 'N', 'W'];
    const shift = boardIndex % 4;
    const order = [...baseOrder.slice(shift), ...baseOrder.slice(0, shift)];

    const bids = {};
    order.forEach((seat) => {
      const entry = seatPlayers[seat];
      const hand = hands[seat].score + (entry.player.strength - 70) * 0.5 + (Math.random() - 0.5) * 22;
      let bid = 0;
      if (hand > 76) bid = 3;
      else if (hand > 60) bid = 2;
      else if (hand > 43) bid = 1;
      bids[seat] = bid;
    });

    let landlordSeat = order[0];
    order.forEach((seat) => {
      if (bids[seat] > bids[landlordSeat]) landlordSeat = seat;
    });

    if (bids[landlordSeat] === 0) {
      let bestSeat = order[0];
      order.forEach((seat) => {
        if (hands[seat].score > hands[bestSeat].score) bestSeat = seat;
      });
      landlordSeat = bestSeat;
      bids[landlordSeat] = 1;
    }

    const landlord = seatPlayers[landlordSeat];
    const farmers = order.filter((seat) => seat !== landlordSeat).map((seat) => seatPlayers[seat]);
    const farmerAvgHand = farmers.reduce((sum, entry) => sum + hands[entry.seat].score, 0) / farmers.length;
    const farmerAvgStrength = farmers.reduce((sum, entry) => sum + entry.player.strength, 0) / farmers.length;

    const spring = Math.random() < (hands[landlordSeat].score > 70 ? 0.06 : 0.02);
    const antiSpring = Math.random() < 0.03;
    const bombs = hands[landlordSeat].bombs + (Math.random() < 0.25 ? 1 : 0);
    const multiplier = 1 + bombs + (spring ? 1 : 0) + (antiSpring ? 1 : 0);
    const points = bids[landlordSeat] * multiplier;

    const edge =
      (hands[landlordSeat].score - farmerAvgHand) / 22 +
      (landlord.player.strength - farmerAvgStrength) / 14 +
      (bids[landlordSeat] - 1.5) * 0.2 -
      0.25;
    const probability = Math.min(0.9, Math.max(0.1, 1 / (1 + Math.exp(-edge))));
    const landlordWon = Math.random() < probability;
    const winnerTeam = landlordWon
      ? landlord.team
      : (landlord.team === match.teamA ? match.teamB : match.teamA);

    order.forEach((seat) => {
      const entry = seatPlayers[seat];
      const isLandlord = seat === landlordSeat;
      const teamWon = entry.team === winnerTeam;
      const rawNet = isLandlord
        ? (teamWon ? points : -points)
        : (teamWon ? points / 2 : -points / 2);

      entry.role = isLandlord ? 'landlord' : 'farmer';
      entry.bid = bids[seat];
      entry.teamWon = teamWon;
      entry.rawNet = rawNet;
    });

    return {
      table,
      landlordSeat,
      landlordName: landlord.player.name,
      landlordTeam: landlord.team,
      bid: bids[landlordSeat],
      multiplier,
      winnerTeam,
      points,
      signedA: winnerTeam === match.teamA ? points : -points,
      players: order.map((seat) => ({
        seat,
        player: seatPlayers[seat].player,
        name: seatPlayers[seat].player.name,
        team: seatPlayers[seat].team,
        role: seatPlayers[seat].role,
        bid: seatPlayers[seat].bid,
        teamWon: seatPlayers[seat].teamWon,
        rawNet: seatPlayers[seat].rawNet
      }))
    };
  }

  function playBoard(match, gameIndex, boardIndex, maps) {
    const hands = makeBoardHands();
    const table1 = simulateTable(match, 1, hands, boardIndex, maps);
    const table2 = simulateTable(match, 2, hands, (boardIndex + 2) % 4, maps);

    const raw = table1.signedA + table2.signedA;
    const margin = Math.min(12, Math.abs(raw));
    const pointsA = raw > 0 ? margin : 0;
    const pointsB = raw < 0 ? margin : 0;

    ['E', 'S', 'W', 'N'].forEach((seat) => {
      const first = table1.players.find((entry) => entry.seat === seat);
      const second = table2.players.find((entry) => entry.seat === seat);
      if (!first || !second) return;

      const difference = Math.round(first.rawNet - second.rawNet);
      recordPlayer(maps, first.player, first.team, first.role, first.bid, first.teamWon, difference);
      recordPlayer(maps, second.player, second.team, second.role, second.bid, second.teamWon, -difference);
    });

    return {
      index: boardIndex,
      table1,
      table2,
      pointsA,
      pointsB
    };
  }

  function playGame(match, sessionStats) {
    maybeSubstitute(match);

    const deciding =
      season.stageIdx >= 1 &&
      match.winsA === match.target - 1 &&
      match.winsB === match.target - 1;
    const plannedBoards = deciding ? DECIDING_BOARDS : BOARDS_PER_GAME[season.stageIdx];

    const maps = [sessionStats, match.stats, season.stageStats, season.totalStats];
    const boards = [];
    let scoreA = 0;
    let scoreB = 0;

    for (let i = 0; i < plannedBoards; i++) {
      const board = playBoard(match, match.games.length, i, maps);
      boards.push(board);
      scoreA += board.pointsA;
      scoreB += board.pointsB;

      const remaining = plannedBoards - i - 1;
      if (season.stageIdx >= 2 && Math.abs(scoreA - scoreB) > remaining * 12) break;
    }

    let extra = 0;
    while (scoreA === scoreB) {
      const board = playBoard(match, match.games.length, plannedBoards + extra, maps);
      boards.push(board);
      scoreA += board.pointsA;
      scoreB += board.pointsB;
      extra++;
      if (extra >= 12) break;
    }

    const winner = scoreA > scoreB ? match.teamA : match.teamB;
    const game = {
      index: match.games.length + 1,
      boards,
      scoreA,
      scoreB,
      winner,
      deciding,
      plannedBoards,
      lineupA: match.activeA.map((player) => player.name),
      lineupB: match.activeB.map((player) => player.name)
    };

    if (winner === match.teamA) match.winsA++;
    else match.winsB++;

    match.games.push(game);

    if (match.winsA >= match.target || match.winsB >= match.target) {
      match.done = true;
      match.winnerTeam = match.winsA > match.winsB ? match.teamA : match.teamB;
      finalizeMatch(match);
    }

    return game;
  }

  function metricFor(team) {
    if (!season.metrics.has(team.id)) {
      season.metrics.set(team.id, { w: 0, l: 0, gw: 0, gl: 0, pts: 0 });
    }
    return season.metrics.get(team.id);
  }

  function finalizeMatch(match) {
    if (match.recorded) return;
    match.recorded = true;

    const winnerMetric = metricFor(match.winnerTeam);
    const loserTeam = match.winnerTeam === match.teamA ? match.teamB : match.teamA;
    const loserMetric = metricFor(loserTeam);

    winnerMetric.w++;
    loserMetric.l++;
    winnerMetric.gw += Math.max(match.winsA, match.winsB);
    loserMetric.gl += Math.max(match.winsA, match.winsB);

    match.games.forEach((game) => {
      const diff = Math.abs(game.scoreA - game.scoreB);
      winnerMetric.pts += diff;
      loserMetric.pts -= diff;
    });
  }

  function pairKey(teamA, teamB) {
    return [teamA.id, teamB.id].sort((a, b) => a - b).join('-');
  }

  function pairTeams(list, avoidPairs, format, labelPrefix) {
    if (list.length < 2) return [];

    let bestPairing = null;
    for (let attempt = 0; attempt < 200; attempt++) {
      const shuffled = shuffle(list);
      const pairs = [];
      let valid = true;

      for (let i = 0; i < shuffled.length; i += 2) {
        const a = shuffled[i];
        const b = shuffled[i + 1];
        if (avoidPairs && avoidPairs.has(pairKey(a, b))) {
          valid = false;
          break;
        }
        pairs.push([a, b]);
      }

      if (!bestPairing) bestPairing = pairs;
      if (valid) {
        bestPairing = pairs;
        break;
      }
    }

    return bestPairing.map(([a, b], index) => createMatch(a, b, format, `${labelPrefix} · 第${index + 1}场`));
  }

  function buildSwissRound(roundNo) {
    season.roundUsed = new Set();
    const metrics = season.metrics;
    const active = season.stageTeams.filter((team) => {
      const record = metrics.get(team.id);
      return record && !season.advanced.has(team.id) && !season.eliminated.has(team.id);
    });

    const groups = [];
    if (roundNo === 1) {
      groups.push({ label: '随机抽签', format: 'BO3', teams: active });
    } else if (roundNo === 2) {
      [['1-0', 1, 0], ['0-1', 0, 1]].forEach(([label, wins, losses]) => {
        groups.push({
          label,
          format: 'BO3',
          teams: active.filter((team) => {
            const r = metrics.get(team.id);
            return r.w === wins && r.l === losses;
          })
        });
      });
    } else if (roundNo === 3) {
      [['2-0', 2, 0, 'BO5'], ['1-1', 1, 1, 'BO3'], ['0-2', 0, 2, 'BO5']].forEach(([label, wins, losses, format]) => {
        groups.push({
          label,
          format,
          teams: active.filter((team) => {
            const r = metrics.get(team.id);
            return r.w === wins && r.l === losses;
          })
        });
      });
    } else if (roundNo === 4) {
      [['2-1', 2, 1], ['1-2', 1, 2]].forEach(([label, wins, losses]) => {
        groups.push({
          label,
          format: 'BO5',
          teams: active.filter((team) => {
            const r = metrics.get(team.id);
            return r.w === wins && r.l === losses;
          })
        });
      });
    } else {
      groups.push({
        label: '2-2',
        format: 'BO5',
        teams: active.filter((team) => {
          const r = metrics.get(team.id);
          return r.w === 2 && r.l === 2;
        })
      });
    }

    const matches = [];
    groups.forEach((group) => {
      if (group.teams.length < 2) return;
      matches.push(...pairTeams(group.teams, season.played, group.format, `${ROUND_LABELS[roundNo - 1]} ${group.label}`));
    });

    matches.forEach((match) => season.played.add(pairKey(match.teamA, match.teamB)));

    season.round = {
      label: ROUND_LABELS[roundNo - 1],
      roundNo,
      matches
    };
    setCurrentMatch(matches[0]);
    render();
    tipEl.textContent = `${STAGE_NAMES[season.stageIdx]} · ${ROUND_LABELS[roundNo - 1]}：共 ${matches.length} 场对阵，每局 ${BOARDS_PER_GAME[season.stageIdx]} 副。`;
  }

  function applySwissAdvances(roundNo) {
    const metrics = season.metrics;
    season.stageTeams.forEach((team) => {
      const r = metrics.get(team.id);
      if (!r) return;

      if (roundNo === 3) {
        if (r.w === 3) season.advanced.add(team.id);
        if (r.l === 3) season.eliminated.add(team.id);
      } else if (roundNo === 4) {
        if (r.w === 3) season.advanced.add(team.id);
        if (r.l === 3) season.eliminated.add(team.id);
      } else if (roundNo === 5) {
        if (r.w === 3) season.advanced.add(team.id);
        if (r.l === 3) season.eliminated.add(team.id);
      }
    });
  }

  function advanceSwissRound() {
    const roundNo = season.round.roundNo;
    applySwissAdvances(roundNo);

    if (roundNo >= 5) {
      const qualifiers = season.stageTeams
        .filter((team) => season.advanced.has(team.id))
        .sort((a, b) => compareMetrics(metricFor(a), metricFor(b)));
      season.qualifiers = qualifiers;
      finishStage();
      return;
    }

    buildSwissRound(roundNo + 1);
  }

  function setCurrentMatch(match) {
    season.currentMatch = match || null;
  }

  function finishStage() {
    season.stageEnded = true;
    season.currentMatch = null;

    if (season.stageIdx === 4) {
      season.finished = true;
      render();
      tipEl.textContent = '本届比赛结束，可查看本届汇总或重新开始赛季。';
      lastSummary = {
        kind: 'overall',
        stats: season.totalStats,
        title: '青云杯 · 本届选手数据汇总'
      };
      summaryBtn.textContent = '本届汇总';
      summaryBtn.hidden = false;
      openSummary();
      return;
    }

    render();
    tipEl.textContent = '赛段结束，可查看汇总并进入下一赛段。';
    lastSummary = {
      kind: 'stage',
      stageIdx: season.stageIdx,
      stats: season.stageStats,
      title: `${STAGE_NAMES[season.stageIdx]} · 选手数据排名`
    };
    summaryBtn.textContent = '赛段汇总';
    summaryBtn.hidden = false;
    openSummary();
  }

  function buildStage3Round0() {
    season.roundUsed = new Set();
    const shuffled = shuffle(season.stageTeams);
    const matches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      matches.push(createMatch(shuffled[i], shuffled[i + 1], 'BO5', `A轮 甲组 · 第${i / 2 + 1}场`));
    }
    season.round = { label: 'A轮 甲组', matches };
    setCurrentMatch(matches[0]);
    render();
  }

  function winnersOf(matches) {
    return matches.map((match) => match.winnerTeam);
  }

  function losersOf(matches) {
    return matches.map((match) =>
      match.winnerTeam === match.teamA ? match.teamB : match.teamA
    );
  }

  function buildStage3Next() {
    season.roundUsed = new Set();
    const bracket = season.bracket;
    const roundIndex = bracket.roundIndex;

    if (roundIndex === 0) {
      bracket.aWinners = winnersOf(season.round.matches);
      bracket.aLosers = losersOf(season.round.matches);

      const matches = [
        ...pairTeams(shuffle(bracket.aWinners), null, 'BO5', 'B轮 甲组'),
        ...pairTeams(shuffle(bracket.aLosers), null, 'BO3', 'B轮 乙组')
      ];
      season.round = { label: 'B轮', matches };
      bracket.roundIndex = 1;
    } else if (roundIndex === 1) {
      const jia = season.round.matches.filter((match) => match.label.startsWith('B轮 甲组'));
      const yi = season.round.matches.filter((match) => match.label.startsWith('B轮 乙组'));
      bracket.bJiaWinners = winnersOf(jia);
      bracket.bJiaLosers = losersOf(jia);
      bracket.bYiWinners = winnersOf(yi);
      bracket.bYiLosers = losersOf(yi);

      season.round = {
        label: 'C轮',
        matches: [
          createMatch(bracket.bYiWinners[0], bracket.bYiWinners[1], 'BO3', 'C轮 乙组'),
          createMatch(bracket.bYiLosers[0], bracket.bYiLosers[1], 'BO3', 'C轮 丙组')
        ]
      };
      bracket.roundIndex = 2;
    } else if (roundIndex === 2) {
      const yi = season.round.matches.find((match) => match.label.includes('乙组'));
      const bing = season.round.matches.find((match) => match.label.includes('丙组'));
      bracket.cYiWinner = yi.winnerTeam;
      bracket.cYiLoser = yi.winnerTeam === yi.teamA ? yi.teamB : yi.teamA;
      bracket.cBingWinner = bing.winnerTeam;
      bracket.cBingLoser = bing.winnerTeam === bing.teamA ? bing.teamB : bing.teamA;

      season.round = {
        label: 'D轮 丙组',
        matches: [createMatch(bracket.cYiLoser, bracket.cBingWinner, 'BO3', 'D轮 丙组')]
      };
      bracket.roundIndex = 3;
    } else if (roundIndex === 3) {
      const match = season.round.matches[0];
      bracket.dWinner = match.winnerTeam;
      bracket.dLoser = match.winnerTeam === match.teamA ? match.teamB : match.teamA;

      const eTeams = shuffle([...bracket.bJiaLosers, bracket.cYiWinner, bracket.dWinner]);
      season.round = {
        label: 'E轮 庚组',
        matches: pairTeams(eTeams, null, 'BO3', 'E轮 庚组')
      };
      bracket.roundIndex = 4;
    } else if (roundIndex === 4) {
      bracket.eWinners = winnersOf(season.round.matches);
      bracket.eLosers = losersOf(season.round.matches);

      season.round = {
        label: 'F轮',
        matches: [
          createMatch(bracket.eWinners[0], bracket.eWinners[1], 'BO3', 'F轮 庚组'),
          createMatch(bracket.eLosers[0], bracket.eLosers[1], 'BO3', 'F轮 辛组')
        ]
      };
      bracket.roundIndex = 5;
    } else if (roundIndex === 5) {
      const geng = season.round.matches.find((match) => match.label.includes('庚组'));
      const xin = season.round.matches.find((match) => match.label.includes('辛组'));
      bracket.fGengWinner = geng.winnerTeam;
      bracket.fGengLoser = geng.winnerTeam === geng.teamA ? geng.teamB : geng.teamA;
      bracket.fXinWinner = xin.winnerTeam;
      bracket.fXinLoser = xin.winnerTeam === xin.teamA ? xin.teamB : xin.teamA;

      season.round = {
        label: 'G轮 辛组',
        matches: [createMatch(bracket.fGengLoser, bracket.fXinWinner, 'BO5', 'G轮 辛组')]
      };
      bracket.roundIndex = 6;
    } else {
      const finalMatch = season.round.matches[0];
      bracket.gWinner = finalMatch.winnerTeam;
      bracket.gLoser = finalMatch.winnerTeam === finalMatch.teamA ? finalMatch.teamB : finalMatch.teamA;

      season.qualifiers = [
        ...bracket.bJiaWinners,
        bracket.fGengWinner,
        bracket.gWinner
      ];
      finishStage();
      return;
    }

    setCurrentMatch(season.round.matches[0]);
    render();
  }

  function buildStage4Next() {
    season.roundUsed = new Set();
    const bracket = season.bracket;
    const roundIndex = bracket.roundIndex;

    if (roundIndex === 0) {
      bracket.winners = winnersOf(season.round.matches);
      bracket.losers = losersOf(season.round.matches);

      season.round = {
        label: '胜区决赛 / 四进三',
        matches: [
          createMatch(bracket.winners[0], bracket.winners[1], 'BO5', '胜区决赛'),
          createMatch(bracket.losers[0], bracket.losers[1], 'BO5', '四进三')
        ]
      };
      bracket.roundIndex = 1;
    } else if (roundIndex === 1) {
      const winnersFinal = season.round.matches.find((match) => match.label === '胜区决赛');
      const fourThree = season.round.matches.find((match) => match.label === '四进三');
      bracket.winnerFinalWinner = winnersFinal.winnerTeam;
      bracket.winnerFinalLoser = winnersFinal.winnerTeam === winnersFinal.teamA ? winnersFinal.teamB : winnersFinal.teamA;
      bracket.fourThreeWinner = fourThree.winnerTeam;
      bracket.fourThreeLoser = fourThree.winnerTeam === fourThree.teamA ? fourThree.teamB : fourThree.teamA;

      season.round = {
        label: '败区决赛',
        matches: [
          createMatch(bracket.winnerFinalLoser, bracket.fourThreeWinner, 'BO5', '败区决赛')
        ]
      };
      bracket.roundIndex = 2;
    } else {
      const match = season.round.matches[0];
      bracket.loserFinalWinner = match.winnerTeam;
      bracket.loserFinalLoser = match.winnerTeam === match.teamA ? match.teamB : match.teamA;

      season.finalists = [bracket.winnerFinalWinner, bracket.loserFinalWinner];
      finishStage();
      return;
    }

    setCurrentMatch(season.round.matches[0]);
    render();
  }

  function startStage(stageIdx) {
    season.stageIdx = stageIdx;
    season.stageStats = createStatsMap();
    season.metrics = new Map();
    season.advanced = new Set();
    season.eliminated = new Set();
    season.played = new Set();
    season.round = null;
    season.currentMatch = null;
    season.stageEnded = false;
    season.finished = false;
    lastSummary = null;
    lastResult = null;

    if (stageIdx === 0) {
      season.stageTeams = teams.filter((team) => !team.seed);
      season.stageTeams.forEach((team) => metricFor(team));
      buildSwissRound(1);
    } else if (stageIdx === 1) {
      season.stageTeams = [...teams.filter((team) => team.seed), ...season.qualifiers];
      season.stageTeams.forEach((team) => metricFor(team));
      buildSwissRound(1);
    } else if (stageIdx === 2) {
      season.stageTeams = [...season.qualifiers];
      season.bracket = { roundIndex: 0 };
      buildStage3Round0();
    } else if (stageIdx === 3) {
      season.stageTeams = [...season.qualifiers];
      season.bracket = { roundIndex: 0 };
      season.roundUsed = new Set();
      const shuffled = shuffle(season.stageTeams);
      season.round = {
        label: '分区赛',
        matches: [
          createMatch(shuffled[0], shuffled[1], 'BO5', '分区赛 · 第1场'),
          createMatch(shuffled[2], shuffled[3], 'BO5', '分区赛 · 第2场')
        ]
      };
      setCurrentMatch(season.round.matches[0]);
      render();
    } else {
      season.stageTeams = [...season.finalists];
      season.roundUsed = new Set();
      season.round = {
        label: '决赛',
        matches: [createMatch(season.finalists[0], season.finalists[1], 'BO7', '决赛')]
      };
      setCurrentMatch(season.round.matches[0]);
      render();
    }

    tipEl.textContent = `${STAGE_NAMES[season.stageIdx]} 开始，每局 ${BOARDS_PER_GAME[stageIdx]} 副${stageIdx >= 1 ? `，决胜局 ${DECIDING_BOARDS} 副` : ''}，对阵已随机分配。`;
    render();
  }

  function resetSeason() {
    closeModal(summaryModal);
    closeModal(restartModal);
    prepareTeams(teams, preserveStrengths);
    season = {
      stageIdx: 0,
      stageStats: createStatsMap(),
      totalStats: createStatsMap(),
      metrics: new Map(),
      advanced: new Set(),
      eliminated: new Set(),
      played: new Set(),
      qualifiers: [],
      finalists: [],
      stageTeams: [],
      stageEnded: false,
      finished: false,
      currentMatch: null,
      round: null
    };
    lastResult = null;
    lastSummary = null;
    startStage(0);
  }

  function sandboxValidationMessage() {
    if (!sandboxDraft) return '';

    if (sandboxDraft.length !== 24) {
      return `需要 24 支战队，当前 ${sandboxDraft.length} 支。`;
    }

    const seeds = sandboxDraft.filter((team) => team.seed).length;
    if (seeds !== 8) {
      return `需要 8 支种子队，当前 ${seeds} 支。`;
    }

    for (const team of sandboxDraft) {
      if (!team.name.trim()) return '战队名称不能为空。';
      const playable = team.players.filter((player) => player.role !== '领队' && player.role !== '教练');
      if (playable.length < 4) {
        return `战队「${team.name.trim() || '未命名'}」至少需要 4 名可上场队员。`;
      }
      if (team.players.some((player) => !player.name.trim() || !Number.isFinite(player.strength))) {
        return `战队「${team.name.trim()}」存在未命名或实力值无效的队员。`;
      }
    }

    return '';
  }

  function updateSandboxValidation() {
    if (!sandboxDraft) return;

    const seedCount = sandboxDraft.filter((team) => team.seed).length;
    const playerCount = sandboxDraft.reduce((sum, team) => sum + team.players.length, 0);
    sandboxSummary.textContent = `${sandboxDraft.length} 支战队 · ${seedCount} 支种子队 · ${playerCount} 名选手 · 需 24 队 / 8 种子`;

    const error = sandboxValidationMessage();
    sandboxTip.textContent = error;
    sandboxApplyBtn.disabled = Boolean(error);
  }

  function movePlayer(fromTeam, playerIndex, toIndex) {
    if (!sandboxDraft || toIndex < 0 || toIndex >= sandboxDraft.length) return;
    if (sandboxDraft[toIndex] === fromTeam) return;

    const [player] = fromTeam.players.splice(playerIndex, 1);
    sandboxDraft[toIndex].players.push(player);
    renderSandboxEditor(toIndex);
  }

  function renderSandboxEditor(openIndex = null) {
    if (!sandboxDraft) return;

    sandboxTeamsEl.textContent = '';

    sandboxDraft.forEach((team, teamIndex) => {
      const details = document.createElement('details');
      details.className = 'qy-sb-team';
      details.open = teamIndex === openIndex;

      const summary = document.createElement('summary');
      const name = document.createElement('span');
      name.className = 'qy-sb-team-name';
      name.textContent = team.name || '未命名战队';
      const meta = document.createElement('span');
      meta.className = 'qy-sb-team-meta';
      meta.textContent = `${team.players.length} 人${team.seed ? ' · 种子队' : ''}`;
      summary.append(name, meta);

      const body = document.createElement('div');
      body.className = 'qy-sb-body';

      const teamRow = document.createElement('div');
      teamRow.className = 'qy-sb-team-row';

      const teamNameInput = document.createElement('input');
      teamNameInput.className = 'qy-sb-input qy-sb-name';
      teamNameInput.type = 'text';
      teamNameInput.value = team.name;
      teamNameInput.setAttribute('aria-label', '战队名称');
      teamNameInput.addEventListener('input', () => {
        team.name = teamNameInput.value;
        name.textContent = team.name || '未命名战队';
        updateSandboxValidation();
      });

      const seedLabel = document.createElement('label');
      seedLabel.className = 'qy-sb-seed';
      const seedInput = document.createElement('input');
      seedInput.type = 'checkbox';
      seedInput.checked = team.seed;
      seedInput.addEventListener('change', () => {
        team.seed = seedInput.checked;
        meta.textContent = `${team.players.length} 人${team.seed ? ' · 种子队' : ''}`;
        updateSandboxValidation();
      });
      seedLabel.append(seedInput, document.createTextNode('种子队'));

      const removeTeam = document.createElement('button');
      removeTeam.type = 'button';
      removeTeam.className = 'mini-btn';
      removeTeam.textContent = '删除战队';
      removeTeam.addEventListener('click', () => {
        sandboxDraft.splice(teamIndex, 1);
        renderSandboxEditor();
      });

      teamRow.append(teamNameInput, seedLabel, removeTeam);

      const players = document.createElement('div');
      players.className = 'qy-sb-body';

      team.players.forEach((player, playerIndex) => {
        const row = document.createElement('div');
        row.className = 'qy-sb-player';

        const playerName = document.createElement('input');
        playerName.className = 'qy-sb-input';
        playerName.type = 'text';
        playerName.value = player.name;
        playerName.setAttribute('aria-label', '队员名称');
        playerName.addEventListener('input', () => {
          player.name = playerName.value;
          updateSandboxValidation();
        });

        const strength = document.createElement('input');
        strength.className = 'qy-sb-input qy-sb-strength';
        strength.type = 'number';
        strength.min = '0';
        strength.step = '1';
        strength.value = Number.isFinite(player.strength) ? player.strength : 70;
        strength.setAttribute('aria-label', '实力值');
        strength.addEventListener('input', () => {
          const value = Number(strength.value);
          player.strength = Number.isFinite(value) ? Math.max(0, value) : 0;
          updateSandboxValidation();
        });

        const teamSelect = document.createElement('select');
        teamSelect.className = 'qy-sb-select';
        teamSelect.setAttribute('aria-label', '所属战队');
        sandboxDraft.forEach((optionTeam, optionIndex) => {
          const option = document.createElement('option');
          option.value = String(optionIndex);
          option.textContent = optionTeam.name || '未命名战队';
          if (optionIndex === teamIndex) option.selected = true;
          teamSelect.append(option);
        });
        teamSelect.addEventListener('change', () => {
          movePlayer(team, playerIndex, Number(teamSelect.value));
        });

        const removePlayer = document.createElement('button');
        removePlayer.type = 'button';
        removePlayer.className = 'qy-sb-remove';
        removePlayer.textContent = '×';
        removePlayer.setAttribute('aria-label', '删除队员');
        removePlayer.addEventListener('click', () => {
          team.players.splice(playerIndex, 1);
          renderSandboxEditor(teamIndex);
        });

        row.append(playerName, strength, removePlayer, teamSelect);
        players.append(row);
      });

      const addPlayer = document.createElement('button');
      addPlayer.type = 'button';
      addPlayer.className = 'mini-btn';
      addPlayer.textContent = '新增队员';
      addPlayer.addEventListener('click', () => {
        sandboxSeq++;
        team.players.push({
          name: '新队员',
          account: `sandbox-${sandboxSeq}`,
          role: '队员',
          gold: false,
          strength: 70
        });
        renderSandboxEditor(teamIndex);
      });

      body.append(teamRow, players, addPlayer);
      details.append(summary, body);
      sandboxTeamsEl.append(details);
    });

    updateSandboxValidation();
  }

  function updateSandboxBar() {
    sandboxToggle.checked = sandboxActive || sandboxEditing;
    sandboxStatus.textContent = sandboxEditing
      ? '编辑中'
      : sandboxActive
        ? `沙盒赛季 · ${sandboxTeams.length} 队 · ${sandboxTeams.filter((team) => team.seed).length} 种子`
        : '';
    sandboxEditBtn.hidden = !sandboxActive || sandboxEditing;
  }

  function openSandboxEditor() {
    const source = sandboxActive && sandboxTeams ? sandboxTeams : officialTeams;
    sandboxDraft = cloneTeamList(source);
    sandboxEditing = true;

    document.querySelector('.qy-panel').classList.add('is-sandbox-editing');
    sandboxEditor.hidden = false;
    sandboxEditBtn.hidden = true;
    renderSandboxEditor();
    updateSandboxBar();
  }

  function closeSandboxEditor() {
    sandboxEditing = false;
    sandboxDraft = null;
    sandboxEditor.hidden = true;
    document.querySelector('.qy-panel').classList.remove('is-sandbox-editing');
  }

  function applySandbox() {
    if (!sandboxDraft || sandboxValidationMessage()) return;

    sandboxDraft.forEach((team, index) => {
      team.id = index;
      team.players.forEach((player) => {
        if (!Number.isFinite(player.strength)) player.strength = 70;
      });
    });

    sandboxTeams = sandboxDraft;
    teams = sandboxTeams;
    preserveStrengths = true;
    sandboxActive = true;
    closeSandboxEditor();
    resetSeason();
    updateSandboxBar();
    tipEl.textContent = '沙盒赛季已开始，名单与实力值可按需继续编辑。';
  }

  function cancelSandbox() {
    closeSandboxEditor();

    if (sandboxActive) {
      updateSandboxBar();
      render();
    } else {
      sandboxToggle.checked = false;
      updateSandboxBar();
      render();
    }
  }

  function exitSandbox() {
    const wasActive = sandboxActive;
    closeSandboxEditor();

    sandboxActive = false;
    sandboxTeams = null;
    preserveStrengths = false;
    teams = officialTeams;
    sandboxToggle.checked = false;
    updateSandboxBar();

    if (wasActive) {
      resetSeason();
      tipEl.textContent = '已退出沙盒模式，恢复官方名单与赛季。';
    } else {
      render();
    }
  }

  function advanceMatch() {
    if (!season.currentMatch || !season.currentMatch.done) return;

    const round = season.round;
    const matchIndex = round.matches.indexOf(season.currentMatch);
    if (matchIndex < round.matches.length - 1) {
      setCurrentMatch(round.matches[matchIndex + 1]);
      render();
      tipEl.textContent = '下一场对阵已就绪。';
      return;
    }

    if (season.stageIdx <= 1) {
      advanceSwissRound();
    } else if (season.stageIdx === 2) {
      buildStage3Next();
    } else if (season.stageIdx === 3) {
      buildStage4Next();
    } else {
      finishSeasonFinal();
    }
  }

  function finishSeasonFinal() {
    const match = season.round.matches[0];
    const champion = match.winnerTeam;
    const runnerUp = champion === match.teamA ? match.teamB : match.teamA;
    season.champion = champion;
    season.runnerUp = runnerUp;
    season.finished = true;
    finishStage();
  }

  function simulateSingleGame() {
    const match = season.currentMatch;
    if (!match || match.done || season.stageEnded || season.finished) return;

    const sessionStats = createStatsMap();
    const game = playGame(match, sessionStats);
    lastResult = {
      scope: 'game',
      match,
      games: [game],
      stats: sessionStats
    };
    render();
    tipEl.textContent = match.done
      ? `本场比赛结束：${match.teamA.name} ${match.winsA} : ${match.winsB} ${match.teamB.name}，点击「下一场」继续。`
      : `第 ${game.index} 局结束，${game.winner.name} 胜。`;
  }

  function simulateWholeMatch() {
    const match = season.currentMatch;
    if (!match || match.done || season.stageEnded || season.finished) return;

    while (!match.done && match.games.length < match.formatN) {
      playGame(match, createStatsMap());
    }

    lastResult = {
      scope: 'match',
      match,
      games: [...match.games],
      stats: match.stats
    };
    render();
    tipEl.textContent = `本场比赛结束：${match.teamA.name} ${match.winsA} : ${match.winsB} ${match.teamB.name}，点击「下一场」继续。`;
  }

  /* ---------- UI ---------- */

  function render() {
    if (!season) return;

    stageEl.textContent = STAGE_NAMES[season.stageIdx] || '赛季结束';
    const roundText = season.finished
      ? '赛季结束'
      : season.stageEnded
        ? '赛段结束'
        : season.round
          ? `${season.round.label} · ${season.round.matches.length} 场对阵`
          : '';
    roundEl.textContent = roundText;

    const match = season.currentMatch;
    if (match) {
      teamAEl.textContent = match.teamA.name;
      teamBEl.textContent = match.teamB.name;
      seedAEl.hidden = !match.teamA.seed;
      seedBEl.hidden = !match.teamB.seed;
      formatEl.textContent = match.format;
      scoreEl.textContent = `${match.winsA} : ${match.winsB}`;
    } else {
      teamAEl.textContent = season.finished ? (season.champion?.name || '—') : '—';
      teamBEl.textContent = season.finished ? (season.runnerUp?.name || '—') : '—';
      seedAEl.hidden = true;
      seedBEl.hidden = true;
      formatEl.textContent = season.finished ? '冠军 / 亚军' : '';
      scoreEl.textContent = season.finished ? '冠军' : '0 : 0';
    }

    const canPlay = Boolean(match) && !match.done && !season.stageEnded && !season.finished;
    singleBtn.disabled = !canPlay;
    wholeBtn.disabled = !canPlay;
    realtimeBtn.disabled = !canPlay;
    nextBtn.disabled = !match || !match.done || season.stageEnded || season.finished;

    summaryBtn.hidden = !lastSummary;
    renderRoundList();
    renderResult();
  }

  function renderRoundList() {
    roundListEl.textContent = '';
    if (!season.round) {
      roundSummaryEl.textContent = '本轮对阵';
      return;
    }

    roundSummaryEl.textContent = `本轮对阵 · ${season.round.label}（${season.round.matches.length} 场）`;

    season.round.matches.forEach((match) => {
      const item = document.createElement('div');
      item.className = 'qy-round-item';
      if (match === season.currentMatch) item.classList.add('is-current');

      const name = document.createElement('span');
      name.textContent = `${match.teamA.name} vs ${match.teamB.name} · ${match.format}`;

      const result = document.createElement('span');
      result.className = 'qy-round-result';
      result.textContent = match.done
        ? `${match.winsA} : ${match.winsB}`
        : match === season.currentMatch
          ? '进行中'
          : '待开始';

      item.append(name, result);
      roundListEl.append(item);
    });
  }

  function tableCell(text, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function headerCell(text) {
    const cell = document.createElement('th');
    cell.textContent = text;
    return cell;
  }

  function wrapTable(table) {
    const wrap = document.createElement('div');
    wrap.className = 'qy-table-wrap';
    wrap.append(table);
    return wrap;
  }

  function statsTable(stats) {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['选手', '队伍', '场次', '净胜分', '总胜率', '地主胜率', '农民胜率', '平均叫分'].forEach((label) => {
      headRow.append(headerCell(label));
    });
    head.append(headRow);

    const body = document.createElement('tbody');
    [...stats.values()]
      .filter((stat) => stat.games > 0)
      .sort((a, b) => b.net - a.net || b.games - a.games)
      .forEach((stat) => {
        const row = document.createElement('tr');
        row.append(
          tableCell(stat.name, 'qy-strong'),
          tableCell([...stat.teams].join(' / ')),
          tableCell(String(stat.games)),
          tableCell(String(Math.round(stat.net))),
          tableCell(formatPercent(stat.wins, stat.games)),
          tableCell(formatPercent(stat.landlordWins, stat.landlordGames)),
          tableCell(formatPercent(stat.farmerWins, stat.farmerGames)),
          tableCell(formatAverage(stat.bidSum, stat.bidCount))
        );
        body.append(row);
      });

    table.append(head, body);
    return table;
  }

  function renderResult() {
    resultBody.textContent = '';

    if (!lastResult) {
      const empty = document.createElement('p');
      empty.className = 'qy-empty';
      empty.textContent = '选择「模拟单局」或「模拟整场」开始比赛。';
      resultBody.append(empty);
      return;
    }

    const { match, games, stats, scope } = lastResult;
    const title = document.createElement('p');
    title.className = 'qy-result-title';
    title.textContent = `${match.teamA.name} ${match.winsA} : ${match.winsB} ${match.teamB.name}`;

    const sub = document.createElement('p');
    sub.className = 'qy-result-sub';
    const totalA = games.reduce((sum, game) => sum + game.scoreA, 0);
    const totalB = games.reduce((sum, game) => sum + game.scoreB, 0);
    sub.textContent = `${match.format} · ${match.label} · ${scope === 'match' ? '整场结果' : '单局结果'} · 总分 ${totalA} : ${totalB}`;

    resultBody.append(title, sub);

    games.forEach((game) => {
      const section = document.createElement('div');
      section.className = 'qy-game';

      const head = document.createElement('div');
      head.className = 'qy-game-head';

      const name = document.createElement('span');
      name.textContent = `第 ${game.index} 局${game.deciding ? '（决胜局）' : ''} · ${game.plannedBoards} 副${game.boards.length < game.plannedBoards ? '（提前结束）' : ''}`;

      const score = document.createElement('span');
      score.textContent = `${game.scoreA} : ${game.scoreB} · ${game.winner.name} 胜`;

      head.append(name, score);

      const table = document.createElement('table');
      table.className = 'qy-table';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['副', '桌1 得分', '桌2 得分', '本副队分'].forEach((label) => headRow.append(headerCell(label)));
      thead.append(headRow);

      const tbody = document.createElement('tbody');
      game.boards.forEach((board, index) => {
        const row = document.createElement('tr');
        const t1 = board.table1;
        const t2 = board.table2;

        row.append(
          tableCell(`第${index + 1}副`),
          tableCell(`${t1.winnerTeam.name} +${t1.points}`, 'qy-strong'),
          tableCell(`${t2.winnerTeam.name} +${t2.points}`, 'qy-strong'),
          tableCell(
            board.pointsA === 0 && board.pointsB === 0
              ? '平分'
              : `${board.pointsA > 0 ? match.teamA.name : match.teamB.name} +${Math.max(board.pointsA, board.pointsB)}`,
            board.pointsA === 0 && board.pointsB === 0 ? '' : 'qy-win'
          )
        );

        row.children[1].title = `地主 ${t1.landlordName} · 叫${t1.bid}分 ×${t1.multiplier}`;
        row.children[2].title = `地主 ${t2.landlordName} · 叫${t2.bid}分 ×${t2.multiplier}`;
        tbody.append(row);
      });

      table.append(thead, tbody);

      const lineup = document.createElement('p');
      lineup.className = 'qy-lineup';
      lineup.textContent = `${match.teamA.name}：${game.lineupA.join('、')} ｜ ${match.teamB.name}：${game.lineupB.join('、')}`;

      section.append(head, lineup, wrapTable(table));
      resultBody.append(section);
    });

    const statsSection = document.createElement('div');
    statsSection.className = 'qy-stats-section';
    const statsTitle = document.createElement('h4');
    statsTitle.className = 'qy-stats-title';
    statsTitle.textContent = '选手数据';
    statsSection.append(statsTitle, wrapTable(statsTable(stats)));
    resultBody.append(statsSection);
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('.modal-close')?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) {
      document.body.classList.remove('modal-open');
    }
  }

  function openSummary() {
    if (!lastSummary) return;

    summaryTitle.textContent = lastSummary.title;
    summaryBody.textContent = '';

    const note = document.createElement('p');
    note.className = 'modal-summary-note';
    const count = [...lastSummary.stats.values()].filter((stat) => stat.games > 0).length;
    note.textContent = `共 ${count} 名选手出场 · 按净胜分排序`;

    summaryBody.append(note, wrapTable(statsTable(lastSummary.stats)));

    if (lastSummary.kind === 'overall') {
      summaryAction.textContent = '重新开始赛季';
    } else {
      summaryAction.textContent = season.stageIdx < 4 ? '进入下一赛段' : '继续';
    }

    openModal(summaryModal);
  }

  function handleSummaryAction() {
    closeModal(summaryModal);
    if (!lastSummary) return;

    if (lastSummary.kind === 'overall') {
      resetSeason();
      return;
    }

    startStage(lastSummary.stageIdx + 1);
  }

  /* ---------- Realtime simulation ---------- */

  const RT_ROTATIONS = [
    { bidders: ['S', 'E', 'N'], idle: 'W' },
    { bidders: ['E', 'N', 'W'], idle: 'S' },
    { bidders: ['N', 'W', 'S'], idle: 'E' },
    { bidders: ['W', 'S', 'E'], idle: 'N' }
  ];
  let realtime = null;

  function rtDeck() {
    const deck = [];
    for (let i = 0; i < 4; i++) deck.push(...RANKS);
    deck.push('X', 'D');
    return shuffle(deck);
  }

  function rtBuildSeats(match, tableIndex) {
    const groups = tableIndex === 0
      ? [
          { team: match.teamA, pair: match.pairA1, seats: ['E', 'W'] },
          { team: match.teamB, pair: match.pairB1, seats: ['S', 'N'] }
        ]
      : [
          { team: match.teamA, pair: match.pairA2, seats: ['S', 'N'] },
          { team: match.teamB, pair: match.pairB2, seats: ['E', 'W'] }
        ];

    const seats = {};
    groups.forEach((group) => {
      const order = shuffle(group.seats);
      group.pair.forEach((player, index) => {
        const seat = order[index];
        seats[seat] = { player, team: group.team, seat };
      });
    });
    return seats;
  }

  function rtLogLine(table, text) {
    table.log.push(text);
    if (table.log.length > 8) table.log.shift();
  }

  function rtClearTimer(table) {
    if (table.timer) clearTimeout(table.timer);
    table.timer = null;
  }

  function rtSchedule(table, fn) {
    rtClearTimer(table);
    if (!realtime || realtime.instant || realtime.finished) return;

    const seat = table.phase === 'bidding'
      ? table.bidOrder[table.bidCursor]
      : table.turnSeat;
    const delay = (table.decisionMs && table.decisionMs[seat]) || 1200;
    table.timer = setTimeout(fn, delay);
  }

  function rtStartBoard(rt, index) {
    const rotation = RT_ROTATIONS[index % 4];
    const deck = rtDeck();
    const dealHands = {};
    rotation.bidders.forEach((seat, i) => {
      dealHands[seat] = sortCards(deck.slice(i * 17, (i + 1) * 17));
    });
    const bottom = deck.slice(51, 54);

    rt.boardIndex = index;
    rt.boardProcessed = false;
    rt.notice = '';

    rt.tables.forEach((table) => {
      rtClearTimer(table);
      table.phase = 'bidding';
      table.bidOrder = rotation.bidders;
      table.bidCursor = 0;
      table.bids = {};
      table.highestBid = 0;
      table.highestSeat = null;
      table.landlordSeat = null;
      table.hands = {};
      table.activeOrder = ['E', 'S', 'W', 'N'].filter((seat) => seat !== rotation.idle);
      table.idleSeat = rotation.idle;
      rotation.bidders.forEach((seat) => {
        table.hands[seat] = [...dealHands[seat]];
      });
      table.bottom = [...bottom];
      table.turnSeat = null;
      table.lastPlay = null;
      table.lastCards = [];
      table.lastPlayer = null;
      table.passCount = 0;
      table.bombs = 0;
      table.farmerPlayed = false;
      table.result = null;
      table.log = [];
      table.decisionMs = {};
      table.activeOrder.forEach((seat) => {
        table.decisionMs[seat] = 800 + Math.random() * 2400;
      });
      rtLogLine(table, `第 ${index + 1} 副开始，闲家：${table.seatPlayers[rotation.idle].player.name}`);
      rtSchedule(table, () => rtStepBid(table));
    });

    renderRealtime();
  }

  function rtStepBid(table, sync = false) {
    if (!realtime || realtime.finished || table.phase !== 'bidding') return;

    const seat = table.bidOrder[table.bidCursor];
    const entry = table.seatPlayers[seat];
    const bid = chooseBid(entry, table.hands[seat], table.highestBid);
    table.bids[seat] = bid;

    if (bid > table.highestBid) {
      table.highestBid = bid;
      table.highestSeat = seat;
    }

    rtLogLine(table, bid > 0 ? `${entry.player.name} 叫 ${bid} 分` : `${entry.player.name} 不叫`);
    table.bidCursor++;

    if (table.highestBid === 3 || table.bidCursor >= table.bidOrder.length) {
      rtFinishBidding(table, sync);
      return;
    }

    if (!sync) rtSchedule(table, () => rtStepBid(table));
    renderRealtime();
  }

  function rtFinishBidding(table, sync = false) {
    if (table.highestSeat === null) {
      table.highestSeat = table.bidOrder[0];
      table.highestBid = 1;
      table.bids[table.highestSeat] = 1;
    }

    table.landlordSeat = table.highestSeat;
    table.landlordTeam = table.seatPlayers[table.landlordSeat].team;

    if (table.seatPlayers[table.idleSeat].team.id !== table.landlordTeam.id) {
      const teammate = Object.values(table.seatPlayers).find((entry) =>
        entry.team.id === table.landlordTeam.id && entry.seat !== table.landlordSeat
      );

      if (teammate) {
        const idleEntry = table.seatPlayers[table.idleSeat];
        table.seatPlayers[table.idleSeat] = { ...teammate, seat: table.idleSeat };
        table.seatPlayers[teammate.seat] = { ...idleEntry, seat: teammate.seat };
        table.bids[teammate.seat] = 0;
        delete table.bids[table.idleSeat];
        rtLogLine(
          table,
          `闲家 ${idleEntry.player.name} 替换 ${teammate.player.name} 上场，${teammate.player.name} 成为闲家`
        );
      }
    }

    table.bid = table.highestBid;
    table.hands[table.landlordSeat] = sortCards([...table.hands[table.landlordSeat], ...table.bottom]);
    table.phase = 'playing';
    table.turnSeat = table.landlordSeat;
    const farmers = table.activeOrder.filter((seat) => seat !== table.landlordSeat);
    table.turnOrder = farmers.length === 2
      ? [table.landlordSeat, farmers[1], farmers[0]]
      : [...table.activeOrder];
    table.lastPlay = null;
    table.lastCards = [];
    table.lastPlayer = null;
    table.passCount = 0;
    table.bombs = 0;
    table.farmerPlayed = false;

    rtLogLine(table, `${table.seatPlayers[table.landlordSeat].player.name} 成为地主，底牌 ${table.bottom.join(' ')}`);

    if (!sync) rtSchedule(table, () => rtStepPlay(table));
    renderRealtime();
  }

  function rtNextSeat(table, seat) {
    const order = table.turnOrder && table.turnOrder.length ? table.turnOrder : table.activeOrder;
    const index = order.indexOf(seat);
    return order[(index + 1) % order.length];
  }

  function rtRemoveCards(hand, cards) {
    cards.forEach((card) => {
      const index = hand.indexOf(card);
      if (index > -1) hand.splice(index, 1);
    });
    hand.sort((a, b) => CARD_VALUE[b] - CARD_VALUE[a]);
  }

  const RT_MOVE_NAMES = {
    single: '单张',
    pair: '对子',
    triple: '三张',
    three1: '三带一',
    three2: '三带二',
    straight: '顺子',
    'stra-pair': '连对',
    plane: '飞机',
    plane1: '飞机带单',
    plane2: '飞机带对',
    four2: '四带二',
    four2pair: '四带两对',
    bomb: '炸弹',
    rocket: '王炸'
  };

  function rtApplyMove(table, entry, hand, move) {
    rtRemoveCards(hand, move.cards);
    if (move.type === 'bomb' || move.type === 'rocket') table.bombs++;
    if (entry.seat !== table.landlordSeat) table.farmerPlayed = true;

    table.lastPlay = move;
    table.lastCards = move.cards;
    table.lastPlayer = { seat: entry.seat, team: entry.team };
    table.passCount = 0;

    rtLogLine(table, `${entry.player.name} 出 ${sortCards(move.cards).join(' ')}（${RT_MOVE_NAMES[move.type] || move.type}）`);
  }

  function rtStepPlay(table, sync = false) {
    if (!realtime || realtime.finished || table.phase !== 'playing') return;

    const seat = table.turnSeat;
    const entry = table.seatPlayers[seat];
    const hand = table.hands[seat];
    const moves = generateMoves(hand);
    let move;
    if (entry.player.strength >= 72 && !realtime.instant) {
      move = searchRealtimeMove(table, seat, moves);
      if (move === null && !table.lastPlay) {
        move = chooseRealtimeMove(table, seat, hand, moves);
      }
    } else {
      move = chooseRealtimeMove(table, seat, hand, moves);
    }

    if (!move) {
      if (!table.lastPlay) {
        const fallback = moves.find((item) => item.cards.length === 1);
        if (fallback) {
          rtApplyMove(table, entry, hand, fallback);
          if (hand.length === 0) {
            rtFinishTableBoard(table, seat);
            return;
          }
          table.turnSeat = rtNextSeat(table, seat);
          if (!sync) rtSchedule(table, () => rtStepPlay(table));
          renderRealtime();
          return;
        }
      }

      rtLogLine(table, `${entry.player.name} 不出`);
      table.passCount++;
      if (table.passCount >= 2) {
        table.lastPlay = null;
        table.lastCards = [];
        table.lastPlayer = null;
        table.passCount = 0;
      }
      table.turnSeat = rtNextSeat(table, seat);
      if (!sync) rtSchedule(table, () => rtStepPlay(table));
      renderRealtime();
      return;
    }

    rtApplyMove(table, entry, hand, move);

    if (hand.length === 0) {
      rtFinishTableBoard(table, seat);
      return;
    }

    table.turnSeat = rtNextSeat(table, seat);
    if (!sync) rtSchedule(table, () => rtStepPlay(table));
    renderRealtime();
  }

  function rtFinishTableBoard(table, winnerSeat) {
    rtClearTimer(table);

    const landlordWon = winnerSeat === table.landlordSeat;
    const otherTeam = table.landlordTeam.id === table.match.teamA.id ? table.match.teamB : table.match.teamA;
    const winnerTeam = landlordWon ? table.landlordTeam : otherTeam;
    const spring = landlordWon && !table.farmerPlayed;
    const multiplier = 1 + table.bombs + (spring ? 1 : 0);
    const points = table.bid * multiplier;

    const players = Object.values(table.seatPlayers).map((entry) => {
      const isLandlord = entry.seat === table.landlordSeat;
      const isIdle = !table.activeOrder.includes(entry.seat);
      const role = isIdle ? 'idle' : isLandlord ? 'landlord' : 'farmer';
      const teamWon = !isIdle && entry.team.id === winnerTeam.id;
      const rawNet = isIdle ? 0 : isLandlord
        ? (teamWon ? points : -points)
        : (teamWon ? points / 2 : -points / 2);

      return {
        seat: entry.seat,
        player: entry.player,
        name: entry.player.name,
        team: entry.team,
        role,
        bid: table.bids[entry.seat] || 0,
        teamWon,
        rawNet
      };
    });

    table.phase = 'done';
    table.result = {
      table: table.index + 1,
      landlordSeat: table.landlordSeat,
      landlordName: table.seatPlayers[table.landlordSeat].player.name,
      landlordTeam: table.landlordTeam,
      landlordWon,
      bid: table.bid,
      multiplier,
      winnerTeam,
      points,
      signedA: winnerTeam.id === table.match.teamA.id ? points : -points,
      players
    };

    rtLogLine(table, `${table.seatPlayers[winnerSeat].player.name} 出完，${winnerTeam.name} 得 ${points} 分`);

    renderRealtime();
    rtCheckBoardDone();
  }

  function rtCheckBoardDone() {
    if (!realtime || realtime.finished || realtime.boardProcessed || realtime.pauseAdvance) return;
    const first = realtime.tables[0];
    const second = realtime.tables[1];
    if (!first.result || !second.result) return;

    realtime.boardProcessed = true;
    const raw = first.result.signedA + second.result.signedA;
    const margin = Math.min(12, Math.abs(raw));
    const pointsA = raw > 0 ? margin : 0;
    const pointsB = raw < 0 ? margin : 0;
    realtime.scoreA += pointsA;
    realtime.scoreB += pointsB;

    ['E', 'S', 'W', 'N'].forEach((seat) => {
      const left = first.result.players.find((entry) => entry.seat === seat);
      const right = second.result.players.find((entry) => entry.seat === seat);
      if (!left || !right || left.role === 'idle' || right.role === 'idle') return;

      const difference = Math.round(left.rawNet - right.rawNet);
      recordPlayer([realtime.gameStats], left.player, left.team, left.role, left.bid, left.teamWon, difference);
      recordPlayer([realtime.gameStats], right.player, right.team, right.role, right.bid, right.teamWon, -difference);
    });

    realtime.boards.push({
      index: realtime.boardIndex,
      table1: first.result,
      table2: second.result,
      pointsA,
      pointsB
    });

    const diff = Math.abs(realtime.scoreA - realtime.scoreB);
    if (season.stageIdx >= 2) {
      const remaining = realtime.plannedBoards - realtime.boards.length;
      if (diff > remaining * 12) {
        rtFinishGame();
        return;
      }
    }

    if (realtime.boards.length < realtime.plannedBoards) {
      rtStartBoard(realtime, realtime.boardIndex + 1);
      return;
    }

    if (diff === 0) {
      realtime.plannedBoards++;
      rtStartBoard(realtime, realtime.boardIndex + 1);
      return;
    }

    rtFinishGame();
  }

  function rtFinishGame() {
    if (!realtime || realtime.finished) return;
    realtime.finished = true;
    realtime.tables.forEach(rtClearTimer);

    mergeStatsMap(realtime.match.stats, realtime.gameStats);
    mergeStatsMap(season.stageStats, realtime.gameStats);
    mergeStatsMap(season.totalStats, realtime.gameStats);

    const match = realtime.match;
    const winner = realtime.scoreA > realtime.scoreB ? match.teamA : match.teamB;
    const game = {
      index: match.games.length + 1,
      boards: realtime.boards,
      scoreA: realtime.scoreA,
      scoreB: realtime.scoreB,
      winner,
      deciding: realtime.deciding,
      plannedBoards: realtime.plannedBoards,
      lineupA: match.activeA.map((player) => player.name),
      lineupB: match.activeB.map((player) => player.name)
    };

    if (winner.id === match.teamA.id) match.winsA++;
    else match.winsB++;
    match.games.push(game);

    if (match.winsA >= match.target || match.winsB >= match.target) {
      match.done = true;
      match.winnerTeam = match.winsA > match.winsB ? match.teamA : match.teamB;
      finalizeMatch(match);
    }

    lastResult = {
      scope: 'game',
      match,
      games: [game],
      stats: realtime.gameStats
    };
    render();
    renderRealtime();
  }

  function rtFinishTableInstant(table) {
    let guard = 0;
    while (table.phase !== 'done' && guard++ < 3000) {
      if (table.phase === 'bidding') rtStepBid(table, true);
      else if (table.phase === 'playing') rtStepPlay(table, true);
      else break;
    }
  }

  function rtResumeTable(table) {
    if (!realtime || realtime.finished || table.result) return;
    if (table.phase === 'bidding') rtSchedule(table, () => rtStepBid(table));
    else if (table.phase === 'playing') rtSchedule(table, () => rtStepPlay(table));
  }

  function beginRealtimeGame() {
    const match = season.currentMatch;
    if (!match || match.done || season.stageEnded || season.finished) return;

    if (match.games.length > 0) maybeSubstitute(match);

    const deciding = season.stageIdx >= 1 &&
      match.winsA === match.target - 1 &&
      match.winsB === match.target - 1;
    const plannedBoards = deciding ? DECIDING_BOARDS : BOARDS_PER_GAME[season.stageIdx];

    realtime = {
      match,
      deciding,
      plannedBoards,
      boardIndex: 0,
      boards: [],
      scoreA: 0,
      scoreB: 0,
      gameStats: createStatsMap(),
      tables: [
        { index: 0, match, seatPlayers: rtBuildSeats(match, 0) },
        { index: 1, match, seatPlayers: rtBuildSeats(match, 1) }
      ],
      view: 0,
      finished: false,
      instant: false,
      notice: ''
    };

    rtResult.hidden = true;
    rtResult.textContent = '';
    rtLog.textContent = '';
    rtNotice.hidden = true;
    openModal(rtModal);
    rtStartBoard(realtime, 0);
  }

  function abortRealtime() {
    if (!realtime) return;
    realtime.tables.forEach(rtClearTimer);
    if (!realtime.finished) {
      tipEl.textContent = '实时模拟已取消。';
      render();
    }
    realtime = null;
  }

  function rtCardChip(card) {
    const chip = document.createElement('span');
    chip.className = 'card-chip';
    chip.textContent = card;
    return chip;
  }

  function rtTeamClass(team, match) {
    return team.id === match.teamA.id ? 'team-a' : 'team-b';
  }

  function rtCardElement(card, occurrence, gold) {
    const suits = ['♠', '♥', '♣', '♦'];
    const element = document.createElement('span');
    element.className = 'rt-card';
    if (gold) element.classList.add('is-bomb');

    let rank = card;
    let suit = suits[occurrence % 4];
    if (card === 'T') rank = '10';
    if (card === 'X') {
      rank = '小';
      suit = '王';
    }
    if (card === 'D') {
      rank = '大';
      suit = '王';
    }

    if (card === 'X' || card === 'D' || suit === '♥' || suit === '♦') {
      element.classList.add('is-red');
    }

    const rankEl = document.createElement('span');
    rankEl.className = 'rt-rank';
    rankEl.textContent = rank;
    const suitEl = document.createElement('span');
    suitEl.className = 'rt-suit';
    suitEl.textContent = suit;
    element.append(rankEl, suitEl);
    return element;
  }

  function rtHandElement(hand, goldRanks, bottomCards) {
    const holder = document.createElement('div');
    holder.className = 'rt-hand';
    const seen = {};
    const bottomCounts = {};
    (bottomCards || []).forEach((card) => {
      bottomCounts[card] = (bottomCounts[card] || 0) + 1;
    });

    sortCards(hand).forEach((card) => {
      seen[card] = (seen[card] || 0) + 1;
      const element = rtCardElement(card, seen[card] - 1, goldRanks && goldRanks.has(card));
      if (bottomCounts[card] > 0) {
        element.classList.add('is-bottom');
        bottomCounts[card]--;
      }
      holder.append(element);
    });
    return holder;
  }

  function bombRanks(hand) {
    const counts = {};
    hand.forEach((card) => {
      counts[card] = (counts[card] || 0) + 1;
    });
    const ranks = new Set();
    Object.keys(counts).forEach((rank) => {
      if (counts[rank] >= 4) ranks.add(rank);
    });
    if (counts.X && counts.D) {
      ranks.add('X');
      ranks.add('D');
    }
    return ranks;
  }

  function rtAvatarWrap(entry, table, match, badge) {
    const wrap = document.createElement('div');
    wrap.className = 'rt-avatar-wrap';

    if (badge) {
      const badgeEl = document.createElement('span');
      badgeEl.className = 'rt-player-badge';
      badgeEl.textContent = badge;
      wrap.append(badgeEl);
    }

    const avatar = document.createElement('div');
    avatar.className = 'rt-avatar';
    const initial = entry.player.name.trim().charAt(0);
    avatar.textContent = initial ? initial.toUpperCase() : '?';
    if (rtTeamClass(entry.team, match) === 'team-a') avatar.classList.add('team-a');
    else avatar.classList.add('team-b');

    const nameBar = document.createElement('div');
    nameBar.className = `rt-name-bar ${rtTeamClass(entry.team, match)}`;
    nameBar.textContent = entry.player.name;

    const teamLine = document.createElement('div');
    teamLine.className = 'rt-team-line';
    teamLine.textContent = entry.team.name;

    wrap.append(avatar, nameBar, teamLine);
    return wrap;
  }

  function rtPlayerRow(entry, table, match, options = {}) {
    const row = document.createElement('div');
    row.className = `rt-player ${rtTeamClass(entry.team, match)}`;
    const activeSeat = table.phase === 'bidding'
      ? table.bidOrder[table.bidCursor]
      : table.turnSeat;
    if (entry.seat === activeSeat) row.classList.add('is-turn');
    if (entry.seat === table.landlordSeat) row.classList.add('is-landlord');

    row.append(rtAvatarWrap(entry, table, match, options.badge));
    if (options.hand) row.append(rtHandElement(options.hand, options.goldRanks, options.bottomCards));
    return row;
  }

  function rtIdlePanel(entry, match) {
    const panel = document.createElement('div');
    panel.className = 'rt-idle-panel';
    panel.append(rtAvatarWrap(entry, null, match, '闲家'));
    const text = document.createElement('p');
    text.className = 'rt-idle-text';
    text.textContent = '等待中';
    panel.append(text);
    return panel;
  }

  function rtBiddingView(table, match) {
    const layout = document.createElement('div');
    layout.className = 'rt-bid-layout';

    const players = document.createElement('div');
    players.className = 'rt-bid-players';

    table.bidOrder.forEach((seat) => {
      const entry = table.seatPlayers[seat];
      const bid = table.bids[seat];
      let badge = '';
      if (bid !== undefined) badge = bid > 0 ? `叫${bid}分` : '不叫';
      else if (table.bidOrder[table.bidCursor] === seat) badge = '思考中';

      players.append(rtPlayerRow(entry, table, match, {
        hand: table.hands[seat],
        goldRanks: bombRanks(table.hands[seat]),
        badge
      }));
    });

    layout.append(players, rtIdlePanel(table.seatPlayers[table.idleSeat], match));
    return layout;
  }

  function rtPlayingView(table, match) {
    const layout = document.createElement('div');
    layout.className = 'rt-play-layout';

    const active = table.activeOrder.map((seat) => table.seatPlayers[seat]);
    const landlord = active.find((entry) => entry.seat === table.landlordSeat);
    const farmers = active.filter((entry) => entry.seat !== table.landlordSeat);
    const multiplier = table.result ? table.result.multiplier : 1 + table.bombs;

    const top = document.createElement('div');
    top.className = 'rt-play-top';
    farmers.forEach((entry) => {
      top.append(rtPlayerRow(entry, table, match, {
        hand: table.hands[entry.seat]
      }));
    });

    const center = document.createElement('div');
    center.className = 'rt-play-center';
    const label = document.createElement('span');
    label.className = 'rt-center-label';
    label.textContent = '上一手';
    center.append(label);
    if (table.lastCards.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'rt-last-empty';
      empty.textContent = '自由出牌';
      center.append(empty);
    } else {
      const lastHand = rtHandElement(table.lastCards, null);
      lastHand.classList.add('rt-last-hand');
      center.append(lastHand);
    }

    const status = document.createElement('p');
    status.className = 'rt-status-line';
    if (table.result) status.textContent = '本桌已结束，等待另一桌…';
    else if (table.turnSeat) status.textContent = `轮到：${table.seatPlayers[table.turnSeat].player.name}`;
    center.append(status);

    if (realtime.boards.length > 0) {
      const previous = realtime.boards[realtime.boards.length - 1];
      const boardScore = document.createElement('p');
      boardScore.className = 'rt-board-score';
      boardScore.textContent = `上一副：${match.teamA.name} +${previous.pointsA} : +${previous.pointsB} ${match.teamB.name}`;
      center.append(boardScore);
    }

    const bottom = document.createElement('div');
    bottom.className = 'rt-play-bottom';
    if (landlord) {
      bottom.append(rtPlayerRow(landlord, table, match, {
        hand: table.hands[landlord.seat],
        bottomCards: table.bottom,
        badge: `叫${table.bid}分 ×${multiplier}`
      }));
    }

    layout.append(top, center, bottom);
    return layout;
  }

  function renderRealtime() {
    if (!realtime) return;

    const match = realtime.match;
    rtScore.textContent = '';

    const scorebar = document.createElement('div');
    scorebar.className = 'rt-scorebar';

    const left = document.createElement('div');
    left.className = 'rt-score-team team-a';
    const leftName = document.createElement('span');
    leftName.className = 'rt-score-name';
    leftName.textContent = match.teamA.name;
    const leftScore = document.createElement('strong');
    leftScore.textContent = realtime.scoreA;
    left.append(leftName, leftScore);

    const middle = document.createElement('div');
    middle.className = 'rt-score-mid';
    middle.textContent = `第 ${realtime.boardIndex + 1} 副 / 共 ${realtime.plannedBoards} 副`;

    const right = document.createElement('div');
    right.className = 'rt-score-team team-b';
    const rightScore = document.createElement('strong');
    rightScore.textContent = realtime.scoreB;
    const rightName = document.createElement('span');
    rightName.className = 'rt-score-name';
    rightName.textContent = match.teamB.name;
    right.append(rightScore, rightName);

    scorebar.append(left, middle, right);
    rtScore.append(scorebar);

    document.querySelectorAll('.rt-tab').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.rtTable) === realtime.view);
    });

    const viewed = realtime.tables[realtime.view];
    const other = realtime.tables[realtime.view === 0 ? 1 : 0];
    if (!viewed.result && other.result) {
      realtime.notice = `另一桌完成：地主 ${other.result.landlordName}（${other.result.landlordTeam.name}），${other.result.winnerTeam.name} ${other.result.landlordWon ? '地主胜' : '农民胜'}，得 ${other.result.points} 分。`;
    } else if (viewed.result && !other.result) {
      realtime.notice = '本桌已完成，等待另一桌…';
    } else {
      realtime.notice = '';
    }

    rtNotice.hidden = !realtime.notice;
    rtNotice.textContent = realtime.notice;
    rtFastBoard.disabled = realtime.finished;
    rtFastGame.disabled = realtime.finished;

    rtTableView.textContent = '';
    const table = realtime.tables[realtime.view];
    if (table.phase === 'bidding') {
      rtTableView.append(rtBiddingView(table, match));
    } else {
      rtTableView.append(rtPlayingView(table, match));
    }

    rtLog.textContent = table.log.slice(-5).join('\n');

    if (realtime.finished) showRealtimeResult();
    else rtResult.hidden = true;
  }

  function showRealtimeResult() {
    if (!realtime || !realtime.finished) return;

    rtResult.hidden = false;
    rtResult.textContent = '';

    const match = realtime.match;
    const game = match.games[match.games.length - 1];
    const title = document.createElement('p');
    title.className = 'qy-result-title';
    title.textContent = `第 ${game.index} 局结束：${match.teamA.name} ${realtime.scoreA} : ${realtime.scoreB} ${match.teamB.name}`;

    const sub = document.createElement('p');
    sub.className = 'qy-result-sub';
    sub.textContent = `${game.winner.name} 获胜 · ${realtime.boards.length} 副 · ${realtime.gameStats.size} 名选手出场`;

    const actions = document.createElement('div');
    actions.className = 'rt-result-actions';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn btn-small';
    back.textContent = '返回主页面';
    back.addEventListener('click', () => {
      closeModal(rtModal);
      realtime = null;
      render();
    });
    actions.append(back);

    if (!match.done) {
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn btn-small';
      next.textContent = '继续下一局实时观看';
      next.addEventListener('click', () => {
        realtime = null;
        beginRealtimeGame();
      });
      actions.append(next);

      const finish = document.createElement('button');
      finish.type = 'button';
      finish.className = 'btn btn-small btn-primary';
      finish.textContent = '模拟结束本场';
      finish.addEventListener('click', () => {
        closeModal(rtModal);
        realtime = null;
        simulateWholeMatch();
        render();
      });
      actions.append(finish);
    }

    rtResult.append(title, sub, actions);
  }

  function rtSwitchTable(index) {
    if (!realtime) return;
    realtime.view = index;
    renderRealtime();
  }

  realtimeBtn.addEventListener('click', beginRealtimeGame);
  document.querySelectorAll('.rt-tab').forEach((button) => {
    button.addEventListener('click', () => rtSwitchTable(Number(button.dataset.rtTable)));
  });

  rtFastBoard.addEventListener('click', () => {
    if (!realtime || realtime.finished) return;
    realtime.instant = true;
    realtime.pauseAdvance = true;
    realtime.tables.forEach(rtClearTimer);
    rtFinishTableInstant(realtime.tables[0]);
    rtFinishTableInstant(realtime.tables[1]);
    realtime.pauseAdvance = false;
    realtime.instant = false;
    rtCheckBoardDone();
    if (realtime && !realtime.finished) realtime.tables.forEach(rtResumeTable);
    renderRealtime();
  });

  rtFastGame.addEventListener('click', () => {
    if (!realtime || realtime.finished) return;
    realtime.instant = true;
    realtime.tables.forEach(rtClearTimer);
    let guard = 0;
    while (realtime && !realtime.finished && guard++ < 500) {
      realtime.pauseAdvance = true;
      rtFinishTableInstant(realtime.tables[0]);
      rtFinishTableInstant(realtime.tables[1]);
      realtime.pauseAdvance = false;
      rtCheckBoardDone();
    }
    realtime.instant = false;
    if (realtime && !realtime.finished) realtime.tables.forEach(rtResumeTable);
    renderRealtime();
  });

  rtClose.addEventListener('click', abortRealtime);
  rtModal.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) abortRealtime();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !rtModal.hidden) abortRealtime();
  });

  singleBtn.addEventListener('click', simulateSingleGame);
  wholeBtn.addEventListener('click', simulateWholeMatch);
  nextBtn.addEventListener('click', advanceMatch);
  summaryBtn.addEventListener('click', openSummary);
  summaryAction.addEventListener('click', handleSummaryAction);

  restartBtn.addEventListener('click', () => openModal(restartModal));
  restartConfirm.addEventListener('click', resetSeason);

  sandboxToggle.addEventListener('change', () => {
    if (sandboxToggle.checked) openSandboxEditor();
    else exitSandbox();
  });
  sandboxEditBtn.addEventListener('click', openSandboxEditor);
  sandboxApplyBtn.addEventListener('click', applySandbox);
  sandboxCancelBtn.addEventListener('click', cancelSandbox);
  sandboxAddTeamBtn.addEventListener('click', () => {
    if (!sandboxDraft) return;

    sandboxDraft.push({
      name: `新战队${sandboxDraft.length + 1}`,
      seed: false,
      id: sandboxDraft.length,
      players: []
    });
    renderSandboxEditor(sandboxDraft.length - 1);
  });

  updateSandboxBar();
  resetSeason();
})();

(() => {
  'use strict';

  const SHANHAI_MODE = document.body.dataset.game === 'shanhai';
  const SHANHAI_SEASON_MODE = SHANHAI_MODE && document.body.dataset.season === 'true';
  const ERA_MODE = document.body.dataset.era === 'true';
  const ERA_START_YEAR = 2025;
  const ERA_END_YEAR = 2050;
  const DATA = SHANHAI_MODE ? window.SHANHAI_DATA : window.QINGYUN_DATA;
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
  const SHANHAI_STAGE_NAMES = [
    '小组赛第一赛段 · 32 进 24',
    '小组赛第二赛段 · 24 进 16',
    '淘汰赛 · 16 强',
    '淘汰赛 · 八强',
    '淘汰赛 · 半决赛',
    '三四名决赛',
    '冠军赛'
  ];
  const SHANHAI_EVENT_DEFS = [
    { label: '春季赛', start: [2026, 3, 1, 15, 0] },
    { label: '秋季赛', start: [2026, 7, 1, 15, 0] },
    { label: '总决赛', start: [2026, 11, 1, 15, 0] }
  ];
  const SHANHAI_SEASON_START = [2026, 2, 1, 9, 0];
  const SEASON_EVENT_DEFS = [
    { label: '春季赛', start: [2026, 2, 1, 15, 0] },
    { label: '夏季赛', start: [2026, 4, 1, 15, 0] },
    { label: '秋季赛', start: [2026, 6, 1, 15, 0] },
    { label: '冬季赛', start: [2026, 8, 1, 15, 0] },
    { label: '总决赛', start: [2026, 10, 1, 15, 0] }
  ];
  const SEASON_MIN_REST_MS = 20 * 24 * 60 * 60 * 1000;
  const SEASON_MATCHES_PER_DAY = 4;
  const SEASON_MODE = Boolean(document.getElementById('qy-season-bar'));
  const SAVE_MODE = SHANHAI_SEASON_MODE
    ? (ERA_MODE ? 'shanhai-era' : 'shanhai-season')
    : (SEASON_MODE ? (ERA_MODE ? 'qingyun-era' : 'qingyun-season') : null);

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
  const simStageBtn = document.getElementById('qy-sim-stage');
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
  const seasonEventsEl = document.getElementById('qy-season-events');
  const seasonSeedNote = document.getElementById('qy-season-seed-note');
  const seasonSummaryBtn = document.getElementById('qy-season-summary');
  const seasonClockEl = document.getElementById('qy-clock');
  const seasonAdvanceBtn = document.getElementById('qy-advance');
  const seasonNoticeListEl = document.getElementById('qy-notice-list');
  const seasonNoticeSummaryEl = document.getElementById('qy-notice-summary');
  const eraYearsEl = document.getElementById('era-years');
  const eraCurrentEl = document.getElementById('era-current');
  const eraNoteEl = document.getElementById('era-note');
  const shanhaiGroupsEl = document.getElementById('sh-groups');
  const shanhaiGroupsDetailsEl = document.getElementById('sh-groups-details');
  const shanhaiSeasonEventsEl = document.getElementById('sh-season-events');
  const shanhaiSeasonNoteEl = document.getElementById('sh-season-note');
  const shanhaiSeasonSummaryBtn = document.getElementById('sh-season-summary');
  const shanhaiClockEl = document.getElementById('sh-clock');
  const shanhaiAdvanceBtn = document.getElementById('sh-advance');
  const shanhaiNoticeListEl = document.getElementById('sh-notice-list');
  const shanhaiNoticeSummaryEl = document.getElementById('sh-notice-summary');
  const saveExportBtn = document.getElementById('qy-save-export');
  const saveImportBtn = document.getElementById('qy-save-import');
  const saveFileInput = document.getElementById('qy-save-file');
  const saveStatusEl = document.getElementById('qy-save-status');
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
  let seasonCup = null;
  let shanhai = null;
  let shanhaiCup = null;
  let era = null;
  let lastResult = null;
  let lastSummary = null;
  let bulkSimulating = false;
  let lastSavedSignature = '';

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
    if (SHANHAI_MODE) {
      list.forEach((team) => {
        team.seed = false;
        team.seedBonus = 0;
        team.players.forEach((player) => {
          if (Number.isFinite(player.strength)) return;
          let strength = 55 + (hash(`${player.account}:${player.name}:shanhai`) % 31);
          if (player.gold) strength += 3 + (hash(`${player.account}:gold`) % 3);
          player.strength = strength;
        });
      });
      return;
    }

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

  function createMatch(teamA, teamB, format, label, options = {}) {
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
      winnerTeam: null,
      boardsPerGame: options.boardsPerGame,
      decidingBoards: options.decidingBoards,
      allowDraw: Boolean(options.allowDraw),
      groupId: options.groupId || null,
      tiebreak: Boolean(options.tiebreak),
      startTime: null
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

  function chooseBid(entry, hand, highestBid, bidIndex, reason) {
    const highCards = hand.filter((card) => card === '2' || card === 'X' || card === 'D').length;
    const structure = handStructure(hand);
    const moves = estimateMoves(hand);
    const desire = handPower(hand) +
      (entry.player.strength - 70) * 0.35 +
      (Math.random() - 0.5) * 6 +
      highCards * 2 -
      Math.max(0, moves - 8) * 0.5 +
      structure.bombs * 1.5;

    let bid = 0;
    if (desire >= 14) bid = 3;
    else if (desire >= 8) bid = 2;
    else if (desire >= 2) bid = 1;

    let note = '';
    if (highCards >= 4) {
      bid = 3;
      note = '大牌齐全';
    } else if (desire >= 14) {
      note = '牌力强势';
    } else if (moves <= 6) {
      note = '牌型整齐';
    } else if (structure.bombs > 0) {
      note = '炸弹坐镇';
    } else if (desire >= 8) {
      note = '牌力不错';
    } else if (desire >= 2) {
      note = '试探叫分';
    } else {
      note = '牌散不叫';
    }

    if (bidIndex === 1) {
      if (highestBid === 2 && desire >= 8) {
        bid = 3;
        note = '第二家压制';
      } else if (desire >= 6) {
        bid = Math.max(bid, 2);
        if (bid > 0) note = '第二家跟叫';
      }
      if (desire >= 11 && highestBid < 3) {
        bid = 3;
        note = '第二家反超';
      }
    }

    if (bid <= highestBid) {
      bid = 0;
      note = highestBid > 0 ? '跟价不划算' : note;
    }

    if (reason) reason.text = bid > 0 ? `${note}，叫 ${bid} 分` : note;
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

    const rankRuns = (minCount, minLength) => {
      let runs = 0;
      let length = 0;
      RANKS.slice(0, -1).forEach((rank) => {
        if ((counts[rank] || 0) >= minCount) length++;
        else {
          if (length >= minLength) runs++;
          length = 0;
        }
      });
      if (length >= minLength) runs++;
      return runs;
    };

    let singles = 0;
    let pairs = 0;
    let bombs = 0;
    Object.values(counts).forEach((count) => {
      if (count === 1) singles++;
      if (count === 2) pairs++;
      if (count >= 4) bombs++;
    });
    if (counts.X && counts.D) bombs++;

    return {
      singles,
      pairs,
      bombs,
      sequences: rankRuns(1, 5),
      pairRuns: rankRuns(2, 3),
      planeRuns: rankRuns(3, 2)
    };
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

  function structureBreakCost(before, after) {
    let cost = Math.max(0, before.sequences - after.sequences) * 12;
    cost += Math.max(0, before.pairRuns - after.pairRuns) * 8;
    cost += Math.max(0, before.planeRuns - after.planeRuns) * 15;
    return cost;
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
    score += structureBreakCost(before, after);
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
    score += structureBreakCost(before, after);
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

  function selectMoveByRules(table, seat, hand, moves, nextSeat, reason) {
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
            if (reason) reason.text = '下家队友报单，送小单';
            return singles[0];
          }
        } else {
          const nonSingles = leadMoves.filter((move) => move.type !== 'single');
          if (nonSingles.length > 0) {
            leadMoves = nonSingles;
            if (reason) reason.text = '下家对手报单，封住单张';
          } else {
            const singles = leadMoves.filter((move) => move.type === 'single');
            singles.sort((a, b) => moveTopValue(b) - moveTopValue(a));
            if (reason) reason.text = '只能出单，顶大牌';
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
        if (bombs.length > 0) {
          if (reason) reason.text = '对手报双，炸弹控场';
          return bombs[0];
        }
        const singles = leadMoves.filter((move) => move.type === 'single');
        if (singles.length > 0) {
          singles.sort((a, b) => moveTopValue(b) - moveTopValue(a));
          if (reason) reason.text = '对手报双，顶住牌权';
          return singles[0];
        }
      }

      const finish = moves.find((move) => move.cards.length === hand.length);
      if (finish) {
        if (reason) reason.text = '一手走完';
        return finish;
      }

      if (reason && !reason.text) {
        reason.text = hand.length <= 6 ? '残局整理手数' : '弱牌开路';
      }
      return pickBestMove(leadMoves, hand, entry.player.strength, false);
    }

    let candidates = moves.filter((move) => beats(table.lastPlay, move));
    if (candidates.length === 0) {
      if (reason) reason.text = '管不上，保留牌力';
      return null;
    }
    if (!table.lastPlayer) {
      if (reason) reason.text = '正常跟牌';
      return pickBestMove(candidates, hand, entry.player.strength, true);
    }

    const lastEntry = table.seatPlayers[table.lastPlayer.seat];
    const ally = lastEntry && lastEntry.team.id === entry.team.id;
    const lastLeft = lastEntry ? (table.hands[lastEntry.seat] || []).length : 99;

    if (ally) {
      if (lastLeft <= 4 && hand.length - table.lastCards.length > 4) {
        if (reason) reason.text = '队友快走，主动让牌';
        return null;
      }

      const finish = candidates.find((move) => move.cards.length === hand.length);
      if (finish) {
        if (reason) reason.text = '接队友牌，一手走完';
        return finish;
      }

      const nonBomb = candidates.filter((move) => move.type !== 'bomb' && move.type !== 'rocket');
      if (nonBomb.length === 0) {
        if (reason) reason.text = '不用炸弹压队友';
        return null;
      }

      const best = pickBestMove(nonBomb, hand, entry.player.strength, true);
      if (!best) {
        if (reason) reason.text = '不抢队友牌权';
        return null;
      }

      const groups = handGroupCount(hand);
      if (groups <= 2) {
        if (reason) reason.text = '整理最后一手';
        return best;
      }

      const before = handStructure(hand);
      const after = handStructure(cardsWithout(hand, best.cards));
      const improved = before.singles - after.singles;
      if (moveTopValue(best) <= 14 && improved >= 1) {
        if (reason) reason.text = '顺队友牌整理手牌';
        return best;
      }

      const weakFumble = entry.player.strength < 65 && Math.random() < 0.16;
      if (reason) reason.text = weakFumble ? '试探跟牌' : '不抢队友牌权';
      return weakFumble ? best : null;
    }

    if (table.lastPlay.type === 'rocket') {
      if (reason) reason.text = '王炸不管';
      return null;
    }

    const finish = candidates.find((move) => move.cards.length === hand.length);
    if (finish) {
      if (reason) reason.text = '一手走完';
      return finish;
    }

    const normal = candidates.filter((move) => move.type !== 'bomb' && move.type !== 'rocket');

    if (normal.length > 0) {
      if (lastLeft <= 3) {
        normal.sort((a, b) => moveTopValue(b) - moveTopValue(a));
        if (reason) reason.text = '对手临门，顶大牌';
        return normal[0];
      }
      if (reason) reason.text = '压住敌方牌权';
      return pickBestMove(normal, hand, entry.player.strength, true);
    }

    const lastValue = moveTopValue(table.lastPlay);
    const allowBomb = lastLeft <= 3 ||
      table.lastCards.length > 3 ||
      lastValue >= 14 ||
      hand.length <= 6 ||
      table.lastPlay.type === 'bomb' ||
      table.lastPlay.type === 'rocket';

    if (!allowBomb) {
      if (reason) reason.text = '炸弹留到关键手';
      return null;
    }

    const bombs = [...candidates].sort((a, b) => moveTopValue(a) - moveTopValue(b));
    if (reason) reason.text = '关键手用炸弹抢牌权';
    return bombs[0] || null;
  }

  function chooseRealtimeMove(table, seat, hand, moves, reason) {
    return selectMoveByRules(table, seat, hand, moves, rtNextSeat, reason);
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

  function searchRealtimeMove(table, seat, moves, reason) {
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

    if (reason) {
      if (!bestMove) reason.text = '推演后选择不出，保留牌权';
      else if (bestMove.cards.length === hand.length) reason.text = '一手走完';
      else reason.text = '推演后选择胜率更高的牌';
    }

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
      !match.allowDraw &&
      season.stageIdx >= 1 &&
      match.winsA === match.target - 1 &&
      match.winsB === match.target - 1;
    const boardsPerGame = match.boardsPerGame || BOARDS_PER_GAME[season.stageIdx];
    const decidingBoards = match.decidingBoards || DECIDING_BOARDS;
    const plannedBoards = deciding ? decidingBoards : boardsPerGame;

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
      if (!SHANHAI_MODE && season.stageIdx >= 2 && Math.abs(scoreA - scoreB) > remaining * 12) break;
    }

    if (!match.allowDraw) {
      let extra = 0;
      while (scoreA === scoreB) {
        const board = playBoard(match, match.games.length, plannedBoards + extra, maps);
        boards.push(board);
        scoreA += board.pointsA;
        scoreB += board.pointsB;
        extra++;
        if (extra >= 12) break;
      }
    }

    const winner = scoreA === scoreB ? null : (scoreA > scoreB ? match.teamA : match.teamB);
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
    else if (winner === match.teamB) match.winsB++;

    match.games.push(game);
    if (SHANHAI_SEASON_MODE) shAdvanceClockForGame(game, match);
    if (SEASON_MODE) qyAdvanceClockForGame(game, match);

    const matchComplete =
      match.winsA >= match.target ||
      match.winsB >= match.target ||
      (match.allowDraw && match.games.length >= match.formatN);

    if (matchComplete) {
      match.done = true;
      match.winnerTeam = match.winsA > match.winsB ? match.teamA : (match.winsB > match.winsA ? match.teamB : null);
      if (match.groupId) shFinalizeGroupMatch(match);
      else finalizeMatch(match);
      if (SHANHAI_SEASON_MODE) shSyncClockToNextScheduledTime(match);
      if (SEASON_MODE) qySyncClockToNextScheduledTime(match);
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
    qyScheduleRound(season.round);
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
    if (!match) return;

    const time = match.startTime || season.round?.time;
    if (SEASON_MODE && seasonCup && time && (!seasonCup.clock || time > seasonCup.clock)) {
      seasonCup.clock = new Date(time);
    }
    if (!SHANHAI_SEASON_MODE || !shanhaiCup) return;
    if (time && (!shanhaiCup.clock || time > shanhaiCup.clock)) {
      shanhaiCup.clock = new Date(time);
    }
  }

  function assignTeamRank(team, rank) {
    if (team) season.teamRankings.set(team.id, rank);
  }

  function rankEliminatedTeams(startRank) {
    const eliminated = season.stageTeams
      .filter((team) => season.eliminated.has(team.id))
      .sort((a, b) => compareMetrics(metricFor(a), metricFor(b)));
    eliminated.forEach((team, index) => assignTeamRank(team, startRank + index));
  }

  function recordStageRankings() {
    const idx = season.stageIdx;

    if (idx === 0) {
      rankEliminatedTeams(17);
    } else if (idx === 1) {
      rankEliminatedTeams(9);
    } else if (idx === 2) {
      const bracket = season.bracket || {};
      assignTeamRank(bracket.cBingLoser, 8);
      assignTeamRank(bracket.dLoser, 7);
      assignTeamRank(bracket.fXinLoser, 6);
      assignTeamRank(bracket.gLoser, 5);
    } else if (idx === 3) {
      const bracket = season.bracket || {};
      assignTeamRank(bracket.fourThreeLoser, 4);
      assignTeamRank(bracket.loserFinalLoser, 3);
    } else if (idx === 4) {
      assignTeamRank(season.champion, 1);
      assignTeamRank(season.runnerUp, 2);
    }
  }

  function rankingLabel(rank) {
    if (!rank) return '—';
    if (rank === 1) return '冠军';
    if (rank === 2) return '亚军';
    if (rank === 3) return '季军';
    if (rank === 4) return '殿军';
    if (rank <= 8) return '八强';
    if (rank <= 16) return '十六强';
    if (SHANHAI_MODE && rank <= 24) return '小组赛第二赛段淘汰';
    return SHANHAI_MODE ? '小组赛第一赛段淘汰' : '第一赛段淘汰';
  }

  function teamRankingsTable() {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['最终名次', '战队', '最终成绩'].forEach((label) => headRow.append(headerCell(label)));
    head.append(headRow);

    const body = document.createElement('tbody');
    teams
      .map((team) => ({ team, rank: season.teamRankings.get(team.id) }))
      .sort((a, b) => (a.rank || 999) - (b.rank || 999) || a.team.name.localeCompare(b.team.name))
      .forEach(({ team, rank }) => {
        const row = document.createElement('tr');
        row.append(
          tableCell(rank ? `第 ${rank} 名` : '—', 'qy-strong'),
          tableCell(team.name),
          tableCell(rankingLabel(rank), rank && rank <= 4 ? 'qy-win' : '')
        );
        body.append(row);
      });

    table.append(head, body);
    return table;
  }

  function finishStage() {
    recordStageRankings();
    season.stageEnded = true;
    season.currentMatch = null;

    if (season.stageIdx === 4) {
      season.finished = true;
      if (SEASON_MODE) {
        captureSeasonEvent();
        if (ERA_MODE) recordEraYear();
        if (!seasonCup.finished) {
          seasonCup.idle = true;
          seasonCup.idleStart = new Date(seasonCup.clock);
          seasonCup.idleNext = seasonCup.currentIndex + 1;
        } else {
          seasonCup.idle = false;
          seasonCup.idleStart = null;
          seasonCup.idleNext = null;
        }
      }
      render();

      if (SEASON_MODE) {
        const event = seasonCup.events[seasonCup.currentIndex];
        if (seasonCup.finished) {
          tipEl.textContent = '总决赛结束，已生成本赛季成绩汇总。';
          lastSummary = { kind: 'season', stats: seasonCup.totalStats, title: '青云杯 · 赛季成绩汇总' };
          summaryBtn.textContent = '赛季汇总';
          summaryBtn.hidden = false;
          openSeasonSummary();
        } else {
          tipEl.textContent = `${event.label}结束，进入休赛期，可查看汇总后推进到下一届。`;
          lastSummary = {
            kind: 'overall',
            stats: season.totalStats,
            title: `${event.label} · 选手数据汇总`
          };
          summaryBtn.textContent = '本届汇总';
          summaryBtn.hidden = false;
          openSummary();
        }
        return;
      }

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
    qyScheduleRound(season.round);
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

    qyScheduleRound(season.round);
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

    qyScheduleRound(season.round);
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
      qyScheduleRound(season.round);
      setCurrentMatch(season.round.matches[0]);
      render();
    } else {
      season.stageTeams = [...season.finalists];
      season.roundUsed = new Set();
      season.round = {
        label: '决赛',
        matches: [createMatch(season.finalists[0], season.finalists[1], 'BO7', '决赛')]
      };
      qyScheduleRound(season.round);
      setCurrentMatch(season.round.matches[0]);
      render();
    }

    tipEl.textContent = `${STAGE_NAMES[season.stageIdx]} 开始，每局 ${BOARDS_PER_GAME[stageIdx]} 副${stageIdx >= 1 ? `，决胜局 ${DECIDING_BOARDS} 副` : ''}，对阵已随机分配。`;
    render();
  }

  function createSeasonState() {
    return {
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
      teamRankings: new Map(),
      stageEnded: false,
      finished: false,
      currentMatch: null,
      round: null
    };
  }

  function resetSeason() {
    closeModal(summaryModal);
    closeModal(restartModal);
    prepareTeams(teams, preserveStrengths);
    season = createSeasonState();
    lastResult = null;
    lastSummary = null;
    startStage(0);
  }

  function shDate(parts) {
    return new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, 0, 0);
  }

  function shEventDate(index, year = null) {
    const def = SHANHAI_EVENT_DEFS[index] || SHANHAI_EVENT_DEFS[0];
    const targetYear = year ?? (ERA_MODE && era ? era.currentYear : 2026);
    return new Date(
      targetYear,
      def.start[1],
      def.start[2],
      def.start[3] || 0,
      def.start[4] || 0,
      0,
      0
    );
  }

  function shAddMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  function shFormatDate(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function shGameMinutes(boards) {
    if (boards >= 32) return 68 + randomInt(-10, 10);
    if (boards >= 20) return 45 + randomInt(-10, 10);
    return 18 + randomInt(-5, 5);
  }

  function shNextDayAt(date, hour) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
    if (next <= date) next.setDate(next.getDate() + 1);
    return next;
  }

  function shGroupMatchTime(stageStart, matchIndex) {
    const dayOffset = Math.floor(matchIndex / 4);
    const hour = matchIndex % 4 < 2 ? 15 : 20;
    return new Date(
      stageStart.getFullYear(),
      stageStart.getMonth(),
      stageStart.getDate() + dayOffset,
      hour,
      0,
      0,
      0
    );
  }

  function shAdvanceClockForGame(game, match) {
    if (!SHANHAI_SEASON_MODE || !shanhaiCup) return;

    const start = match.lastEndTime
      ? shAddMinutes(match.lastEndTime, 10)
      : new Date(match.startTime || shanhaiCup.clock);

    const end = shAddMinutes(start, shGameMinutes(game.plannedBoards));
    match.lastEndTime = end;
    if (!shanhaiCup.clock || end > shanhaiCup.clock) shanhaiCup.clock = end;
  }

  function shSyncClockToNextScheduledTime(match) {
    if (!SHANHAI_SEASON_MODE || !shanhaiCup || !season.round) return;

    const round = season.round;
    const index = round.matches.indexOf(match);
    if (index < 0) return;

    let nextTime = null;
    if (shanhai.phase === 'knockout') {
      const nextMatch = round.matches[index + 1];
      if (nextMatch && nextMatch.startTime) nextTime = nextMatch.startTime;
    } else if (match.startTime) {
      const slotTime = match.startTime.getTime();
      const slotMatches = round.matches.filter((item) => item.startTime && item.startTime.getTime() === slotTime);
      if (slotMatches.every((item) => item.done)) {
        const nextMatch = round.matches.find((item) => item.startTime && item.startTime > match.startTime);
        if (nextMatch) {
          nextTime = nextMatch.startTime;
        } else if (shanhai.roundIndex < shanhai.rounds.length - 1) {
          nextTime = shanhai.rounds[shanhai.roundIndex + 1].matches[0]?.startTime || null;
        }
      }
    }

    if (nextTime) shanhaiCup.clock = new Date(nextTime);
  }

  function qyEventDate(index, year = null) {
    const def = SEASON_EVENT_DEFS[index] || SEASON_EVENT_DEFS[0];
    const targetYear = year ?? (ERA_MODE && era ? era.currentYear : 2026);
    return new Date(
      targetYear,
      def.start[1],
      def.start[2],
      def.start[3] || 0,
      def.start[4] || 0,
      0,
      0
    );
  }

  function qyNextEventStart(index, year = null) {
    const fixed = qyEventDate(index, year);
    if (!seasonCup?.clock) return fixed;
    const earliest = new Date(seasonCup.clock.getTime() + SEASON_MIN_REST_MS);
    return fixed > earliest ? fixed : earliest;
  }

  function qyGameMinutes(boards) {
    if (boards >= 20) return 48 + randomInt(-8, 8);
    if (boards >= 16) return 36 + randomInt(-6, 6);
    return 28 + randomInt(-6, 6);
  }

  function qyMatchTime(base, index) {
    const dayOffset = Math.floor(index / SEASON_MATCHES_PER_DAY);
    const hour = index % SEASON_MATCHES_PER_DAY < 2 ? 15 : 20;
    return new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate() + dayOffset,
      hour,
      0,
      0,
      0
    );
  }

  function qyScheduleRound(round, start = null) {
    if (!SEASON_MODE || !seasonCup || !round) return;

    const source = start || seasonCup.clock;
    const base = new Date(source.getFullYear(), source.getMonth(), source.getDate(), 15, 0, 0, 0);
    if (base < source) base.setDate(base.getDate() + 1);
    round.matches.forEach((match, index) => {
      if (!match.startTime) match.startTime = qyMatchTime(base, index);
    });
    round.time = round.matches[0]?.startTime || base;
  }

  function qyAdvanceClockForGame(game, match) {
    if (!SEASON_MODE || !seasonCup) return;

    const scheduled = match.startTime ? match.startTime.getTime() : 0;
    const start = match.lastEndTime
      ? shAddMinutes(match.lastEndTime, 10)
      : new Date(Math.max(scheduled, seasonCup.clock.getTime()));
    const end = shAddMinutes(start, qyGameMinutes(game.plannedBoards));
    match.lastEndTime = end;
    if (!seasonCup.clock || end > seasonCup.clock) seasonCup.clock = end;
  }

  function qySyncClockToNextScheduledTime(match) {
    if (!SEASON_MODE || !seasonCup || !season.round) return;

    const nextMatch = season.round.matches
      .filter((item) => !item.done && item.startTime && item.startTime > seasonCup.clock)
      .sort((a, b) => a.startTime - b.startTime)[0];
    if (nextMatch) seasonCup.clock = new Date(nextMatch.startTime);
  }

  function qyAddNotice(date, text) {
    if (!seasonCup) return;
    seasonCup.notifications.push({ time: new Date(date), text });
    if (seasonCup.notifications.length > 300) seasonCup.notifications.shift();
  }

  function qyRunTraining(date, type, teamList) {
    const boosted = [];
    teamList.forEach((team) => {
      if (Math.random() >= 0.1) return;
      team.players.forEach((player) => {
        player.strength += 1;
      });
      boosted.push(team.name);
    });

    const names = teamList.map((team) => team.name).join(' vs ');
    const label = type === 'intra' ? '队内训练赛' : '两队训练赛';
    const result = boosted.length > 0
      ? `${boosted.join('、')} 全员实力 +1`
      : '本次训练未触发实力提升';
    qyAddNotice(date, `${label} · ${names}：${result}。`);
  }

  function qyProcessTrainingUntil(nextStart) {
    if (!seasonCup) return;

    let cursor = new Date(seasonCup.clock);
    cursor.setHours(10, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);

    while (cursor < nextStart) {
      const day = new Date(cursor);
      day.setHours(10 + randomInt(0, 6), randomInt(0, 59), 0, 0);
      if (day < nextStart) {
        if (Math.random() < 0.5) {
          qyRunTraining(day, 'intra', [teams[randomInt(0, teams.length - 1)]]);
        } else {
          const firstIndex = randomInt(0, teams.length - 1);
          let secondIndex = randomInt(0, teams.length - 2);
          if (secondIndex >= firstIndex) secondIndex++;
          qyRunTraining(day, 'inter', [teams[firstIndex], teams[secondIndex]]);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    seasonCup.clock = new Date(nextStart);
  }

  function shBlankGroupRecord(team) {
    return {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      net: 0,
      tieWins: 0,
      tieNet: 0
    };
  }

  function shCompareGroupRecords(a, b) {
    return b.points - a.points || b.net - a.net || b.tieWins - a.tieWins || b.tieNet - a.tieNet || a.team.name.localeCompare(b.team.name);
  }

  function shSortedGroupRecords(group) {
    return [...group.records.values()].sort(shCompareGroupRecords);
  }

  function shRoundRobin(teams) {
    const list = [...teams];
    if (list.length % 2 === 1) list.push(null);
    const rounds = [];
    const count = list.length;

    for (let round = 0; round < count - 1; round++) {
      const pairs = [];
      for (let i = 0; i < count / 2; i++) {
        const a = list[i];
        const b = list[count - 1 - i];
        if (a && b) pairs.push([a, b]);
      }
      rounds.push(pairs);

      const fixed = list[0];
      const rest = list.slice(1);
      rest.unshift(rest.pop());
      list.splice(0, list.length, fixed, ...rest);
    }

    return rounds;
  }

  function shDoubleRoundRobin(teams) {
    const first = shRoundRobin(teams);
    const second = first.map((round) => round.map(([a, b]) => [b, a]));
    return [...first, ...second];
  }

  function shBuildGroups(stageIdx) {
    const groupCount = stageIdx === 0 ? 8 : 4;
    const groupSize = stageIdx === 0 ? 4 : 6;
    const advancing = stageIdx === 0 ? 3 : 4;
    const ids = stageIdx === 0 ? 'ABCDEFGH' : 'IJKL';
    const shuffled = shuffle(season.stageTeams);
    const groups = [];

    for (let i = 0; i < groupCount; i++) {
      const groupTeams = shuffled.slice(i * groupSize, (i + 1) * groupSize);
      const group = {
        id: ids[i],
        teams: groupTeams,
        advancing,
        records: new Map(),
        pairings: shDoubleRoundRobin(groupTeams),
        tiebreaks: []
      };
      groupTeams.forEach((team) => group.records.set(team.id, shBlankGroupRecord(team)));
      groups.push(group);
    }

    return groups;
  }

  function shCreateGroupRounds(groups, stageIdx, stageStart) {
    const roundCount = groups[0].pairings.length;
    const rounds = [];
    let matchIndex = 0;

    for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
      season.roundUsed = new Set();
      const matches = [];
      const slots = groups[0].pairings[roundIndex].length;
      for (let slot = 0; slot < slots; slot++) {
        groups.forEach((group) => {
          const pair = group.pairings[roundIndex][slot];
          if (!pair) return;
          const [teamA, teamB] = pair;
          const match = createMatch(teamA, teamB, 'BO1', `${group.id}组 · 第${roundIndex + 1}轮`, {
            boardsPerGame: 32,
            decidingBoards: 8,
            allowDraw: true,
            groupId: group.id
          });
          match.startTime = SHANHAI_SEASON_MODE ? shGroupMatchTime(stageStart, matchIndex) : null;
          matchIndex++;
          matches.push(match);
        });
      }

      rounds.push({
        label: `第 ${roundIndex + 1} 轮`,
        matches,
        time: matches[0]?.startTime || null
      });
    }

    return rounds;
  }

  function shStartGroupStage(stageIdx) {
    if (shanhaiGroupsDetailsEl) shanhaiGroupsDetailsEl.open = false;
    lastSummary = null;
    season.stageIdx = stageIdx;
    season.stageEnded = false;
    season.finished = false;
    season.roundUsed = new Set();
    season.stageStats = createStatsMap();
    season.metrics = new Map();
    shanhai.phase = stageIdx === 0 ? 'group1' : 'group2';
    shanhai.tiebreakCount = 0;
    shanhai.groups = shBuildGroups(stageIdx);
    shanhai.advancing = stageIdx === 0 ? 3 : 4;

    const stageStart = SHANHAI_SEASON_MODE
      ? (stageIdx === 0 ? new Date(shanhaiCup.clock) : shNextDayAt(shanhaiCup.clock, 15))
      : null;
    shanhai.rounds = shCreateGroupRounds(shanhai.groups, stageIdx, stageStart);
    shanhai.roundIndex = 0;
    season.round = shanhai.rounds[0];
    setCurrentMatch(season.round.matches[0]);
    render();
    tipEl.textContent = `${SHANHAI_STAGE_NAMES[stageIdx]} 开始，本轮 ${season.round.matches.length} 场对阵，每场 32 副。`;
  }

  function shFinalizeGroupMatch(match) {
    if (match.recorded) return;
    match.recorded = true;

    const group = shanhai.groups.find((entry) => entry.id === match.groupId);
    const game = match.games[match.games.length - 1];
    if (!group || !game) return;

    const a = group.records.get(match.teamA.id);
    const b = group.records.get(match.teamB.id);
    const diff = game.scoreA - game.scoreB;

    if (match.tiebreak) {
      a.tieNet += diff;
      b.tieNet -= diff;
      if (diff > 0) a.tieWins++;
      else if (diff < 0) b.tieWins++;
      group.tiebreaks.push(match);
      return;
    }

    a.played++;
    b.played++;
    a.scoreFor += game.scoreA;
    a.scoreAgainst += game.scoreB;
    b.scoreFor += game.scoreB;
    b.scoreAgainst += game.scoreA;
    a.net += diff;
    b.net -= diff;

    if (diff > 0) {
      a.wins++;
      a.points += 3;
      b.losses++;
    } else if (diff < 0) {
      b.wins++;
      b.points += 3;
      a.losses++;
    } else {
      a.draws++;
      b.draws++;
      a.points++;
      b.points++;
    }
  }

  function shGroupTieBlock(group) {
    const sorted = shSortedGroupRecords(group);
    const cut = group.advancing;
    if (cut <= 0 || cut >= sorted.length) return null;

    const above = sorted[cut - 1];
    const below = sorted[cut];
    if (
      above.points !== below.points ||
      above.net !== below.net ||
      above.tieWins !== below.tieWins ||
      above.tieNet !== below.tieNet
    ) return null;

    return sorted.filter((record) =>
      record.points === above.points &&
      record.net === above.net &&
      record.tieWins === above.tieWins &&
      record.tieNet === above.tieNet
    );
  }

  function shStartTiebreak(blocks) {
    season.roundUsed = new Set();
    const matches = [];
    blocks.forEach(({ group, records }) => {
      if (records.length === 2) {
        matches.push(createMatch(records[0].team, records[1].team, 'BO1', `${group.id}组 加赛`, {
          boardsPerGame: 32,
          decidingBoards: 8,
          allowDraw: true,
          groupId: group.id,
          tiebreak: true
        }));
        return;
      }

      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          matches.push(createMatch(records[i].team, records[j].team, 'BO1', `${group.id}组 加赛`, {
            boardsPerGame: 32,
            decidingBoards: 8,
            allowDraw: true,
            groupId: group.id,
            tiebreak: true
          }));
        }
      }
    });

    if (matches.length === 0) return false;

    shanhai.phase = 'tiebreak';
    shanhai.tiebreakCount = (shanhai.tiebreakCount || 0) + 1;
    const baseTime = SHANHAI_SEASON_MODE ? shNextDayAt(shanhaiCup.clock, 15) : null;
    matches.forEach((match, index) => {
      match.startTime = baseTime ? shGroupMatchTime(baseTime, index) : null;
    });
    const time = matches[0]?.startTime || null;
    shanhai.rounds = [{ label: '晋级加赛', matches, time }];
    shanhai.roundIndex = 0;
    season.round = shanhai.rounds[0];
    setCurrentMatch(matches[0]);
    render();
    tipEl.textContent = '晋级线出现同分同净胜分，已加入 32 副加赛，请手动模拟。';
    return true;
  }

  function shRecordGroupEliminations(stageIdx) {
    const cut = stageIdx === 0 ? 3 : 4;
    const startRank = stageIdx === 0 ? 25 : 17;
    const eliminated = [];

    shanhai.groups.forEach((group) => {
      shSortedGroupRecords(group).slice(cut).forEach((record) => eliminated.push(record));
    });

    eliminated.sort(shCompareGroupRecords);
    eliminated.forEach((record, index) => {
      season.teamRankings.set(record.team.id, startRank + index);
    });
  }

  function shCompleteGroupStage() {
    shRecordGroupEliminations(season.stageIdx);
    const qualifiers = [];
    shanhai.groups.forEach((group) => {
      shSortedGroupRecords(group).slice(0, group.advancing).forEach((record) => qualifiers.push(record.team));
    });
    season.qualifiers = qualifiers;
    if (season.stageIdx === 0) season.stageTeams = [...qualifiers];
    shShowStageReport(season.stageIdx);
  }

  function shShowStageReport(stageIdx) {
    season.stageEnded = true;
    season.currentMatch = null;
    lastSummary = {
      kind: 'shanhai-stage',
      stageIdx,
      stats: season.stageStats,
      title: `${SHANHAI_STAGE_NAMES[stageIdx]} · 赛段成绩报告`
    };
    summaryBtn.textContent = '赛段报告';
    summaryBtn.hidden = false;
    render();
    openSummary();
  }

  function shStageMatchTable() {
    const table = document.createElement('table');
    table.className = 'qy-table sh-stage-table';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['对阵', '比分', '晋级'].forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      headRow.append(th);
    });
    head.append(headRow);
    table.append(head);

    const body = document.createElement('tbody');
    season.round.matches.forEach((match) => {
      const game = match.games[match.games.length - 1];
      const score = match.allowDraw
        ? (game ? `${game.scoreA} : ${game.scoreB}` : '—')
        : `${match.winsA} : ${match.winsB}`;
      const row = document.createElement('tr');
      row.append(
        tableCell(`${match.teamA.name} vs ${match.teamB.name}`),
        tableCell(score),
        tableCell(match.winnerTeam ? match.winnerTeam.name : '平局', match.winnerTeam ? 'qy-win' : '')
      );
      body.append(row);
    });
    table.append(body);
    return table;
  }

  function shStageReportBlock(stageIdx) {
    const block = document.createElement('div');
    block.className = 'sh-stage-report';
    const title = document.createElement('h4');
    title.className = 'qy-stats-title';

    if (stageIdx <= 1) {
      title.textContent = '小组最终排名';
      block.append(title);
      const grid = document.createElement('div');
      grid.className = 'sh-groups';
      shanhai.groups.forEach((group) => grid.append(renderShanhaiGroupTable(group)));
      block.append(grid);
    } else {
      title.textContent = '本轮结果';
      block.append(title, wrapTable(shStageMatchTable()));
    }

    return block;
  }

  function shResolveGroupStage() {
    if ((shanhai.tiebreakCount || 0) > 12) {
      shCompleteGroupStage();
      return;
    }

    const blocks = [];
    shanhai.groups.forEach((group) => {
      const block = shGroupTieBlock(group);
      if (block) blocks.push({ group, records: block });
    });

    if (blocks.length > 0 && shStartTiebreak(blocks)) return;

    shCompleteGroupStage();
  }

  function shStartKnockoutStage(stageIdx, teamList) {
    lastSummary = null;
    season.stageIdx = stageIdx;
    season.stageEnded = false;
    season.finished = false;
    season.roundUsed = new Set();
    season.stageStats = createStatsMap();
    if (stageIdx === 2) season.metrics = new Map();

    const shuffled = shuffle(teamList);
    const matches = [];
    const base = SHANHAI_SEASON_MODE ? shNextDayAt(shanhaiCup.clock, 19) : null;

    for (let i = 0; i < shuffled.length; i += 2) {
      const match = createMatch(shuffled[i], shuffled[i + 1], 'BO7', SHANHAI_STAGE_NAMES[stageIdx], {
        boardsPerGame: 20,
        decidingBoards: 8,
        allowDraw: false
      });
      if (base) {
        match.startTime = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i / 2, 19, 0, 0, 0);
      }
      matches.push(match);
    }

    shanhai.phase = 'knockout';
    shanhai.groups = [];
    shanhai.rounds = [{ label: SHANHAI_STAGE_NAMES[stageIdx], matches, time: base }];
    shanhai.roundIndex = 0;
    season.round = shanhai.rounds[0];
    setCurrentMatch(matches[0]);
    render();
    tipEl.textContent = `${SHANHAI_STAGE_NAMES[stageIdx]} 开始，共 ${matches.length} 场 BO7，每轮重新随机配对。`;
  }

  function shRankTeams(teamList, startRank) {
    const sorted = [...teamList].sort((a, b) => compareMetrics(metricFor(a), metricFor(b)));
    sorted.forEach((team, index) => season.teamRankings.set(team.id, startRank + index));
    return sorted;
  }

  function shFinishKnockoutRound(stageIdx) {
    const matches = season.round.matches;
    const winners = winnersOf(matches);
    const losers = losersOf(matches);

    if (stageIdx === 2) {
      shRankTeams(losers, 9);
      shanhai.stageWinners = winners;
      shShowStageReport(stageIdx);
      return;
    }

    if (stageIdx === 3) {
      shRankTeams(losers, 5);
      shanhai.stageWinners = winners;
      shShowStageReport(stageIdx);
      return;
    }

    if (stageIdx === 4) {
      shanhai.finalists = winners;
      shanhai.thirdTeams = losers;
      shanhai.stageWinners = winners;
      shShowStageReport(stageIdx);
      return;
    }

    if (stageIdx === 5) {
      const third = winners[0];
      const fourth = losers[0];
      season.teamRankings.set(third.id, 3);
      season.teamRankings.set(fourth.id, 4);
      shShowStageReport(stageIdx);
      return;
    }

    const champion = winners[0];
    const runnerUp = losers[0];
    season.teamRankings.set(champion.id, 1);
    season.teamRankings.set(runnerUp.id, 2);
    season.champion = champion;
    season.runnerUp = runnerUp;
    shShowStageReport(stageIdx);
  }

  function shAdvanceMatch() {
    const match = season.currentMatch;
    if (!match || !match.done) return;

    const round = season.round;
    const index = round.matches.indexOf(match);
    if (index < round.matches.length - 1) {
      setCurrentMatch(round.matches[index + 1]);
      render();
      return;
    }

    if (shanhai.phase === 'tiebreak') {
      shResolveGroupStage();
      return;
    }

    if (shanhai.phase === 'group1' || shanhai.phase === 'group2') {
      if (shanhai.roundIndex < shanhai.rounds.length - 1) {
        shanhai.roundIndex++;
        season.round = shanhai.rounds[shanhai.roundIndex];
        setCurrentMatch(season.round.matches[0]);
        render();
      } else {
        shResolveGroupStage();
      }
      return;
    }

    shFinishKnockoutRound(season.stageIdx);
  }

  function shStartTournament() {
    closeModal(summaryModal);
    closeModal(restartModal);
    season = createSeasonState();
    prepareTeams(teams, true);
    lastResult = null;
    lastSummary = null;
    shanhai = {
      phase: 'group1',
      groups: [],
      rounds: [],
      roundIndex: 0,
      tiebreakCount: 0,
      finalists: [],
      thirdTeams: []
    };
    season.stageTeams = [...teams];
    shStartGroupStage(0);
  }

  function shEventRankingList() {
    return teams
      .map((team) => ({ teamName: team.name, rank: season.teamRankings.get(team.id) || 0 }))
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => a.rank - b.rank);
  }

  function shCaptureSeasonEvent() {
    if (!SHANHAI_SEASON_MODE || !shanhaiCup) return;

    const event = shanhaiCup.events[shanhaiCup.currentIndex];
    if (!event || event.completed) return;

    event.rankings = shEventRankingList();
    event.champion = event.rankings[0]?.teamName || '';
    event.runnerUp = event.rankings[1]?.teamName || '';
    event.top4 = event.rankings.slice(0, 4).map((entry) => entry.teamName);
    event.completed = true;
    mergeStatsMap(shanhaiCup.totalStats, season.totalStats);
  }

  function finishShanhaiTournament() {
    season.finished = true;
    season.stageEnded = true;
    season.currentMatch = null;
    render();

    if (SHANHAI_SEASON_MODE) {
      shCaptureSeasonEvent();
      if (ERA_MODE) recordEraYear();
      const event = shanhaiCup.events[shanhaiCup.currentIndex];
      if (shanhaiCup.currentIndex === SHANHAI_EVENT_DEFS.length - 1) {
        shanhaiCup.finished = true;
        shanhaiCup.idle = false;
        lastSummary = { kind: 'shanhai-season', stats: shanhaiCup.totalStats, title: '山海杯 · 赛季成绩汇总' };
        summaryBtn.textContent = '赛季汇总';
        summaryBtn.hidden = false;
        renderShanhaiSeasonBar();
        openSummary();
      } else {
        shanhaiCup.idle = true;
        shanhaiCup.idleStart = new Date(shanhaiCup.clock);
        shanhaiCup.idleNext = shanhaiCup.currentIndex + 1;
        shanhai.phase = 'idle';
        lastSummary = {
          kind: 'shanhai-overall',
          stats: season.totalStats,
          title: `${event.label} · 选手数据汇总`
        };
        summaryBtn.textContent = '本届汇总';
        summaryBtn.hidden = false;
        renderShanhaiSeasonBar();
        openSummary();
      }
      return;
    }

    lastSummary = {
      kind: 'shanhai-overall',
      stats: season.totalStats,
      title: '山海杯 · 本届选手数据汇总'
    };
    summaryBtn.textContent = '本届汇总';
    summaryBtn.hidden = false;
    openSummary();
  }

  function shAddNotice(date, text) {
    if (!shanhaiCup) return;
    shanhaiCup.notifications.push({ time: new Date(date), text });
    if (shanhaiCup.notifications.length > 300) shanhaiCup.notifications.shift();
  }

  function shRunTraining(date, type, teamList) {
    const boosted = [];
    teamList.forEach((team) => {
      if (Math.random() >= 0.1) return;
      team.players.forEach((player) => {
        player.strength += 1;
      });
      boosted.push(team.name);
    });

    const names = teamList.map((team) => team.name).join(' vs ');
    const label = type === 'intra' ? '队内训练赛' : '两队训练赛';
    const result = boosted.length > 0
      ? `${boosted.join('、')} 全员实力 +1`
      : '本次训练未触发实力提升';
    shAddNotice(date, `${label} · ${names}：${result}。`);
  }

  function shProcessTrainingUntil(nextStart) {
    let cursor = new Date(shanhaiCup.clock);
    cursor.setHours(10, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);

    while (cursor < nextStart) {
      const day = new Date(cursor);
      day.setHours(10 + randomInt(0, 6), randomInt(0, 59), 0, 0);
      if (day < nextStart) {
        if (Math.random() < 0.5) {
          shRunTraining(day, 'intra', [teams[randomInt(0, teams.length - 1)]]);
        } else {
          const firstIndex = randomInt(0, teams.length - 1);
          let secondIndex = randomInt(0, teams.length - 2);
          if (secondIndex >= firstIndex) secondIndex++;
          shRunTraining(day, 'inter', [teams[firstIndex], teams[secondIndex]]);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    shanhaiCup.clock = new Date(nextStart);
  }

  function shStartSeasonCup() {
    closeModal(summaryModal);
    closeModal(restartModal);
    officialTeams = cloneTeamList(window.SHANHAI_DATA.teams);
    teams = officialTeams;
    prepareTeams(teams, true);
    season = createSeasonState();
    shanhai = { phase: 'idle', groups: [], rounds: [], roundIndex: 0 };
    lastResult = null;
    lastSummary = null;
    shanhaiCup = {
      currentIndex: 0,
      idleNext: 0,
      idle: true,
      idleStart: shDate(SHANHAI_SEASON_START),
      clock: shDate(SHANHAI_SEASON_START),
      finished: false,
      totalStats: createStatsMap(),
      notifications: [],
      events: SHANHAI_EVENT_DEFS.map((def) => ({
        label: def.label,
        rankings: [],
        top4: [],
        champion: '',
        runnerUp: '',
        completed: false
      }))
    };
    shAddNotice(shanhaiCup.clock, '赛季开始，春季赛前进入空闲期，各队可自行安排训练赛。');
    renderShanhaiSeasonBar();
    render();
    tipEl.textContent = `当前为赛前空闲期，春季赛将于 ${shFormatDate(shDate(SHANHAI_EVENT_DEFS[0].start))} 开始。`;
  }

  function shStartSeasonEvent(index) {
    const def = SHANHAI_EVENT_DEFS[index];
    if (!def) return;

    shanhaiCup.currentIndex = index;
    shanhaiCup.idle = false;
    shanhaiCup.idleNext = null;
    season = createSeasonState();
    season.stageTeams = [...teams];
    lastResult = null;
    lastSummary = null;
    shanhai = { phase: 'group1', groups: [], rounds: [], roundIndex: 0, tiebreakCount: 0 };
    shAddNotice(shanhaiCup.clock, `${def.label}小组赛第一赛段开始。`);
    shStartGroupStage(0);
    renderShanhaiSeasonBar();
  }

  function shAdvanceSeason() {
    if (ERA_MODE && era?.tradeWindow) {
      shAdvanceEraYear();
      return;
    }
    if (!SHANHAI_SEASON_MODE || !shanhaiCup || !shanhaiCup.idle || shanhaiCup.finished) return;

    const index = shanhaiCup.idleNext;
    const def = SHANHAI_EVENT_DEFS[index];
    if (!def) return;

    const nextStart = shEventDate(index);
    shProcessTrainingUntil(nextStart);
    shStartSeasonEvent(index);
  }

  function shSeasonEventsTable() {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['赛事', '冠军', '亚军', '季军 / 殿军', '开始日期'].forEach((label) => headRow.append(headerCell(label)));
    head.append(headRow);

    const body = document.createElement('tbody');
    SHANHAI_EVENT_DEFS.forEach((def, index) => {
      const event = shanhaiCup.events[index];
      const row = document.createElement('tr');
      row.append(
        tableCell(def.label, 'qy-strong'),
        tableCell(event.completed ? event.champion : '—', event.completed ? 'qy-win' : ''),
        tableCell(event.completed ? event.runnerUp : '—'),
        tableCell(event.completed ? event.top4.slice(2).join('、') : '—'),
        tableCell(`${def.start[1] + 1}月${def.start[2]}日`)
      );
      body.append(row);
    });

    table.append(head, body);
    return table;
  }

  function shSeasonTeamTable() {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['战队', ...SHANHAI_EVENT_DEFS.map((def) => def.label), '冠军', '前四', '最好名次'].forEach((label) => {
      headRow.append(headerCell(label));
    });
    head.append(headRow);

    const rows = teams.map((team) => {
      const ranks = shanhaiCup.events.map((event) =>
        event.rankings.find((entry) => entry.teamName === team.name)?.rank || 0
      );
      const playedRanks = ranks.filter((rank) => rank > 0);
      return {
        team,
        ranks,
        titles: ranks.filter((rank) => rank === 1).length,
        top4: ranks.filter((rank) => rank > 0 && rank <= 4).length,
        best: playedRanks.length ? Math.min(...playedRanks) : 999
      };
    });

    rows.sort((a, b) => a.best - b.best || b.titles - a.titles || b.top4 - a.top4 || a.team.name.localeCompare(b.team.name));

    const body = document.createElement('tbody');
    rows.forEach(({ team, ranks, titles, top4, best }) => {
      const row = document.createElement('tr');
      row.append(tableCell(team.name, 'qy-strong'));
      ranks.forEach((rank) => {
        row.append(tableCell(rank ? `第 ${rank} 名` : '—', rank > 0 && rank <= 4 ? 'qy-win' : ''));
      });
      row.append(
        tableCell(String(titles)),
        tableCell(String(top4)),
        tableCell(best === 999 ? '—' : `第 ${best} 名`)
      );
      body.append(row);
    });

    table.append(head, body);
    return table;
  }

  function shEventResultsTable(event) {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['最终名次', '战队', '最终成绩'].forEach((label) => headRow.append(headerCell(label)));
    head.append(headRow);

    const body = document.createElement('tbody');
    event.rankings.forEach((entry) => {
      const row = document.createElement('tr');
      row.append(
        tableCell(`第 ${entry.rank} 名`, 'qy-strong'),
        tableCell(entry.teamName),
        tableCell(rankingLabel(entry.rank), entry.rank <= 4 ? 'qy-win' : '')
      );
      body.append(row);
    });

    table.append(head, body);
    return table;
  }

  function openShanhaiSeasonSummary() {
    if (!shanhaiCup) return;

    summaryTitle.textContent = '山海杯 · 赛季成绩汇总';
    summaryBody.classList.add('is-season-summary');
    summaryBody.textContent = '';

    const completedCount = shanhaiCup.events.filter((event) => event.completed).length;
    const intro = document.createElement('p');
    intro.className = 'modal-summary-note';
    intro.textContent = `春季赛、秋季赛与总决赛共 3 届 · ${teams.length} 支战队 · 已完成 ${completedCount} 届`;
    summaryBody.append(intro);

    const eventTitle = document.createElement('h4');
    eventTitle.className = 'qy-stats-title';
    eventTitle.textContent = '三届比赛结果';
    summaryBody.append(eventTitle, wrapTable(shSeasonEventsTable()));

    const teamTitle = document.createElement('h4');
    teamTitle.className = 'qy-stats-title';
    teamTitle.textContent = '战队赛季成绩';
    summaryBody.append(teamTitle, wrapTable(shSeasonTeamTable()));

    const playerCount = [...shanhaiCup.totalStats.values()].filter((stat) => stat.games > 0).length;
    const playerTitle = document.createElement('h4');
    playerTitle.className = 'qy-stats-title';
    playerTitle.textContent = '三届累计选手数据';
    const playerNote = document.createElement('p');
    playerNote.className = 'modal-summary-note';
    playerNote.textContent = `共 ${playerCount} 名选手出场 · 按净胜分排序`;
    summaryBody.append(playerTitle, playerNote, wrapTable(statsTable(shanhaiCup.totalStats)));

    const rankingsTitle = document.createElement('h4');
    rankingsTitle.className = 'qy-stats-title';
    rankingsTitle.textContent = '各届完整排名';
    summaryBody.append(rankingsTitle);

    SHANHAI_EVENT_DEFS.forEach((def, index) => {
      const event = shanhaiCup.events[index];
      if (!event.completed) return;

      const details = document.createElement('details');
      details.className = 'qy-season-details';
      const summary = document.createElement('summary');
      summary.textContent = `${def.label} · 完整排名`;
      details.append(summary, wrapTable(shEventResultsTable(event)));
      summaryBody.append(details);
    });

    lastSummary = { kind: 'shanhai-season', stats: shanhaiCup.totalStats, title: '山海杯 · 赛季成绩汇总' };
    summaryAction.textContent = ERA_MODE
      ? (era?.finished ? '重新开始赛年' : '进入交易窗口')
      : '重新开始赛季';
    openModal(summaryModal);
  }

  function officialSeedNames() {
    return DATA.teams.filter((team) => team.seed).map((team) => team.name);
  }

  function eventSeedSource(index) {
    if (index === 0) return '官方名单规定的 8 支种子队';
    if (index === SEASON_EVENT_DEFS.length - 1) {
      return '春夏秋冬各届前二，重复时按该届名次顺延补齐';
    }
    return `${SEASON_EVENT_DEFS[index - 1].label}前八`;
  }

  function eventSeedNames(index) {
    if (index === 0) return officialSeedNames();

    if (index === SEASON_EVENT_DEFS.length - 1) {
      const picked = [];
      const seen = new Set();

      seasonCup.events.slice(0, -1).forEach((event) => {
        let taken = 0;
        for (const entry of event.rankings) {
          if (taken >= 2) break;
          if (seen.has(entry.teamName)) continue;
          seen.add(entry.teamName);
          picked.push(entry.teamName);
          taken++;
        }
      });

      if (picked.length < 8) {
        for (const event of seasonCup.events.slice(0, -1)) {
          for (const entry of event.rankings) {
            if (picked.length >= 8) break;
            if (seen.has(entry.teamName)) continue;
            seen.add(entry.teamName);
            picked.push(entry.teamName);
          }
          if (picked.length >= 8) break;
        }
      }

      return picked.slice(0, 8);
    }

    const previous = seasonCup.events[index - 1];
    return previous.rankings.slice(0, 8).map((entry) => entry.teamName);
  }

  function applyEventSeeds(seedNames) {
    const seeds = new Set(seedNames);
    teams.forEach((team) => {
      team.seed = seeds.has(team.name);
    });
  }

  function eventRankingList() {
    return teams
      .map((team) => ({ teamName: team.name, rank: season.teamRankings.get(team.id) || 0 }))
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => a.rank - b.rank);
  }

  function captureSeasonEvent() {
    if (!SEASON_MODE || !seasonCup) return;

    const event = seasonCup.events[seasonCup.currentIndex];
    if (!event || event.completed) return;

    event.rankings = eventRankingList();
    event.champion = event.rankings[0]?.teamName || '';
    event.runnerUp = event.rankings[1]?.teamName || '';
    event.top4 = event.rankings.slice(0, 4).map((entry) => entry.teamName);
    event.completed = true;
    mergeStatsMap(seasonCup.totalStats, season.totalStats);
    seasonCup.finished = seasonCup.currentIndex === SEASON_EVENT_DEFS.length - 1;
  }

  function startSeasonEvent(index, startTime = null) {
    if (!SEASON_MODE || !seasonCup) return;

    const event = seasonCup.events[index];
    if (!event) return;

    const seedNames = eventSeedNames(index);
    if (seedNames.length !== 8) {
      tipEl.textContent = `${event.label}种子队生成失败，请重新开始赛季。`;
      return;
    }

    const nextStart = startTime || (index === 0 ? qyEventDate(0) : qyNextEventStart(index));
    seasonCup.clock = new Date(nextStart);
    seasonCup.currentIndex = index;
    seasonCup.idle = false;
    seasonCup.idleStart = null;
    seasonCup.idleNext = null;
    event.seeds = seedNames;
    event.seedSource = eventSeedSource(index);
    applyEventSeeds(seedNames);
    preserveStrengths = ERA_MODE || index > 0;
    qyAddNotice(seasonCup.clock, `${event.label}开始，比赛于 ${shFormatDate(seasonCup.clock)} 进行。`);
    resetSeason();
    tipEl.textContent = `${event.label}开始 · 种子：${seedNames.join('、')}。`;
  }

  function startSeasonCup() {
    if (!SEASON_MODE) {
      resetSeason();
      return;
    }

    seasonCup = {
      currentIndex: 0,
      idle: false,
      idleStart: null,
      idleNext: null,
      clock: qyEventDate(0),
      finished: false,
      totalStats: createStatsMap(),
      notifications: [],
      events: SEASON_EVENT_DEFS.map((def) => ({
        ...def,
        seeds: [],
        seedSource: '',
        rankings: [],
        top4: [],
        champion: '',
        runnerUp: '',
        completed: false
      }))
    };

    startSeasonEvent(0, seasonCup.clock);
  }

  function qyAdvanceSeason() {
    if (ERA_MODE && era?.tradeWindow) {
      qyAdvanceEraYear();
      return;
    }
    if (!SEASON_MODE || !seasonCup || !seasonCup.idle || seasonCup.finished) return;

    const index = seasonCup.idleNext;
    const nextStart = qyNextEventStart(index);
    qyProcessTrainingUntil(nextStart);
    startSeasonEvent(index, nextStart);
    renderSeasonBar();
    render();
  }

  function eraSeasonNo(year) {
    return year - ERA_START_YEAR + 1;
  }

  function startEra() {
    if (!ERA_MODE) return;

    closeModal(summaryModal);
    closeModal(restartModal);
    officialTeams = cloneTeamList(DATA.teams);
    teams = officialTeams;
    preserveStrengths = false;
    prepareTeams(teams, false);
    era = {
      startYear: ERA_START_YEAR,
      endYear: ERA_END_YEAR,
      currentYear: ERA_START_YEAR,
      seasonNo: 1,
      finished: false,
      tradeWindow: false,
      tradeStart: null,
      nextYear: null,
      history: [],
      notifications: []
    };

    if (SHANHAI_MODE) startShanhaiEraYear(ERA_START_YEAR);
    else startQingyunEraYear(ERA_START_YEAR);
  }

  function startQingyunEraYear(year) {
    if (!ERA_MODE || !era) return;

    era.currentYear = year;
    era.seasonNo = eraSeasonNo(year);
    const startTime = qyEventDate(0, year);
    seasonCup = {
      year,
      seasonNo: era.seasonNo,
      currentIndex: 0,
      idle: false,
      idleStart: null,
      idleNext: null,
      clock: new Date(startTime),
      finished: false,
      totalStats: createStatsMap(),
      notifications: era.notifications,
      events: SEASON_EVENT_DEFS.map((def) => ({
        ...def,
        seeds: [],
        seedSource: '',
        rankings: [],
        top4: [],
        champion: '',
        runnerUp: '',
        completed: false
      }))
    };
    startSeasonEvent(0, startTime);
    renderEraBar();
    renderSeasonBar();
    render();
  }

  function startShanhaiEraYear(year) {
    if (!ERA_MODE || !era) return;

    era.currentYear = year;
    era.seasonNo = eraSeasonNo(year);
    const startTime = shEventDate(0, year);
    season = createSeasonState();
    season.stageTeams = [...teams];
    lastResult = null;
    lastSummary = null;
    shanhai = { phase: 'group1', groups: [], rounds: [], roundIndex: 0, tiebreakCount: 0 };
    shanhaiCup = {
      year,
      seasonNo: era.seasonNo,
      currentIndex: 0,
      idle: false,
      idleNext: null,
      idleStart: null,
      clock: new Date(startTime),
      finished: false,
      totalStats: createStatsMap(),
      notifications: era.notifications,
      events: SHANHAI_EVENT_DEFS.map((def) => ({
        label: def.label,
        rankings: [],
        top4: [],
        champion: '',
        runnerUp: '',
        completed: false
      }))
    };
    shAddNotice(startTime, `${year} 年春季赛小组赛开始。`);
    shStartGroupStage(0);
    renderEraBar();
    renderShanhaiSeasonBar();
    render();
  }

  function recordEraYear() {
    if (!ERA_MODE || !era) return;
    const cup = SHANHAI_MODE ? shanhaiCup : seasonCup;
    if (!cup || era.history.some((entry) => entry.year === era.currentYear)) return;

    const finalEvent = cup.events[cup.events.length - 1];
    if (!finalEvent?.completed) return;

    era.history.push({
      year: era.currentYear,
      seasonNo: era.seasonNo,
      champion: finalEvent.champion,
      runnerUp: finalEvent.runnerUp,
      top4: [...(finalEvent.top4 || [])],
      events: cup.events.map((event) => ({
        label: event.label,
        champion: event.champion,
        runnerUp: event.runnerUp,
        top4: [...(event.top4 || [])]
      }))
    });

    if (era.currentYear < era.endYear) {
      era.tradeWindow = true;
      era.tradeStart = new Date(cup.clock);
      era.nextYear = era.currentYear + 1;
    } else {
      era.finished = true;
      era.tradeWindow = false;
      era.tradeStart = null;
      era.nextYear = null;
    }
    renderEraBar();
  }

  function qyAdvanceEraYear() {
    if (!ERA_MODE || !era || !era.tradeWindow || era.finished) return;

    const nextYear = era.nextYear;
    const nextStart = qyEventDate(0, nextYear);
    const tradeStart = new Date(era.tradeStart || seasonCup.clock);
    qyProcessTrainingUntil(nextStart);
    qyRunTradeWindow(tradeStart, nextStart);
    era.currentYear = nextYear;
    era.seasonNo = eraSeasonNo(nextYear);
    era.tradeWindow = false;
    era.tradeStart = null;
    era.nextYear = null;
    startQingyunEraYear(nextYear);
  }

  function shAdvanceEraYear() {
    if (!ERA_MODE || !era || !era.tradeWindow || era.finished) return;

    const nextYear = era.nextYear;
    const nextStart = shEventDate(0, nextYear);
    const tradeStart = new Date(era.tradeStart || shanhaiCup.clock);
    shProcessTrainingUntil(nextStart);
    shRunTradeWindow(tradeStart, nextStart);
    era.currentYear = nextYear;
    era.seasonNo = eraSeasonNo(nextYear);
    era.tradeWindow = false;
    era.tradeStart = null;
    era.nextYear = null;
    startShanhaiEraYear(nextYear);
  }

  function qyRunTradeWindow(start, end) {
    if (!ERA_MODE || !era || !teams?.length) return;

    qyAddNotice(start, '赛年交易窗口开启，各队可进行成员调整。');
    const count = 1 + randomInt(0, 2);
    for (let i = 0; i < count; i++) {
      let teamA = teams[randomInt(0, teams.length - 1)];
      let teamB = teams[randomInt(0, teams.length - 1)];
      if (teamA === teamB) {
        teamB = teams[(teams.indexOf(teamA) + 1) % teams.length];
      }
      if (!teamA.players.length || !teamB.players.length) continue;

      const playerA = teamA.players.splice(randomInt(0, teamA.players.length - 1), 1)[0];
      const playerB = teamB.players.splice(randomInt(0, teamB.players.length - 1), 1)[0];
      teamA.players.push(playerB);
      teamB.players.push(playerA);

      const tradeDate = new Date(end.getTime() - (1 + randomInt(0, 7)) * 86400000);
      qyAddNotice(
        tradeDate < start ? start : tradeDate,
        `交易窗口 · ${teamA.name} 与 ${teamB.name} 交换成员：${teamA.name} 送出 ${playerA.name}，得到 ${playerB.name}；${teamB.name} 送出 ${playerB.name}，得到 ${playerA.name}。`
      );
    }
    qyAddNotice(new Date(end.getTime() - 86400000), '交易窗口关闭，各队名单确定。');
  }

  function shRunTradeWindow(start, end) {
    if (!ERA_MODE || !era || !teams?.length) return;

    shAddNotice(start, '赛年交易窗口开启，各队可进行成员调整。');
    const count = 1 + randomInt(0, 2);
    for (let i = 0; i < count; i++) {
      let teamA = teams[randomInt(0, teams.length - 1)];
      let teamB = teams[randomInt(0, teams.length - 1)];
      if (teamA === teamB) {
        teamB = teams[(teams.indexOf(teamA) + 1) % teams.length];
      }
      if (!teamA.players.length || !teamB.players.length) continue;

      const playerA = teamA.players.splice(randomInt(0, teamA.players.length - 1), 1)[0];
      const playerB = teamB.players.splice(randomInt(0, teamB.players.length - 1), 1)[0];
      teamA.players.push(playerB);
      teamB.players.push(playerA);

      const tradeDate = new Date(end.getTime() - (1 + randomInt(0, 7)) * 86400000);
      shAddNotice(
        tradeDate < start ? start : tradeDate,
        `交易窗口 · ${teamA.name} 与 ${teamB.name} 交换成员：${teamA.name} 送出 ${playerA.name}，得到 ${playerB.name}；${teamB.name} 送出 ${playerB.name}，得到 ${playerA.name}。`
      );
    }
    shAddNotice(new Date(end.getTime() - 86400000), '交易窗口关闭，各队名单确定。');
  }

  function renderEraBar() {
    if (!ERA_MODE || !era) return;

    if (eraYearsEl) {
      eraYearsEl.textContent = '';
      for (let year = ERA_START_YEAR; year <= ERA_END_YEAR; year++) {
        const entry = era.history.find((item) => item.year === year);
        const item = document.createElement('li');
        item.className = 'qy-era-year';
        if (entry) item.classList.add('is-done');
        else if (era.tradeWindow && year === era.nextYear) item.classList.add('is-next');
        else if (!era.finished && !era.tradeWindow && year === era.currentYear) item.classList.add('is-current');

        const seasons = document.createElement('span');
        seasons.className = 'qy-era-year-seasons';
        seasons.textContent = `S${eraSeasonNo(year)}`;

        const name = document.createElement('span');
        name.className = 'qy-era-year-name';
        name.textContent = `${year}`;

        const state = document.createElement('span');
        state.className = 'qy-era-year-state';
        if (entry) state.textContent = entry.champion || '已结束';
        else if (era.tradeWindow && year === era.nextYear) state.textContent = '交易窗口';
        else if (!era.finished && !era.tradeWindow && year === era.currentYear) state.textContent = '进行中';
        else state.textContent = '未开始';

        item.append(seasons, name, state);
        eraYearsEl.append(item);
      }
    }

    if (eraCurrentEl) {
      if (era.tradeWindow && era.nextYear) {
        eraCurrentEl.textContent = `S${eraSeasonNo(era.nextYear)} · ${era.nextYear} 交易窗口`;
      } else {
        eraCurrentEl.textContent = `S${era.seasonNo} · ${era.currentYear}`;
      }
    }
    if (eraNoteEl) {
      if (era.finished) {
        eraNoteEl.textContent = `${ERA_START_YEAR}–${ERA_END_YEAR} · 26 个赛年全部结束。`;
      } else if (era.tradeWindow && era.nextYear) {
        eraNoteEl.textContent = `S${eraSeasonNo(era.nextYear)} · ${era.nextYear} 交易窗口 · 总决赛结束到春季赛开始，成员变动与训练赛将在此阶段发生。`;
      } else {
        eraNoteEl.textContent = `S${era.seasonNo} · ${era.currentYear} 赛年进行中，春季赛至总决赛共 ${SHANHAI_MODE ? 3 : 5} 届。`;
      }
    }
  }

  function renderSeasonBar() {
    if (!SEASON_MODE || !seasonCup || !seasonEventsEl) return;

    seasonEventsEl.textContent = '';
    SEASON_EVENT_DEFS.forEach((def, index) => {
      const event = seasonCup.events[index];
      const item = document.createElement('li');
      item.className = 'qy-season-event';
      if (event.completed) item.classList.add('is-done');
      else if (!seasonCup.finished && !seasonCup.idle && index === seasonCup.currentIndex) {
        item.classList.add('is-current');
      }

      const name = document.createElement('span');
      name.className = 'qy-season-event-name';
      name.textContent = def.label;

      const state = document.createElement('span');
      state.className = 'qy-season-event-state';
      if (event.completed) state.textContent = `冠军：${event.champion}`;
      else if (seasonCup.idle && index === seasonCup.idleNext) state.textContent = '休赛期';
      else if (!seasonCup.finished && !seasonCup.idle && index === seasonCup.currentIndex) state.textContent = '进行中';
      else state.textContent = '未开始';

      item.append(name, state);
      seasonEventsEl.append(item);
    });

    const current = seasonCup.events[seasonCup.currentIndex];
    if (seasonSeedNote && current) {
      if (ERA_MODE && era) {
        if (era.finished) {
          seasonSeedNote.textContent = `S26 · 2050 赛年结束 · 2025–2050 全部 ${ERA_END_YEAR - ERA_START_YEAR + 1} 个赛年已完成。`;
        } else if (era.tradeWindow && era.nextYear) {
          const nextStart = qyEventDate(0, era.nextYear);
          seasonSeedNote.textContent = `S${eraSeasonNo(era.nextYear)} · ${era.nextYear} 交易窗口 · 春季赛 ${shFormatDate(nextStart)} 开始 · 成员变动与训练赛同步进行。`;
        } else {
          seasonSeedNote.textContent = `S${era.seasonNo} · ${era.currentYear} 年 · 本届种子（${current.seedSource}）：${current.seeds.join('、')}`;
        }
      } else if (seasonCup.finished) {
        seasonSeedNote.textContent = '赛季已结束 · 五届比赛全部完成。';
      } else if (seasonCup.idle) {
        const next = SEASON_EVENT_DEFS[seasonCup.idleNext];
        const nextStart = qyNextEventStart(seasonCup.idleNext);
        seasonSeedNote.textContent = `当前为休赛期 · 下一届：${next.label} · ${shFormatDate(nextStart)} 开始 · 两届之间至少 20 天休赛期。`;
      } else {
        seasonSeedNote.textContent = `本届种子（${current.seedSource}）：${current.seeds.join('、')}`;
      }
    }

    if (seasonClockEl) seasonClockEl.textContent = shFormatDate(seasonCup.clock);
    if (seasonSummaryBtn) seasonSummaryBtn.hidden = !seasonCup.finished;
    if (seasonAdvanceBtn) {
      const canAdvance = ERA_MODE
        ? Boolean((era?.tradeWindow || seasonCup.idle) && !era?.finished)
        : Boolean(seasonCup.idle && !seasonCup.finished);
      seasonAdvanceBtn.hidden = !canAdvance;
      seasonAdvanceBtn.disabled = !canAdvance;
      if (canAdvance) {
        seasonAdvanceBtn.textContent = ERA_MODE && era.tradeWindow
          ? `推进到 S${eraSeasonNo(era.nextYear)} · ${era.nextYear}`
          : `推进到${SEASON_EVENT_DEFS[seasonCup.idleNext].label}`;
      }
    }

    if (seasonNoticeListEl) {
      seasonNoticeListEl.textContent = '';
      const notices = [...seasonCup.notifications].sort((a, b) => a.time - b.time).slice(-30).reverse();
      if (notices.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sh-notice-empty';
        empty.textContent = '暂无训练赛通知。';
        seasonNoticeListEl.append(empty);
      } else {
        notices.forEach((notice) => {
          const item = document.createElement('p');
          item.className = 'sh-notice-item';
          const time = document.createElement('span');
          time.className = 'sh-notice-time';
          time.textContent = shFormatDate(notice.time);
          item.append(time, document.createTextNode(notice.text));
          seasonNoticeListEl.append(item);
        });
      }
    }
    if (seasonNoticeSummaryEl) {
      seasonNoticeSummaryEl.textContent = `累计通知 ${seasonCup.notifications.length} 条`;
    }
    renderEraBar();
    restartBtn.textContent = '重开赛季';
  }

  function seasonPlacementText(rank) {
    return rank ? `第 ${rank} 名` : '—';
  }

  function eventResultsTable(event) {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['最终名次', '战队', '最终成绩'].forEach((label) => headRow.append(headerCell(label)));
    head.append(headRow);

    const body = document.createElement('tbody');
    event.rankings.forEach((entry) => {
      const row = document.createElement('tr');
      row.append(
        tableCell(`第 ${entry.rank} 名`, 'qy-strong'),
        tableCell(entry.teamName),
        tableCell(rankingLabel(entry.rank), entry.rank <= 4 ? 'qy-win' : '')
      );
      body.append(row);
    });

    table.append(head, body);
    return table;
  }

  function seasonEventsTable() {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['赛事', '冠军', '亚军', '季军 / 殿军', '种子来源'].forEach((label) => headRow.append(headerCell(label)));
    head.append(headRow);

    const body = document.createElement('tbody');
    SEASON_EVENT_DEFS.forEach((def, index) => {
      const event = seasonCup.events[index];
      const row = document.createElement('tr');
      row.append(
        tableCell(def.label, 'qy-strong'),
        tableCell(event.completed ? event.champion : '—', event.completed ? 'qy-win' : ''),
        tableCell(event.completed ? event.runnerUp : '—'),
        tableCell(event.completed ? event.top4.slice(2).join('、') : '—'),
        tableCell(event.seedSource)
      );
      body.append(row);
    });

    table.append(head, body);
    return table;
  }

  function seasonTeamTable() {
    const table = document.createElement('table');
    table.className = 'qy-table';

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['战队', ...SEASON_EVENT_DEFS.map((def) => def.label), '冠军', '前四', '最好名次'].forEach((label) => {
      headRow.append(headerCell(label));
    });
    head.append(headRow);

    const rows = teams.map((team) => {
      const ranks = seasonCup.events.map((event) =>
        event.rankings.find((entry) => entry.teamName === team.name)?.rank || 0
      );
      const playedRanks = ranks.filter((rank) => rank > 0);
      return {
        team,
        ranks,
        titles: ranks.filter((rank) => rank === 1).length,
        top4: ranks.filter((rank) => rank > 0 && rank <= 4).length,
        best: playedRanks.length ? Math.min(...playedRanks) : 999
      };
    });

    rows.sort((a, b) => a.best - b.best || b.titles - a.titles || b.top4 - a.top4 || a.team.name.localeCompare(b.team.name));

    const body = document.createElement('tbody');
    rows.forEach(({ team, ranks, titles, top4, best }) => {
      const row = document.createElement('tr');
      row.append(tableCell(team.name, 'qy-strong'));
      ranks.forEach((rank) => {
        row.append(tableCell(seasonPlacementText(rank), rank > 0 && rank <= 4 ? 'qy-win' : ''));
      });
      row.append(
        tableCell(String(titles)),
        tableCell(String(top4)),
        tableCell(best === 999 ? '—' : `第 ${best} 名`)
      );
      body.append(row);
    });

    table.append(head, body);
    return table;
  }

  function openSeasonSummary() {
    if (!seasonCup) return;

    summaryTitle.textContent = '青云杯 · 赛季成绩汇总';
    summaryBody.classList.add('is-season-summary');
    summaryBody.textContent = '';

    const completedCount = seasonCup.events.filter((event) => event.completed).length;
    const intro = document.createElement('p');
    intro.className = 'modal-summary-note';
    intro.textContent = `春夏秋冬与总决赛共 5 届 · ${teams.length} 支战队 · 已完成 ${completedCount} 届`;
    summaryBody.append(intro);

    const eventTitle = document.createElement('h4');
    eventTitle.className = 'qy-stats-title';
    eventTitle.textContent = '五届比赛结果';
    summaryBody.append(eventTitle, wrapTable(seasonEventsTable()));

    const teamTitle = document.createElement('h4');
    teamTitle.className = 'qy-stats-title';
    teamTitle.textContent = '战队赛季成绩';
    summaryBody.append(teamTitle, wrapTable(seasonTeamTable()));

    const playerCount = [...seasonCup.totalStats.values()].filter((stat) => stat.games > 0).length;
    const playerTitle = document.createElement('h4');
    playerTitle.className = 'qy-stats-title';
    playerTitle.textContent = '五届累计选手数据';
    const playerNote = document.createElement('p');
    playerNote.className = 'modal-summary-note';
    playerNote.textContent = `共 ${playerCount} 名选手出场 · 按净胜分排序`;
    summaryBody.append(playerTitle, playerNote, wrapTable(statsTable(seasonCup.totalStats)));

    const rankingsTitle = document.createElement('h4');
    rankingsTitle.className = 'qy-stats-title';
    rankingsTitle.textContent = '各届完整排名';
    summaryBody.append(rankingsTitle);

    SEASON_EVENT_DEFS.forEach((def, index) => {
      const event = seasonCup.events[index];
      if (!event.completed) return;

      const details = document.createElement('details');
      details.className = 'qy-season-details';
      const summary = document.createElement('summary');
      summary.textContent = `${def.label} · 完整排名`;
      details.append(summary, wrapTable(eventResultsTable(event)));
      summaryBody.append(details);
    });

    lastSummary = { kind: 'season', stats: seasonCup.totalStats, title: '青云杯 · 赛季成绩汇总' };
    summaryAction.textContent = ERA_MODE
      ? (era?.finished ? '重新开始赛年' : '进入交易窗口')
      : '重新开始赛季';
    openModal(summaryModal);
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
    if (SHANHAI_MODE) {
      shAdvanceMatch();
      return;
    }

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
    const score = match.allowDraw
      ? `${game.scoreA} : ${game.scoreB}`
      : `${match.winsA} : ${match.winsB}`;
    tipEl.textContent = match.done
      ? `本场比赛结束：${match.teamA.name} ${score} ${match.teamB.name}，点击「下一场」继续。`
      : `第 ${game.index} 局结束，${game.winner ? `${game.winner.name} 胜` : '平局'}。`;
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
    const score = match.allowDraw
      ? `${match.games[match.games.length - 1].scoreA} : ${match.games[match.games.length - 1].scoreB}`
      : `${match.winsA} : ${match.winsB}`;
    tipEl.textContent = `本场比赛结束：${match.teamA.name} ${score} ${match.teamB.name}，点击「下一场」继续。`;
  }

  function simulateStage() {
    if (realtime && !realtime.finished) return;
    let guard = 0;
    bulkSimulating = true;

    try {
      while (season.currentMatch && !season.stageEnded && !season.finished && guard++ < 2000) {
        const match = season.currentMatch;
        let gameGuard = 0;
        while (!match.done && gameGuard++ < 20) {
          playGame(match, createStatsMap());
        }
        if (season.stageEnded || season.finished) break;
        advanceMatch();
      }
    } finally {
      bulkSimulating = false;
    }

    render();
  }

  /* ---------- UI ---------- */

  function renderShanhaiGroupTable(group) {
    const card = document.createElement('section');
    card.className = 'sh-group';

    const head = document.createElement('div');
    head.className = 'sh-group-head';
    const title = document.createElement('h3');
    title.className = 'sh-group-title';
    title.textContent = `${group.id}组`;
    const meta = document.createElement('span');
    meta.className = 'sh-group-meta';
    meta.textContent = `前 ${group.advancing} 名晋级`;
    head.append(title, meta);

    const table = document.createElement('table');
    table.className = 'qy-table sh-group-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['排名', '战队', '场次', '胜', '平', '负', '积分', '净胜分'].forEach((label) => headRow.append(headerCell(label)));
    thead.append(headRow);

    const tbody = document.createElement('tbody');
    shSortedGroupRecords(group).forEach((record, index) => {
      const row = document.createElement('tr');
      row.className = index < group.advancing ? 'is-advance' : 'is-eliminate';
      row.append(
        tableCell(String(index + 1), 'qy-strong'),
        tableCell(record.team.name, 'qy-strong'),
        tableCell(String(record.played)),
        tableCell(String(record.wins)),
        tableCell(String(record.draws)),
        tableCell(String(record.losses)),
        tableCell(String(record.points)),
        tableCell(record.net > 0 ? `+${record.net}` : String(record.net))
      );
      tbody.append(row);
    });

    table.append(thead, tbody);
    card.append(head, wrapTable(table));

    if (group.tiebreaks.length > 0) {
      const note = document.createElement('p');
      note.className = 'sh-group-note';
      note.textContent = `加赛 ${group.tiebreaks.length} 场`;
      card.append(note);
    }

    return card;
  }

  function renderShanhaiGroups() {
    if (!SHANHAI_MODE || !shanhaiGroupsEl) return;
    const visible = shanhai && shanhai.groups.length > 0 && (shanhai.phase === 'group1' || shanhai.phase === 'group2' || shanhai.phase === 'tiebreak');
    if (shanhaiGroupsDetailsEl) shanhaiGroupsDetailsEl.hidden = !visible;
    shanhaiGroupsEl.hidden = !visible;
    if (!visible) {
      shanhaiGroupsEl.textContent = '';
      return;
    }

    shanhaiGroupsEl.textContent = '';
    shanhai.groups.forEach((group) => {
      shanhaiGroupsEl.append(renderShanhaiGroupTable(group));
    });
  }

  function renderShanhaiSeasonBar() {
    if (!SHANHAI_SEASON_MODE || !shanhaiCup) return;

    if (shanhaiSeasonEventsEl) {
      shanhaiSeasonEventsEl.textContent = '';
      SHANHAI_EVENT_DEFS.forEach((def, index) => {
        const event = shanhaiCup.events[index];
        const item = document.createElement('li');
        item.className = 'qy-season-event';
        if (event.completed) item.classList.add('is-done');
        else if (!shanhaiCup.finished && !shanhaiCup.idle && index === shanhaiCup.currentIndex) item.classList.add('is-current');

        const name = document.createElement('span');
        name.className = 'qy-season-event-name';
        name.textContent = def.label;

        const state = document.createElement('span');
        state.className = 'qy-season-event-state';
        if (event.completed) state.textContent = `冠军：${event.champion}`;
        else if (shanhaiCup.idle && index === shanhaiCup.idleNext) state.textContent = '休赛期';
        else if (!shanhaiCup.finished && !shanhaiCup.idle && index === shanhaiCup.currentIndex) state.textContent = '进行中';
        else state.textContent = '未开始';

        item.append(name, state);
        shanhaiSeasonEventsEl.append(item);
      });
    }

    if (shanhaiSeasonNoteEl) {
      if (ERA_MODE && era) {
        if (era.finished) {
          shanhaiSeasonNoteEl.textContent = `S26 · 2050 赛年结束 · 2025–2050 全部 ${ERA_END_YEAR - ERA_START_YEAR + 1} 个赛年已完成。`;
        } else if (era.tradeWindow && era.nextYear) {
          const nextStart = shEventDate(0, era.nextYear);
          shanhaiSeasonNoteEl.textContent = `S${eraSeasonNo(era.nextYear)} · ${era.nextYear} 交易窗口 · 春季赛 ${shFormatDate(nextStart)} 开始 · 成员变动与训练赛同步进行。`;
        } else {
          const current = SHANHAI_EVENT_DEFS[shanhaiCup.currentIndex];
          shanhaiSeasonNoteEl.textContent = `S${era.seasonNo} · ${era.currentYear} 年 · 正在进行：${current.label} · 无种子队 · 每届重新随机分组。`;
        }
      } else if (shanhaiCup.finished) {
        shanhaiSeasonNoteEl.textContent = '赛季已结束 · 三届比赛均不设种子队，每届重新随机分组。';
      } else if (shanhaiCup.idle) {
        const next = SHANHAI_EVENT_DEFS[shanhaiCup.idleNext];
        shanhaiSeasonNoteEl.textContent = `当前为休赛期 · 下一届：${next.label} · 各队自行安排训练赛。`;
      } else {
        const current = SHANHAI_EVENT_DEFS[shanhaiCup.currentIndex];
        shanhaiSeasonNoteEl.textContent = `正在进行：${current.label} · 无种子队 · 每届重新随机分组。`;
      }
    }

    if (shanhaiSeasonSummaryBtn) shanhaiSeasonSummaryBtn.hidden = !shanhaiCup.finished;
    if (shanhaiAdvanceBtn) {
      const canAdvance = ERA_MODE
        ? Boolean((era?.tradeWindow || shanhaiCup.idle) && !era?.finished)
        : Boolean(shanhaiCup.idle && !shanhaiCup.finished);
      shanhaiAdvanceBtn.hidden = !canAdvance;
      shanhaiAdvanceBtn.disabled = !canAdvance;
      if (canAdvance) {
        shanhaiAdvanceBtn.textContent = ERA_MODE && era.tradeWindow
          ? `推进到 S${eraSeasonNo(era.nextYear)} · ${era.nextYear}`
          : `推进到${SHANHAI_EVENT_DEFS[shanhaiCup.idleNext].label}`;
      }
    }
    if (shanhaiClockEl) shanhaiClockEl.textContent = shFormatDate(shanhaiCup.clock);

    if (shanhaiNoticeListEl) {
      shanhaiNoticeListEl.textContent = '';
      const notices = [...shanhaiCup.notifications].sort((a, b) => a.time - b.time).slice(-30).reverse();
      if (notices.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sh-notice-empty';
        empty.textContent = '暂无训练赛通知。';
        shanhaiNoticeListEl.append(empty);
      } else {
        notices.forEach((notice) => {
          const item = document.createElement('p');
          item.className = 'sh-notice-item';
          const time = document.createElement('span');
          time.className = 'sh-notice-time';
          time.textContent = shFormatDate(notice.time);
          item.append(time, document.createTextNode(notice.text));
          shanhaiNoticeListEl.append(item);
        });
      }
    }
    if (shanhaiNoticeSummaryEl) {
      shanhaiNoticeSummaryEl.textContent = `累计通知 ${shanhaiCup.notifications.length} 条`;
    }
    renderEraBar();
  }

  function renderShanhai() {
    if (!season) return;

    stageEl.textContent = shanhai && shanhai.phase === 'idle'
      ? '休赛期'
      : (SHANHAI_STAGE_NAMES[season.stageIdx] || '赛季结束');
    const roundText = season.finished
      ? '比赛结束'
      : season.stageEnded
        ? '赛段结束'
        : season.round
          ? `${season.round.label} · ${season.round.matches.length} 场对阵`
          : (shanhai && shanhai.phase === 'idle' ? '等待下一届比赛' : '');
    roundEl.textContent = roundText;

    const match = season.currentMatch;
    if (match) {
      teamAEl.textContent = match.teamA.name;
      teamBEl.textContent = match.teamB.name;
      seedAEl.hidden = true;
      seedBEl.hidden = true;
      if (match.allowDraw) {
        const game = match.games[match.games.length - 1];
        formatEl.textContent = '32副';
        scoreEl.textContent = game ? `${game.scoreA} : ${game.scoreB}` : '0 : 0';
      } else {
        formatEl.textContent = match.format;
        scoreEl.textContent = `${match.winsA} : ${match.winsB}`;
      }
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
    if (simStageBtn) simStageBtn.disabled = !match || season.stageEnded || season.finished || Boolean(realtime && !realtime.finished);

    summaryBtn.hidden = !lastSummary;
    renderShanhaiGroups();
    renderRoundList();
    renderResult();
    renderShanhaiSeasonBar();
    updateSaveDirtyStatus();
  }

  function render() {
    if (!season || bulkSimulating) return;
    if (SHANHAI_MODE) {
      renderShanhai();
      return;
    }

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
    if (simStageBtn) simStageBtn.disabled = !match || season.stageEnded || season.finished || Boolean(realtime && !realtime.finished);

    summaryBtn.hidden = !lastSummary;
    renderSeasonBar();
    renderRoundList();
    renderResult();
    updateSaveDirtyStatus();
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
      name.textContent = `${match.teamA.name} vs ${match.teamB.name} · ${match.allowDraw ? '32副' : match.format}`;

      const game = match.games[match.games.length - 1];
      const result = document.createElement('span');
      result.className = 'qy-round-result';
      result.textContent = match.done
        ? (match.allowDraw && game ? `${game.scoreA} : ${game.scoreB}` : `${match.winsA} : ${match.winsB}`)
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
    if (match.allowDraw) {
      const game = games[games.length - 1];
      title.textContent = `${match.teamA.name} ${game.scoreA} : ${game.scoreB} ${match.teamB.name}`;
    } else {
      title.textContent = `${match.teamA.name} ${match.winsA} : ${match.winsB} ${match.teamB.name}`;
    }

    const sub = document.createElement('p');
    sub.className = 'qy-result-sub';
    const totalA = games.reduce((sum, game) => sum + game.scoreA, 0);
    const totalB = games.reduce((sum, game) => sum + game.scoreB, 0);
    sub.textContent = `${match.allowDraw ? '32副单局' : match.format} · ${match.label} · ${scope === 'match' ? '整场结果' : '单局结果'} · 总分 ${totalA} : ${totalB}`;

    resultBody.append(title, sub);

    games.forEach((game) => {
      const section = document.createElement('div');
      section.className = 'qy-game';

      const head = document.createElement('div');
      head.className = 'qy-game-head';

      const name = document.createElement('span');
      const boardNote = game.boards.length < game.plannedBoards
        ? '（提前结束）'
        : (game.boards.length > game.plannedBoards ? `（加副 ${game.boards.length - game.plannedBoards} 副）` : '');
      name.textContent = `第 ${game.index} 局${game.deciding ? '（决胜局）' : ''} · ${game.plannedBoards} 副${boardNote}`;

      const score = document.createElement('span');
      score.textContent = `${game.scoreA} : ${game.scoreB} · ${game.winner ? `${game.winner.name} 胜` : '平局'}`;

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
    if (lastSummary.kind === 'season') {
      openSeasonSummary();
      return;
    }
    if (lastSummary.kind === 'shanhai-season') {
      openShanhaiSeasonSummary();
      return;
    }

    summaryTitle.textContent = lastSummary.title;
    summaryBody.classList.remove('is-season-summary');
    summaryBody.textContent = '';

    const note = document.createElement('p');
    note.className = 'modal-summary-note';
    const count = [...lastSummary.stats.values()].filter((stat) => stat.games > 0).length;
    note.textContent = `共 ${count} 名选手出场 · 按净胜分排序`;

    if (lastSummary.kind === 'shanhai-stage') {
      summaryBody.append(shStageReportBlock(lastSummary.stageIdx));
    }

    if (lastSummary.kind === 'overall' || lastSummary.kind === 'shanhai-overall') {
      const teamTitle = document.createElement('h4');
      teamTitle.className = 'qy-stats-title';
      teamTitle.textContent = '队伍最终排名';
      summaryBody.append(teamTitle, wrapTable(teamRankingsTable()));
    }

    summaryBody.append(note, wrapTable(statsTable(lastSummary.stats)));

    if (lastSummary.kind === 'shanhai-stage') {
      summaryAction.textContent = lastSummary.stageIdx === 6 ? '查看本届汇总' : '进入下一赛段';
    } else if (lastSummary.kind === 'shanhai-season') {
      summaryAction.textContent = ERA_MODE
        ? (era?.finished ? '重新开始赛年' : '进入交易窗口')
        : '重新开始山海杯';
    } else if (lastSummary.kind === 'shanhai-overall') {
      summaryAction.textContent = SHANHAI_SEASON_MODE ? '进入休赛期' : '重新开始山海杯';
    } else if (lastSummary.kind === 'season') {
      summaryAction.textContent = ERA_MODE
        ? (era?.finished ? '重新开始赛年' : '进入交易窗口')
        : '重新开始赛季';
    } else if (lastSummary.kind === 'overall') {
      if (SEASON_MODE && seasonCup && !seasonCup.finished) {
        summaryAction.textContent = '进入休赛期';
      } else {
        summaryAction.textContent = '重新开始赛季';
      }
    } else {
      summaryAction.textContent = season.stageIdx < 4 ? '进入下一赛段' : '继续';
    }

    openModal(summaryModal);
  }

  function handleSummaryAction() {
    closeModal(summaryModal);
    if (!lastSummary) return;

    if (lastSummary.kind === 'shanhai-stage') {
      const stageIdx = lastSummary.stageIdx;
      lastSummary = null;
      if (stageIdx === 0) {
        shStartGroupStage(1);
      } else if (stageIdx === 1) {
        shStartKnockoutStage(2, season.qualifiers);
      } else if (stageIdx === 2) {
        shStartKnockoutStage(3, shanhai.stageWinners);
      } else if (stageIdx === 3) {
        shStartKnockoutStage(4, shanhai.stageWinners);
      } else if (stageIdx === 4) {
        shStartKnockoutStage(5, shanhai.thirdTeams);
      } else if (stageIdx === 5) {
        shStartKnockoutStage(6, shanhai.finalists);
      } else {
        finishShanhaiTournament();
      }
      return;
    }

    if (lastSummary.kind === 'shanhai-season') {
      if (ERA_MODE) {
        if (era?.finished) {
          startEra();
          return;
        }
        if (era) {
          era.tradeWindow = true;
          era.tradeStart = era.tradeStart || new Date(shanhaiCup.clock);
          era.nextYear = era.currentYear + 1;
        }
        lastSummary = null;
        render();
        tipEl.textContent = '已进入赛年交易窗口，点击「推进到下一赛年」继续。';
        return;
      }
      shStartSeasonCup();
      return;
    }

    if (lastSummary.kind === 'shanhai-overall') {
      if (SHANHAI_SEASON_MODE) {
        shanhaiCup.idle = true;
        shanhai.phase = 'idle';
        render();
        tipEl.textContent = '已进入休赛期，点击「推进到下一届」继续。';
      } else {
        shStartTournament();
      }
      return;
    }

    if (SEASON_MODE && lastSummary.kind === 'season') {
      if (ERA_MODE) {
        if (era?.finished) {
          startEra();
          return;
        }
        if (era) {
          era.tradeWindow = true;
          era.tradeStart = era.tradeStart || new Date(seasonCup.clock);
          era.nextYear = era.currentYear + 1;
        }
        lastSummary = null;
        render();
        tipEl.textContent = '已进入赛年交易窗口，点击「推进到下一赛年」继续。';
        return;
      }
      startSeasonCup();
      return;
    }

    if (lastSummary.kind === 'overall') {
      if (SEASON_MODE && seasonCup && !seasonCup.finished) {
        seasonCup.idle = true;
        seasonCup.idleStart = seasonCup.idleStart || new Date(seasonCup.clock);
        seasonCup.idleNext = seasonCup.currentIndex + 1;
        lastSummary = null;
        render();
        tipEl.textContent = '已进入休赛期，点击「推进到下一届」继续。';
        return;
      }
      if (SEASON_MODE) {
        startSeasonCup();
        return;
      }
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
      table.explain = [];
      table.playedRanks = {};
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
    const reason = realtime.instant || sync ? null : { text: '' };
    const bid = chooseBid(entry, table.hands[seat], table.highestBid, table.bidCursor, reason);
    table.bids[seat] = bid;
    if (reason) {
      table.lastReason = { seat, player: entry.player.name, text: reason.text, turn: '叫分' };
      table.explain.push({ ...table.lastReason });
    } else {
      table.lastReason = null;
    }

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
    move.cards.forEach((card) => {
      table.playedRanks[card] = (table.playedRanks[card] || 0) + 1;
    });
    if (move.type === 'bomb' || move.type === 'rocket') table.bombs++;
    if (entry.seat !== table.landlordSeat) table.farmerPlayed = true;

    table.lastPlay = move;
    table.lastCards = [...move.cards];
    table.lastPlayer = { seat: entry.seat, team: entry.team };
    table.passCount = 0;

    rtLogLine(table, `${entry.player.name} 出 ${sortCards(move.cards).join(' ')}（${RT_MOVE_NAMES[move.type] || move.type}）`);
  }

  function rtStepPlay(table, sync = false) {
    if (!realtime || realtime.finished || table.phase !== 'playing') return;

    const seat = table.turnSeat;
    const entry = table.seatPlayers[seat];
    const hand = table.hands[seat];
    const reason = realtime.instant || sync ? null : { text: '' };
    let bottomRanks = [];
    let unseenBig = [];
    if (reason) {
      const playedRanks = table.playedRanks || {};
      const ownRanks = new Set(hand);
      bottomRanks = table.bottom.filter((card) => (playedRanks[card] || 0) === 0 && !ownRanks.has(card));
      unseenBig = ['2', 'X', 'D'].filter((card) => (playedRanks[card] || 0) === 0 && !ownRanks.has(card));
    }
    const moves = generateMoves(hand);
    let move;
    if (entry.player.strength >= 72 && !realtime.instant) {
      move = searchRealtimeMove(table, seat, moves, reason);
      if (move === null && !table.lastPlay) {
        reason.text = '';
        move = chooseRealtimeMove(table, seat, hand, moves, reason);
      }
    } else {
      move = chooseRealtimeMove(table, seat, hand, moves, reason);
    }
    if (reason && !reason.text) {
      if (bottomRanks.length > 0) reason.text = '留意未出的底牌';
      else if (unseenBig.length === 0) reason.text = '大牌已现，放心控场';
      else reason.text = table.lastPlay ? '正常跟牌' : '弱牌开路';
    }
    if (reason) {
      table.lastReason = { seat, player: entry.player.name, text: reason.text, turn: '出牌' };
      table.explain.push({ ...table.lastReason });
    } else {
      table.lastReason = null;
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
      players,
      explain: table.explain.slice()
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
    if (!SHANHAI_MODE && season.stageIdx >= 2) {
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

    if (diff === 0 && !realtime.match.allowDraw) {
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
    const winner = realtime.scoreA === realtime.scoreB
      ? null
      : (realtime.scoreA > realtime.scoreB ? match.teamA : match.teamB);
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

    if (winner === match.teamA) match.winsA++;
    else if (winner === match.teamB) match.winsB++;
    match.games.push(game);
    if (SHANHAI_SEASON_MODE) shAdvanceClockForGame(game, match);
    if (SEASON_MODE) qyAdvanceClockForGame(game, match);

    const matchComplete =
      match.winsA >= match.target ||
      match.winsB >= match.target ||
      (match.allowDraw && match.games.length >= match.formatN);

    if (matchComplete) {
      match.done = true;
      match.winnerTeam = match.winsA > match.winsB ? match.teamA : (match.winsB > match.winsA ? match.teamB : null);
      if (match.groupId) shFinalizeGroupMatch(match);
      else finalizeMatch(match);
      if (SHANHAI_SEASON_MODE) shSyncClockToNextScheduledTime(match);
      if (SEASON_MODE) qySyncClockToNextScheduledTime(match);
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

    const deciding = !match.allowDraw &&
      season.stageIdx >= 1 &&
      match.winsA === match.target - 1 &&
      match.winsB === match.target - 1;
    const plannedBoards = deciding
      ? (match.decidingBoards || DECIDING_BOARDS)
      : (match.boardsPerGame || BOARDS_PER_GAME[season.stageIdx]);

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

  const RT_STYLES = ['稳健型', '控制型', '博弈型', '激进型'];

  function rtStyleBadge(player) {
    return RT_STYLES[hash(`${player.account || player.name}:style`) % RT_STYLES.length];
  }

  function rtAvatarWrap(entry, table, match, badge) {
    const wrap = document.createElement('div');
    wrap.className = 'rt-avatar-wrap';

    if (badge) {
      const badgeEl = document.createElement('span');
      badgeEl.className = 'rt-player-badge';
      badgeEl.textContent = badge;
      if (badge === '稳健型' || badge === '控制型' || badge === '博弈型' || badge === '激进型') badgeEl.classList.add('is-style');
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
        badge: badge || rtStyleBadge(entry.player)
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
        hand: table.hands[entry.seat],
        badge: rtStyleBadge(entry.player)
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

    const reason = document.createElement('p');
    reason.className = 'rt-reason';
    if (table.lastReason) {
      reason.textContent = `${table.lastReason.turn}：${table.lastReason.text}`;
    } else {
      reason.textContent = table.lastPlay ? '牌权进行中' : '自由出牌';
    }
    center.append(reason);

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

    const recent = table.log.slice(-5);
    if (table.lastReason && realtime && !realtime.instant) {
      const reasonLine = `战术：${table.lastReason.player} ${table.lastReason.text}`;
      if (!recent.includes(reasonLine)) recent.push(reasonLine);
    }
    rtLog.textContent = recent.join('\n');

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
    sub.textContent = `${game.winner ? `${game.winner.name} 获胜` : '平局'} · ${realtime.boards.length} 副 · ${realtime.gameStats.size} 名选手出场`;

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

    rtResult.append(title, sub);

    const review = document.createElement('details');
    review.className = 'rt-review';
    const summary = document.createElement('summary');
    summary.textContent = '查看关键决策';
    review.append(summary);

    const reviewBody = document.createElement('div');
    reviewBody.className = 'rt-review-body';
    realtime.boards.forEach((board) => {
      [board.table1, board.table2].forEach((result) => {
        const list = (result.explain || []).filter((item) => item.turn === '出牌').slice(-10);
        if (list.length === 0) return;
        const block = document.createElement('div');
        block.className = 'rt-review-board';
        const heading = document.createElement('strong');
        heading.textContent = `第 ${board.index + 1} 副 · ${result.table} 桌`;
        block.append(heading);
        list.forEach((item) => {
          const line = document.createElement('p');
          line.textContent = `${item.player}：${item.text}`;
          block.append(line);
        });
        reviewBody.append(block);
      });
    });
    if (reviewBody.children.length > 0) review.append(reviewBody);
    else review.hidden = true;
    rtResult.append(review, actions);
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

  function setSaveStatus(text, kind = '') {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = text;
    saveStatusEl.classList.remove('is-success', 'is-error');
    if (kind) saveStatusEl.classList.add(kind);
  }

  function saveSignature() {
    const match = season?.currentMatch;
    return [
      currentSaveLabel(),
      season?.stageIdx,
      season?.stageEnded ? 1 : 0,
      season?.finished ? 1 : 0,
      match ? `${match.winsA}:${match.winsB}:${match.games.length}:${match.done ? 1 : 0}` : '',
      season?.stageStats?.size || 0,
      seasonCup?.currentIndex ?? '',
      seasonCup?.clock?.getTime?.() || '',
      seasonCup?.idle ? 1 : 0,
      seasonCup?.idleNext ?? '',
      seasonCup?.notifications?.length ?? '',
      shanhaiCup?.currentIndex ?? '',
      shanhaiCup?.idle ? 1 : 0,
      shanhaiCup?.clock?.getTime?.() || '',
      shanhai?.roundIndex ?? '',
      shanhai?.groups?.length ?? '',
      era?.currentYear ?? '',
      era?.seasonNo ?? '',
      era?.tradeWindow ? 1 : 0,
      era?.finished ? 1 : 0,
      era?.history?.length ?? ''
    ].join('|');
  }

  function updateSaveDirtyStatus() {
    if (!SAVE_MODE || !saveStatusEl) return;
    const signature = saveSignature();
    if (!lastSavedSignature) {
      lastSavedSignature = signature;
      return;
    }
    if (signature !== lastSavedSignature) {
      setSaveStatus('有未导出的进度');
    }
  }

  function currentSaveLabel() {
    if (SAVE_MODE === 'qingyun-era' && era) {
      const event = seasonCup?.events?.[seasonCup.currentIndex];
      let stage = era.finished ? '赛年结束' : (era.tradeWindow ? '赛年交易窗口' : (STAGE_NAMES[season?.stageIdx] || '未开始'));
      if (seasonCup?.idle) stage = `休赛期 · 下一届 ${SEASON_EVENT_DEFS[seasonCup.idleNext]?.label || ''}`.trim();
      return `S${era.seasonNo} · ${era.currentYear} · ${event?.label || '青云杯'} · ${stage}`;
    }
    if (SAVE_MODE === 'shanhai-era' && era) {
      const event = shanhaiCup?.events?.[shanhaiCup.currentIndex];
      let stage = era.finished ? '赛年结束' : (era.tradeWindow ? '赛年交易窗口' : (SHANHAI_STAGE_NAMES[season?.stageIdx] || '未开始'));
      if (shanhaiCup?.idle) stage = `休赛期 · 下一届 ${SHANHAI_EVENT_DEFS[shanhaiCup.idleNext]?.label || ''}`.trim();
      return `S${era.seasonNo} · ${era.currentYear} · ${event?.label || '山海杯'} · ${stage}`;
    }
    if (SAVE_MODE === 'qingyun-season') {
      const event = seasonCup?.events?.[seasonCup.currentIndex];
      let stage = STAGE_NAMES[season?.stageIdx] || '未开始';
      if (ERA_MODE && era) {
        const seasonLabel = `S${era.seasonNo} · ${era.currentYear}`;
        if (era.finished) stage = '赛年结束';
        else if (era.tradeWindow) stage = '赛年交易窗口';
        else if (seasonCup?.idle) {
          const next = SEASON_EVENT_DEFS[seasonCup.idleNext];
          stage = `休赛期 · 下一届 ${next?.label || ''}`.trim();
        } else if (season?.finished) stage = '本届结束';
        return `${seasonLabel} · ${event?.label || '青云杯'} · ${stage}`;
      }
      if (seasonCup?.finished) stage = '赛季结束';
      else if (seasonCup?.idle) {
        const next = SEASON_EVENT_DEFS[seasonCup.idleNext];
        stage = `休赛期 · 下一届 ${next?.label || ''}`.trim();
      } else if (season?.finished) {
        stage = '本届结束';
      }
      return `${event?.label || '青云杯'} · ${stage}`;
    }

    const event = shanhaiCup?.events?.[shanhaiCup.currentIndex];
    let stage = SHANHAI_STAGE_NAMES[season?.stageIdx] || '未开始';
    if (ERA_MODE && era) {
      const seasonLabel = `S${era.seasonNo} · ${era.currentYear}`;
      if (era.finished) stage = '赛年结束';
      else if (era.tradeWindow) stage = '赛年交易窗口';
      else if (shanhaiCup?.idle) {
        stage = `休赛期 · 下一届 ${SHANHAI_EVENT_DEFS[shanhaiCup.idleNext]?.label || ''}`.trim();
      }
      return `${seasonLabel} · ${event?.label || '山海杯'} · ${stage}`;
    }
    if (shanhaiCup?.finished) stage = '赛季结束';
    else if (shanhaiCup?.idle) {
      stage = `休赛期 · 下一届 ${SHANHAI_EVENT_DEFS[shanhaiCup.idleNext]?.label || ''}`.trim();
    }
    return `${event?.label || '山海杯'} · ${stage}`;
  }

  function seasonSnapshot() {
    return {
      teams,
      officialTeams,
      season,
      seasonCup,
      era,
      shanhai,
      shanhaiCup,
      preserveStrengths,
      lastSummary,
      lastResult
    };
  }

  function validateImportedSave(save) {
    if (!save || save.mode !== SAVE_MODE) {
      const target = save?.mode?.startsWith('shanhai') ? '山海杯' : '青云杯';
      const source = save?.mode?.includes('era') ? '赛年' : '赛季';
      throw new Error(`这是${target}${source}存档，请在对应页面导入`);
    }

    const state = save.state;
    if (!state || typeof state !== 'object') throw new Error('存档缺少赛季数据');
    if (!Array.isArray(state.teams) || !Array.isArray(state.officialTeams)) {
      throw new Error('存档缺少战队数据');
    }
    if (!state.season || typeof state.season !== 'object' || typeof state.season.stageIdx !== 'number') {
      throw new Error('存档缺少赛段数据');
    }

    if (SAVE_MODE === 'qingyun-season' || SAVE_MODE === 'qingyun-era') {
      if (!state.seasonCup || !Array.isArray(state.seasonCup.events)) {
        throw new Error('存档缺少青云杯赛季进度');
      }
    } else if (!state.shanhaiCup || !Array.isArray(state.shanhaiCup.events) || !state.shanhai) {
      throw new Error('存档缺少山海杯赛季进度');
    }
    if (ERA_MODE && (!state.era || !Array.isArray(state.era.history))) {
      throw new Error('存档缺少赛年进度');
    }
  }

  function applyImportedSave(save) {
    if (realtime) abortRealtime();
    closeModal(summaryModal);
    closeModal(restartModal);

    const state = save.state;
    if (ERA_MODE && state.era) {
      if (!Array.isArray(state.era.history)) state.era.history = [];
      if (!Array.isArray(state.era.notifications)) state.era.notifications = [];
      if (state.era.tradeStart === undefined) state.era.tradeStart = null;
      if (state.era.tradeWindow === undefined) state.era.tradeWindow = false;
      if (state.era.nextYear === undefined) state.era.nextYear = null;
    }
    if (state.seasonCup) {
      if (!Array.isArray(state.seasonCup.notifications)) state.seasonCup.notifications = [];
      if (!state.seasonCup.clock) state.seasonCup.clock = qyEventDate(state.seasonCup.currentIndex || 0);
      if (state.seasonCup.idle === undefined) state.seasonCup.idle = false;
      if (state.seasonCup.idleStart === undefined) state.seasonCup.idleStart = null;
      if (state.seasonCup.idleNext === undefined) state.seasonCup.idleNext = null;
      if (state.seasonCup.idle && !Number.isInteger(state.seasonCup.idleNext)) {
        state.seasonCup.idleNext = Math.min(
          (state.seasonCup.currentIndex || 0) + 1,
          SEASON_EVENT_DEFS.length - 1
        );
      }
    }
    teams = state.teams;
    officialTeams = state.officialTeams;
    season = state.season;
    seasonCup = state.seasonCup || null;
    era = state.era || null;
    if (era) {
      if (seasonCup) seasonCup.notifications = era.notifications;
      if (shanhaiCup) shanhaiCup.notifications = era.notifications;
    }
    shanhai = state.shanhai || null;
    shanhaiCup = state.shanhaiCup || null;
    preserveStrengths = Boolean(state.preserveStrengths);
    lastSummary = state.lastSummary || null;
    lastResult = state.lastResult || null;
    realtime = null;
    bulkSimulating = false;

    render();
  }

  async function exportSeasonSave() {
    if (!SAVE_MODE) return;
    if (!window.NansnSeasonSave) {
      setSaveStatus('存档模块未加载', 'is-error');
      return;
    }

    const realtimeNote = realtime && !realtime.finished
      ? '当前实时对局尚未结束，导出后会从本局开始前继续。\n\n'
      : '';
    if (!confirm(`${realtimeNote}本页不会自动保存。关闭页面后，未导出的进度会丢失。\n\n点击确定后将下载存档文件，请妥善保管。`)) {
      return;
    }

    try {
      const save = window.NansnSeasonSave.createFile({
        mode: SAVE_MODE,
        appVersion: window.NANSN_SITE_VERSION || '',
        label: currentSaveLabel(),
        state: seasonSnapshot()
      });
      await window.NansnSeasonSave.download(
        save,
        window.NansnSeasonSave.filename(SAVE_MODE)
      );
      const label = save.label || currentSaveLabel();
      lastSavedSignature = saveSignature();
      setSaveStatus(`已导出 · ${label}`, 'is-success');
      tipEl.textContent = '存档文件已下载。关闭页面前请确认文件已经保存到本地。';
    } catch (error) {
      setSaveStatus(`导出失败：${error.message}`, 'is-error');
      alert(`导出失败：${error.message}`);
    }
  }

  async function importSeasonSave() {
    if (!SAVE_MODE) return;
    const file = saveFileInput?.files?.[0];
    if (!file) return;

    try {
      if (!window.NansnSeasonSave) throw new Error('存档模块未加载');

      const save = await window.NansnSeasonSave.readFile(file);
      validateImportedSave(save);

      if (save.appVersion && window.NANSN_SITE_VERSION && save.appVersion !== window.NANSN_SITE_VERSION) {
        if (!confirm(`存档来自 ${save.appVersion}，当前页面为 ${window.NANSN_SITE_VERSION}。\n\n继续导入可能不完全兼容，是否仍要导入？`)) {
          return;
        }
      }

      if (!confirm('导入会覆盖当前赛季进度。\n\n是否继续？')) return;

      applyImportedSave(save);
      lastSavedSignature = saveSignature();
      const savedAt = save.savedAt ? new Date(save.savedAt).toLocaleString('zh-CN') : '未知时间';
      setSaveStatus(`已导入 · ${save.label || currentSaveLabel()} · ${savedAt}`, 'is-success');
      tipEl.textContent = '存档导入成功，可以继续比赛。';
    } catch (error) {
      setSaveStatus(`导入失败：${error.message}`, 'is-error');
      alert(`导入失败：${error.message}`);
    } finally {
      if (saveFileInput) saveFileInput.value = '';
    }
  }

  if (SAVE_MODE) {
    saveExportBtn?.addEventListener('click', exportSeasonSave);
    saveImportBtn?.addEventListener('click', () => {
      if (!saveFileInput) return;
      saveFileInput.value = '';
      saveFileInput.click();
    });
    saveFileInput?.addEventListener('change', importSeasonSave);

    window.addEventListener('beforeunload', (event) => {
      if (!season || !lastSavedSignature) return;
      if (saveSignature() === lastSavedSignature) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  singleBtn.addEventListener('click', simulateSingleGame);
  wholeBtn.addEventListener('click', simulateWholeMatch);
  simStageBtn?.addEventListener('click', simulateStage);
  nextBtn.addEventListener('click', advanceMatch);
  summaryBtn.addEventListener('click', openSummary);
  summaryAction.addEventListener('click', handleSummaryAction);

  restartBtn.addEventListener('click', () => openModal(restartModal));
  restartConfirm.addEventListener('click', () => {
    if (ERA_MODE) startEra();
    else if (SHANHAI_MODE) {
      if (SHANHAI_SEASON_MODE) shStartSeasonCup();
      else shStartTournament();
    } else if (SEASON_MODE) startSeasonCup();
    else resetSeason();
  });
  seasonSummaryBtn?.addEventListener('click', openSeasonSummary);
  shanhaiSeasonSummaryBtn?.addEventListener('click', openShanhaiSeasonSummary);
  shanhaiAdvanceBtn?.addEventListener('click', shAdvanceSeason);
  seasonAdvanceBtn?.addEventListener('click', qyAdvanceSeason);

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
  if (ERA_MODE) startEra();
  else if (SHANHAI_MODE) {
    if (SHANHAI_SEASON_MODE) shStartSeasonCup();
    else shStartTournament();
  } else if (SEASON_MODE) startSeasonCup();
  else resetSeason();
})();

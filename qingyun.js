(() => {
  'use strict';

  const DATA = window.QINGYUN_DATA;
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

  const teams = DATA.teams.map((team, index) => ({ ...team, id: index }));

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

  function prepareTeams() {
    teams.forEach((team) => {
      team.seedBonus = team.seed ? 5 + (hash(`${team.name}:seed`) % 4) : 0;
      team.players.forEach((player) => {
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
      stat.net += net;
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
    return match;
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
    const groups = table === 1
      ? [
          { team: match.teamA, pair: match.pairA1, seats: ['E', 'W'] },
          { team: match.teamB, pair: match.pairB1, seats: ['S', 'N'] }
        ]
      : [
          { team: match.teamA, pair: match.pairA2, seats: ['S', 'N'] },
          { team: match.teamB, pair: match.pairB2, seats: ['E', 'W'] }
        ];

    const seatPlayers = {};
    groups.forEach((group) => {
      const seatOrder = shuffle(group.seats);
      group.pair.forEach((player, index) => {
        const seat = seatOrder[index];
        seatPlayers[seat] = { player, team: group.team, seat };
      });
    });

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
      const net = isLandlord
        ? (teamWon ? points : -points)
        : (teamWon ? points / 3 : -points / 3);

      recordPlayer(maps, entry.player, entry.team, isLandlord ? 'landlord' : 'farmer', bids[seat], teamWon, net);
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
        name: seatPlayers[seat].player.name,
        team: seatPlayers[seat].team,
        role: seat === landlordSeat ? 'landlord' : 'farmer',
        bid: bids[seat]
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
    prepareTeams();
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
          tableCell(stat.net.toFixed(1)),
          tableCell(formatPercent(stat.wins, stat.games)),
          tableCell(formatPercent(stat.landlordWins, stat.landlordGames)),
          tableCell(formatPercent(stat.farmerWins, stat.farmerGames)),
          tableCell(formatAverage(stat.bidSum, stat.games))
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

  singleBtn.addEventListener('click', simulateSingleGame);
  wholeBtn.addEventListener('click', simulateWholeMatch);
  nextBtn.addEventListener('click', advanceMatch);
  summaryBtn.addEventListener('click', openSummary);
  summaryAction.addEventListener('click', handleSummaryAction);

  restartBtn.addEventListener('click', () => openModal(restartModal));
  restartConfirm.addEventListener('click', resetSeason);

  resetSeason();
})();

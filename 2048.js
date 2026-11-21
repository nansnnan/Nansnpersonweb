(() => {
  'use strict';

  const SIZE = 4;
  const BEST_KEY = 'nansn-2048-best';
  const board = document.getElementById('game2048-board');
  const scoreEl = document.getElementById('game2048-score');
  const bestEl = document.getElementById('game2048-best');
  const statusEl = document.getElementById('game2048-status');
  const newBtn = document.getElementById('game2048-new');
  const overlay = document.getElementById('game2048-overlay');
  const overlayTitle = document.getElementById('game2048-overlay-title');
  const overlayText = document.getElementById('game2048-overlay-text');
  const continueBtn = document.getElementById('game2048-continue');
  const restartBtn = document.getElementById('game2048-restart');

  if (!board) return;

  const cells = [];
  for (let index = 0; index < SIZE * SIZE; index++) {
    const cell = document.createElement('div');
    cell.className = 'game2048-cell is-empty';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', '空格');
    board.insertBefore(cell, overlay);
    cells.push(cell);
  }

  let grid = createGrid();
  let score = 0;
  let best = readBest();
  let won = false;
  let keepPlaying = false;
  let over = false;

  function createGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function readBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function writeBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // 本地存储不可用时仍可正常游戏。
    }
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function emptyPositions() {
    const positions = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (grid[row][col] === 0) positions.push([row, col]);
      }
    }
    return positions;
  }

  function addRandomTile() {
    const positions = emptyPositions();
    if (positions.length === 0) return -1;
    const [row, col] = positions[Math.floor(Math.random() * positions.length)];
    grid[row][col] = Math.random() < 0.9 ? 2 : 4;
    return row * SIZE + col;
  }

  function getLine(direction, index) {
    const line = [];
    for (let offset = 0; offset < SIZE; offset++) {
      if (direction === 'left') line.push(grid[index][offset]);
      else if (direction === 'right') line.push(grid[index][SIZE - 1 - offset]);
      else if (direction === 'up') line.push(grid[offset][index]);
      else line.push(grid[SIZE - 1 - offset][index]);
    }
    return line;
  }

  function setLine(direction, index, values) {
    for (let offset = 0; offset < SIZE; offset++) {
      if (direction === 'left') grid[index][offset] = values[offset];
      else if (direction === 'right') grid[index][SIZE - 1 - offset] = values[offset];
      else if (direction === 'up') grid[offset][index] = values[offset];
      else grid[SIZE - 1 - offset][index] = values[offset];
    }
  }

  function mergeLine(line) {
    const values = line.filter(Boolean);
    const merged = [];
    let gained = 0;

    for (let index = 0; index < values.length; index++) {
      if (values[index] === values[index + 1]) {
        const value = values[index] * 2;
        merged.push(value);
        gained += value;
        index++;
      } else {
        merged.push(values[index]);
      }
    }

    while (merged.length < SIZE) merged.push(0);
    return { values: merged, gained };
  }

  function hasWonTile() {
    return grid.some((row) => row.includes(2048));
  }

  function canMove() {
    if (emptyPositions().length > 0) return true;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const value = grid[row][col];
        if (col + 1 < SIZE && grid[row][col + 1] === value) return true;
        if (row + 1 < SIZE && grid[row + 1][col] === value) return true;
      }
    }
    return false;
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (score > best) {
      best = score;
      writeBest(best);
    }
    if (bestEl) bestEl.textContent = String(best);
  }

  function updateOverlay() {
    if (!overlay) return;

    if (won && !keepPlaying) {
      overlay.hidden = false;
      overlayTitle.textContent = '达成 2048';
      overlayText.textContent = `当前得分 ${score}，可以继续挑战更大的数字。`;
      continueBtn.hidden = false;
      return;
    }

    if (over) {
      overlay.hidden = false;
      overlayTitle.textContent = '游戏结束';
      overlayText.textContent = `本局得分 ${score}，最高分 ${best}。`;
      continueBtn.hidden = true;
      return;
    }

    overlay.hidden = true;
  }

  function render(newTileIndex = -1) {
    for (let index = 0; index < cells.length; index++) {
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      const value = grid[row][col];
      const cell = cells[index];
      cell.textContent = value === 0 ? '' : String(value);
      cell.dataset.value = String(value);
      cell.classList.toggle('is-empty', value === 0);
      cell.classList.toggle('is-new', index === newTileIndex);
      cell.setAttribute('aria-label', value === 0 ? '空格' : String(value));
    }

    updateScore();
    updateOverlay();
  }

  function newGame() {
    grid = createGrid();
    score = 0;
    won = false;
    keepPlaying = false;
    over = false;
    addRandomTile();
    const newIndex = addRandomTile();
    setStatus('新游戏开始，努力合并到 2048。');
    render(newIndex);
    board.focus({ preventScroll: true });
  }

  function move(direction) {
    if (over || (won && !keepPlaying)) return;

    const before = grid.map((row) => row.join(',')).join('|');
    let gained = 0;

    for (let index = 0; index < SIZE; index++) {
      const line = getLine(direction, index);
      const merged = mergeLine(line);
      if (line.join(',') !== merged.values.join(',')) {
        setLine(direction, index, merged.values);
        gained += merged.gained;
      }
    }

    const after = grid.map((row) => row.join(',')).join('|');
    if (before === after) return;

    score += gained;
    const newIndex = addRandomTile();

    if (!keepPlaying && !won && hasWonTile()) {
      won = true;
      over = !canMove();
      setStatus('已达成 2048，可以继续挑战。');
      render(newIndex);
      return;
    }

    if (!canMove()) {
      over = true;
      setStatus('没有可移动的方块，游戏结束。');
    } else {
      setStatus(gained > 0 ? `合并得分 +${gained}。` : '继续移动方块。');
    }

    render(newIndex);
  }

  function continueGame() {
    keepPlaying = true;
    updateOverlay();
    setStatus('继续挑战更大的数字。');
    board.focus({ preventScroll: true });
  }

  newBtn?.addEventListener('click', newGame);
  restartBtn?.addEventListener('click', newGame);
  continueBtn?.addEventListener('click', continueGame);

  const KEY_DIRECTIONS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    d: 'right',
    w: 'up',
    s: 'down',
    A: 'left',
    D: 'right',
    W: 'up',
    S: 'down'
  };

  window.addEventListener('keydown', (event) => {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  });

  let pointerStart = null;

  board.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    try {
      board.setPointerCapture(event.pointerId);
    } catch {
      // 某些浏览器或合成事件不支持指针捕获。
    }
    board.focus({ preventScroll: true });
  });

  board.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      move(deltaX > 0 ? 'right' : 'left');
    } else {
      move(deltaY > 0 ? 'down' : 'up');
    }
  });

  board.addEventListener('pointercancel', () => {
    pointerStart = null;
  });

  newGame();
})();

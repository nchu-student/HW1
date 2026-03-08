/**
 * HW1: Grid Map & Policy Evaluation
 * Frontend interaction logic
 */

// ===== State =====
let gridSize = 5;
let startCell = null;
let endCell = null;
let obstacles = [];
let maxObstacles = 3; // n - 2
let phase = 'start'; // 'start' | 'end' | 'obstacle' | 'done'

// ===== DOM Elements =====
const sizeSlider   = document.getElementById('grid-size');
const sizeBadge    = document.getElementById('size-badge');
const btnGenerate  = document.getElementById('btn-generate');
const btnEvaluate  = document.getElementById('btn-evaluate');
const btnReset     = document.getElementById('btn-reset');
const gridContainer = document.getElementById('grid-container');
const instructions  = document.getElementById('instructions');
const gridSection   = document.getElementById('grid-section');
const evaluateSection = document.getElementById('evaluate-section');
const resultsSection  = document.getElementById('results-section');
const obstacleCount   = document.getElementById('obstacle-count');

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');

// Arrow symbols for policy display
const ARROW_MAP = {
    'up':    '↑',
    'down':  '↓',
    'left':  '←',
    'right': '→',
};

// ===== Slider =====
sizeSlider.addEventListener('input', () => {
    sizeBadge.textContent = sizeSlider.value;
});

// ===== Generate Grid =====
btnGenerate.addEventListener('click', () => {
    gridSize = parseInt(sizeSlider.value);
    maxObstacles = gridSize - 2;
    resetState();
    buildGrid();
    showSections();
});

function resetState() {
    startCell = null;
    endCell = null;
    obstacles = [];
    phase = 'start';
    resultsSection.style.display = 'none';
    btnEvaluate.disabled = true;
    updateSteps();
}

function showSections() {
    instructions.style.display = '';
    gridSection.style.display = '';
    evaluateSection.style.display = '';
    obstacleCount.textContent = maxObstacles;

    // Add fade-in animation
    [instructions, gridSection, evaluateSection].forEach((el, i) => {
        el.classList.remove('fade-in');
        void el.offsetWidth; // reflow
        el.classList.add('fade-in');
        el.style.animationDelay = `${i * 0.1}s`;
    });
}

function buildGrid() {
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 60px)`;

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            const num = r * gridSize + c + 1;
            cell.textContent = num;
            cell.addEventListener('click', () => onCellClick(r, c, cell));
            gridContainer.appendChild(cell);
        }
    }
}

// ===== Cell Click Handler =====
function onCellClick(row, col, cellEl) {
    const key = `${row},${col}`;

    // Add pop animation
    cellEl.classList.remove('cell-pop');
    void cellEl.offsetWidth;
    cellEl.classList.add('cell-pop');

    if (phase === 'start') {
        // If clicking a cell that's already an obstacle, ignore
        startCell = [row, col];
        cellEl.classList.add('start');
        phase = 'end';
        updateSteps();
    } else if (phase === 'end') {
        if (row === startCell[0] && col === startCell[1]) return; // can't be same as start
        endCell = [row, col];
        cellEl.classList.add('end');
        phase = 'obstacle';
        updateSteps();
        if (maxObstacles === 0) {
            phase = 'done';
            btnEvaluate.disabled = false;
            updateSteps();
        }
    } else if (phase === 'obstacle') {
        if (row === startCell[0] && col === startCell[1]) return;
        if (row === endCell[0] && col === endCell[1]) return;

        // Check if this cell is already an obstacle → toggle off
        const existingIdx = obstacles.findIndex(o => o[0] === row && o[1] === col);
        if (existingIdx !== -1) {
            obstacles.splice(existingIdx, 1);
            cellEl.classList.remove('obstacle');
            btnEvaluate.disabled = true;
            updateSteps();
            return;
        }

        if (obstacles.length >= maxObstacles) return; // already placed all

        obstacles.push([row, col]);
        cellEl.classList.add('obstacle');

        if (obstacles.length === maxObstacles) {
            phase = 'done';
            btnEvaluate.disabled = false;
        }
        updateSteps();
    }
}

function updateSteps() {
    step1.classList.remove('active', 'done');
    step2.classList.remove('active', 'done');
    step3.classList.remove('active', 'done');

    if (phase === 'start') {
        step1.classList.add('active');
    } else if (phase === 'end') {
        step1.classList.add('done');
        step2.classList.add('active');
    } else if (phase === 'obstacle') {
        step1.classList.add('done');
        step2.classList.add('done');
        step3.classList.add('active');
        obstacleCount.textContent = `${maxObstacles - obstacles.length}`;
    } else if (phase === 'done') {
        step1.classList.add('done');
        step2.classList.add('done');
        step3.classList.add('done');
        obstacleCount.textContent = '0';
    }
}

// ===== Reset Button =====
btnReset.addEventListener('click', () => {
    resetState();
    buildGrid();
});

// ===== Evaluate Button =====
btnEvaluate.addEventListener('click', async () => {
    btnEvaluate.disabled = true;
    btnEvaluate.innerHTML = '<span>⏳</span> 計算中...';

    try {
        const resp = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                n: gridSize,
                start: startCell,
                end: endCell,
                obstacles: obstacles,
            }),
        });
        const data = await resp.json();
        renderResults(data);
    } catch (err) {
        alert('評估失敗: ' + err.message);
    } finally {
        btnEvaluate.innerHTML = '<span>▶</span> 策略評估 (Policy Evaluation)';
        btnEvaluate.disabled = false;
    }
});

// ===== Render Results =====
function renderResults(data) {
    resultsSection.style.display = '';
    resultsSection.classList.remove('fade-in');
    void resultsSection.offsetWidth;
    resultsSection.classList.add('fade-in');

    // Meta info
    document.getElementById('results-meta').textContent =
        `γ = ${data.gamma} ｜ 收斂迭代次數: ${data.iterations}`;

    renderValueGrid(data.values);
    renderPolicyGrid(data.policies);
}

function renderValueGrid(values) {
    const n = values.length;
    const grid = document.getElementById('value-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

    // Find min/max for coloring
    let vmin = Infinity, vmax = -Infinity;
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (isSpecialCell(r, c)) continue;
            vmin = Math.min(vmin, values[r][c]);
            vmax = Math.max(vmax, values[r][c]);
        }
    }

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = document.createElement('div');
            cell.className = 'result-cell val-cell';

            if (isStartCell(r, c)) {
                cell.classList.add('cell-start');
            } else if (isEndCell(r, c)) {
                cell.classList.add('cell-end');
            } else if (isObstacleCell(r, c)) {
                cell.classList.add('cell-obstacle');
                cell.textContent = '■';
                grid.appendChild(cell);
                continue;
            }

            const v = values[r][c];
            cell.textContent = v.toFixed(2);

            if (v > 0) cell.classList.add('positive');
            else if (v < 0) cell.classList.add('negative');

            grid.appendChild(cell);
        }
    }
}

function renderPolicyGrid(policies) {
    const n = policies.length;
    const grid = document.getElementById('policy-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const cell = document.createElement('div');
            cell.className = 'result-cell pol-cell';

            if (isStartCell(r, c)) {
                cell.classList.add('cell-start');
            } else if (isEndCell(r, c)) {
                cell.classList.add('cell-end');
            } else if (isObstacleCell(r, c)) {
                cell.classList.add('cell-obstacle');
                cell.textContent = '■';
                grid.appendChild(cell);
                continue;
            }

            const action = policies[r][c];
            if (action) {
                cell.textContent = ARROW_MAP[action] || '·';
            } else {
                cell.textContent = '·';
            }
            grid.appendChild(cell);
        }
    }
}

// ===== Helper Functions =====
function isStartCell(r, c) {
    return startCell && startCell[0] === r && startCell[1] === c;
}
function isEndCell(r, c) {
    return endCell && endCell[0] === r && endCell[1] === c;
}
function isObstacleCell(r, c) {
    return obstacles.some(o => o[0] === r && o[1] === c);
}
function isSpecialCell(r, c) {
    return isStartCell(r, c) || isEndCell(r, c) || isObstacleCell(r, c);
}

/**
 * Confidence Intervals & Repeated Sampling Simulation
 *
 * Demonstrates the frequentist coverage probability by generating multiple
 * random samples, constructing z-intervals or t-intervals, and visually
 * tracking how many capture the fixed population mean.
 */

import {
  randomNormal, randomExponential,
  mean, std,
  normalInv, tInv,
  DARK_LAYOUT, $, fmt
} from '../../js/common.js';

// ─────────────────────────────────────────────────────────
//  State & Constants
// ─────────────────────────────────────────────────────────

const TRUE_MU = 50.0;
const POP_SIGMA = 10.0;

const STATE = {
  confLevel: 0.95,
  method: 'z',          // 'z' or 't'
  distribution: 'normal',
  sampleSize: 30,
  batchSize: 100,
  intervals: [],        // Current batch of intervals: { id, sample, mean, se, me, lower, upper, hit }
  totalDrawn: 0,
  totalHits: 0,
  animating: false,
  animationTimer: null,
};

// ─────────────────────────────────────────────────────────
//  Population Generators
// ─────────────────────────────────────────────────────────

function drawSingleVariate(dist) {
  if (dist === 'normal') {
    return randomNormal(TRUE_MU, POP_SIGMA);
  } else if (dist === 'exponential') {
    // Exp with mean 50
    return randomExponential(50);
  } else if (dist === 'uniform') {
    // Uniform with mean 50, std 10 => width = 10 * sqrt(12) ≈ 34.64 => [32.68, 67.32]
    return 32.68 + Math.random() * 34.64;
  } else if (dist === 'bimodal') {
    // 50% N(40, 4), 50% N(60, 4)
    return Math.random() < 0.5 ? randomNormal(40, 4) : randomNormal(60, 4);
  }
  return randomNormal(TRUE_MU, POP_SIGMA);
}

function drawSample(n, dist) {
  const arr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = drawSingleVariate(dist);
  }
  return arr;
}

// ─────────────────────────────────────────────────────────
//  Interval Calculation
// ─────────────────────────────────────────────────────────

function computeInterval(sampleArr, id = 1) {
  const n = sampleArr.length;
  const xBar = mean(sampleArr);
  const alpha = 1 - STATE.confLevel;

  let se, critVal, me;

  if (STATE.method === 'z') {
    // If pop is not normal or exp, known sigma is POP_SIGMA
    const popSd = STATE.distribution === 'exponential' ? 50.0 : POP_SIGMA;
    se = popSd / Math.sqrt(n);
    critVal = normalInv(1 - alpha / 2);
    me = critVal * se;
  } else {
    // Student's t with sample s
    const s = std(sampleArr, true);
    se = s / Math.sqrt(n);
    const df = Math.max(1, n - 1);
    critVal = tInv(1 - alpha / 2, df);
    me = critVal * se;
  }

  const lower = xBar - me;
  const upper = xBar + me;
  const hit = lower <= TRUE_MU && TRUE_MU <= upper;

  return {
    id,
    sample: sampleArr,
    mean: xBar,
    se,
    me,
    critVal,
    lower,
    upper,
    hit
  };
}

// ─────────────────────────────────────────────────────────
//  Main Initialization
// ─────────────────────────────────────────────────────────

export default function init() {
  const ciSelect = $('ci-level-select');
  const methodSelect = $('method-select');
  const popSelect = $('pop-select');
  const sampleSizeSlider = $('sample-size-slider');

  const btnDraw100 = $('btn-draw-100');
  const btnDraw1 = $('btn-draw-1');
  const btnAnimate = $('btn-animate');
  const btnReset = $('btn-reset');

  ciSelect.addEventListener('change', (e) => {
    STATE.confLevel = parseFloat(e.target.value);
    recomputeExistingIntervals();
    renderAll();
  });

  methodSelect.addEventListener('change', (e) => {
    STATE.method = e.target.value;
    recomputeExistingIntervals();
    renderAll();
  });

  popSelect.addEventListener('change', (e) => {
    STATE.distribution = e.target.value;
    runNewBatch(100);
  });

  sampleSizeSlider.addEventListener('input', (e) => {
    STATE.sampleSize = parseInt(e.target.value, 10);
    $('val-sample-size').textContent = STATE.sampleSize;
    runNewBatch(100);
  });

  btnDraw100.addEventListener('click', () => {
    stopAnimation();
    runNewBatch(100);
  });

  btnDraw1.addEventListener('click', () => {
    stopAnimation();
    addSingleInterval();
  });

  btnAnimate.addEventListener('click', () => {
    if (STATE.animating) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  btnReset.addEventListener('click', () => {
    stopAnimation();
    STATE.totalDrawn = 0;
    STATE.totalHits = 0;
    runNewBatch(100);
  });

  // Initial draw
  runNewBatch(100);
}

// ─────────────────────────────────────────────────────────
//  Batch Management
// ─────────────────────────────────────────────────────────

function runNewBatch(count = 100) {
  STATE.intervals = [];
  for (let i = 1; i <= count; i++) {
    const s = drawSample(STATE.sampleSize, STATE.distribution);
    const item = computeInterval(s, i);
    STATE.intervals.push(item);
    STATE.totalDrawn++;
    if (item.hit) STATE.totalHits++;
  }
  renderAll();
}

function addSingleInterval() {
  const nextId = STATE.intervals.length + 1;
  const s = drawSample(STATE.sampleSize, STATE.distribution);
  const item = computeInterval(s, nextId);
  STATE.intervals.push(item);
  STATE.totalDrawn++;
  if (item.hit) STATE.totalHits++;
  renderAll();
}

function recomputeExistingIntervals() {
  for (let i = 0; i < STATE.intervals.length; i++) {
    const s = STATE.intervals[i].sample;
    STATE.intervals[i] = computeInterval(s, STATE.intervals[i].id);
  }
}

function startAnimation() {
  STATE.animating = true;
  $('btn-animate').textContent = 'Stop Animation';
  $('btn-animate').className = 'btn btn-secondary';

  STATE.intervals = [];
  renderAll();

  let count = 0;
  STATE.animationTimer = setInterval(() => {
    addSingleInterval();
    count++;
    if (count >= 100) {
      stopAnimation();
    }
  }, 45);
}

function stopAnimation() {
  if (STATE.animating) {
    clearInterval(STATE.animationTimer);
    STATE.animating = false;
    $('btn-animate').textContent = 'Animate Accumulation';
    $('btn-animate').className = 'btn btn-outline';
  }
}

// ─────────────────────────────────────────────────────────
//  Rendering & Statistics
// ─────────────────────────────────────────────────────────

function renderAll() {
  const intervals = STATE.intervals;
  const nIntervals = intervals.length;

  $('badge-interval-count').textContent = `${nIntervals} Intervals`;

  if (nIntervals === 0) return;

  // Batch stats
  let batchHits = 0;
  let sumMe = 0;
  let lastCrit = intervals[0].critVal;

  for (let i = 0; i < nIntervals; i++) {
    if (intervals[i].hit) batchHits++;
    sumMe += intervals[i].me;
  }

  const batchRate = (batchHits / nIntervals) * 100;
  const cumRate = STATE.totalDrawn > 0 ? (STATE.totalHits / STATE.totalDrawn) * 100 : batchRate;
  const avgMe = sumMe / nIntervals;

  $('stat-batch-coverage').textContent = `${fmt(batchRate, 1)}%`;
  $('stat-batch-coverage').style.color = Math.abs(batchRate - STATE.confLevel * 100) < 5 ? 'var(--chart-emerald)' : 'var(--chart-rose)';
  $('stat-tally').textContent = `${batchHits} / ${nIntervals - batchHits}`;
  $('stat-cum-coverage').textContent = `${fmt(cumRate, 1)}% (${STATE.totalHits}/${STATE.totalDrawn})`;
  $('stat-crit-val').textContent = fmt(lastCrit, 3);
  $('stat-margin-error').textContent = `±${fmt(avgMe, 2)}`;

  renderForestPlot(intervals);
  renderSampleInspector(intervals[intervals.length - 1]);
}

function renderForestPlot(intervals) {
  const n = intervals.length;

  // Split into hit intervals and miss intervals
  const hitX = [];
  const hitY = [];
  const missX = [];
  const missY = [];

  const hitMeansX = [];
  const hitMeansY = [];
  const missMeansX = [];
  const missMeansY = [];

  for (let i = 0; i < n; i++) {
    const item = intervals[i];
    const yVal = i + 1;

    if (item.hit) {
      hitX.push(item.lower, item.upper, null);
      hitY.push(yVal, yVal, null);
      hitMeansX.push(item.mean);
      hitMeansY.push(yVal);
    } else {
      missX.push(item.lower, item.upper, null);
      missY.push(yVal, yVal, null);
      missMeansX.push(item.mean);
      missMeansY.push(yVal);
    }
  }

  const traceHitLines = {
    x: hitX,
    y: hitY,
    mode: 'lines',
    name: 'Captured μ',
    line: { color: '#10b981', width: 1.75 },
    hoverinfo: 'none'
  };

  const traceHitMeans = {
    x: hitMeansX,
    y: hitMeansY,
    mode: 'markers',
    name: 'Hit Mean (X̄)',
    marker: { color: '#10b981', size: 3.5 },
    hoverinfo: 'x+y'
  };

  const traceMissLines = {
    x: missX,
    y: missY,
    mode: 'lines',
    name: 'Missed μ',
    line: { color: '#f43f5e', width: 2.25 },
    hoverinfo: 'none'
  };

  const traceMissMeans = {
    x: missMeansX,
    y: missMeansY,
    mode: 'markers',
    name: 'Missed Mean (X̄)',
    marker: { color: '#f43f5e', size: 4.5, symbol: 'x' },
    hoverinfo: 'x+y'
  };

  const layout = {
    ...DARK_LAYOUT,
    title: { text: `Coverage: ${intervals.filter(it => it.hit).length}/${n} Captured (${fmt((intervals.filter(it => it.hit).length/n)*100, 1)}%)`, font: { size: 13, color: '#fafafa' } },
    xaxis: {
      ...DARK_LAYOUT.xaxis,
      title: 'Value',
      range: [35, 65]
    },
    yaxis: {
      ...DARK_LAYOUT.yaxis,
      title: 'Sample Trial #',
      range: [0, Math.max(25, n + 1)],
      autorange: false
    },
    shapes: [
      {
        type: 'line',
        x0: TRUE_MU,
        x1: TRUE_MU,
        y0: 0,
        y1: Math.max(25, n + 1),
        line: { color: '#f59e0b', width: 2, dash: 'dash' }
      }
    ],
    showlegend: true
  };

  Plotly.react('plot-forest', [traceHitLines, traceHitMeans, traceMissLines, traceMissMeans], layout, { responsive: true, displayModeBar: false });
}

function renderSampleInspector(selectedItem) {
  if (!selectedItem) return;

  const raw = Array.from(selectedItem.sample);
  const n = raw.length;

  $('inspect-label').textContent = `Sample #${selectedItem.id} (${selectedItem.hit ? 'HIT' : 'MISSED'})`;

  // Jittered scatter plot of observations
  const jitterY = raw.map(() => 0.85 + (Math.random() - 0.5) * 0.25);

  const tracePoints = {
    x: raw,
    y: jitterY,
    mode: 'markers',
    name: 'Observations (xᵢ)',
    marker: { color: '#38bdf8', size: 5.5, opacity: 0.65 },
    hoverinfo: 'x'
  };

  // Mean marker with error bar
  const traceMean = {
    x: [selectedItem.mean],
    y: [1.3],
    mode: 'markers',
    name: `X̄ ± ME [${fmt(selectedItem.lower)}, ${fmt(selectedItem.upper)}]`,
    error_x: {
      type: 'data',
      array: [selectedItem.me],
      visible: true,
      color: selectedItem.hit ? '#10b981' : '#f43f5e',
      thickness: 2.5,
      width: 8
    },
    marker: {
      color: selectedItem.hit ? '#10b981' : '#f43f5e',
      size: 9,
      symbol: 'diamond'
    },
    hoverinfo: 'x'
  };

  const layout = {
    ...DARK_LAYOUT,
    title: { text: `Sample #${selectedItem.id} Breakdown (n=${n})`, font: { size: 13, color: '#fafafa' } },
    xaxis: {
      ...DARK_LAYOUT.xaxis,
      title: 'Values',
      range: [35, 65]
    },
    yaxis: {
      ...DARK_LAYOUT.yaxis,
      title: '',
      showticklabels: false,
      range: [0.5, 1.6]
    },
    shapes: [
      {
        type: 'line',
        x0: TRUE_MU,
        x1: TRUE_MU,
        y0: 0.5,
        y1: 1.6,
        line: { color: '#f59e0b', width: 2, dash: 'dash' }
      }
    ],
    showlegend: false
  };

  Plotly.react('plot-sample-inspect', [tracePoints, traceMean], layout, { responsive: true, displayModeBar: false });
}


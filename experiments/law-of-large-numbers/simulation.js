/**
 * Law of Large Numbers (LLN) Interactive Simulation
 *
 * Simulates multiple random paths and tracks their running cumulative averages,
 * demonstrating how sample means converge almost surely to the expected value.
 */

import { DARK_LAYOUT, $, fmt } from '../../js/common.js';

const STATE = {
  distribution: 'coin',
  totalTrials: 1000,
  numPaths: 3,
  xScale: 'linear',
  animating: false,
  animationId: null,
  currentStep: 0,
  pathsData: [], // array of Float64Arrays representing running averages
  expectedValue: 0.5,
};

const DISTRIBUTIONS = {
  coin: {
    name: 'Fair Coin Toss (Heads=1, Tails=0)',
    mu: 0.5,
    sample: () => (Math.random() < 0.5 ? 1 : 0),
    yRange: [-0.1, 1.1],
  },
  die: {
    name: 'Fair Six-Sided Die',
    mu: 3.5,
    sample: () => Math.floor(Math.random() * 6) + 1,
    yRange: [0.8, 6.2],
  },
  normal: {
    name: 'Standard Normal N(0, 1)',
    mu: 0.0,
    sample: () => {
      let u1, u2;
      do { u1 = Math.random(); } while (u1 === 0);
      u2 = Math.random();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    yRange: [-3, 3],
  },
  exponential: {
    name: 'Exponential (λ=0.5, μ=2.0)',
    mu: 2.0,
    sample: () => -Math.log(Math.max(1e-12, Math.random())) * 2.0,
    yRange: [0, 5],
  },
  cauchy: {
    name: 'Standard Cauchy (Infinite Mean)',
    mu: null, // undefined
    sample: () => {
      // ratio of two independent standard normals or tan(pi * (U - 0.5))
      return Math.tan(Math.PI * (Math.random() - 0.5));
    },
    yRange: null, // auto-scale
  },
};

const PATH_COLORS = [
  '#6c63ff', // accent purple
  '#34d399', // emerald
  '#38bdf8', // sky blue
  '#fbbf24', // amber
  '#f472b6', // pink
  '#a78bfa', // violet
  '#2dd4bf', // teal
  '#fb923c', // orange
];

/**
 * Generate full simulation paths for the current settings.
 */
function generateData() {
  const dist = DISTRIBUTIONS[STATE.distribution];
  STATE.expectedValue = dist.mu;
  const N = STATE.totalTrials;
  const P = STATE.numPaths;

  STATE.pathsData = [];

  for (let p = 0; p < P; p++) {
    const runningMeans = new Float64Array(N);
    let cumulativeSum = 0;

    for (let i = 0; i < N; i++) {
      cumulativeSum += dist.sample();
      runningMeans[i] = cumulativeSum / (i + 1);
    }
    STATE.pathsData.push(runningMeans);
  }
}

/**
 * Update the Plotly line chart.
 * @param {number} upToTrial - Plot data up to this trial number (for animation)
 */
function updatePlot(upToTrial = null) {
  const N = upToTrial ?? STATE.totalTrials;
  const dist = DISTRIBUTIONS[STATE.distribution];
  const traces = [];

  // Downsample if N is large for fast rendering
  const stepSize = Math.max(1, Math.floor(N / 1000));
  const xVals = [];
  for (let i = 1; i <= N; i += stepSize) {
    xVals.push(i);
  }
  if (xVals[xVals.length - 1] !== N) {
    xVals.push(N);
  }

  // Add path traces
  STATE.pathsData.forEach((path, idx) => {
    const yVals = xVals.map(n => path[n - 1]);
    const color = PATH_COLORS[idx % PATH_COLORS.length];

    traces.push({
      x: xVals,
      y: yVals,
      mode: 'lines',
      name: `Path ${idx + 1}`,
      line: {
        color: color,
        width: idx === 0 ? 2.5 : 1.5,
        opacity: idx === 0 ? 0.95 : 0.65,
      },
      hoverinfo: 'x+y+name',
    });
  });

  // Reference line for theoretical expected value (if defined)
  const layout = {
    ...DARK_LAYOUT,
    title: {
      text: `${dist.name} — Running Average vs. Trial (n)`,
      font: { color: '#e8eaed', size: 15, family: 'Inter, sans-serif' },
    },
    xaxis: {
      ...DARK_LAYOUT.xaxis,
      title: 'Number of Trials (n)',
      type: STATE.xScale === 'log' ? 'log' : 'linear',
      range: STATE.xScale === 'log' ? [0, Math.log10(N)] : [1, N],
    },
    yaxis: {
      ...DARK_LAYOUT.yaxis,
      title: 'Sample Average (X̄ₙ)',
      autorange: STATE.distribution === 'cauchy' ? true : false,
      range: dist.yRange ? dist.yRange : undefined,
    },
    shapes: [],
    annotations: [],
  };

  if (dist.mu !== null) {
    layout.shapes.push({
      type: 'line',
      x0: 1,
      x1: N,
      y0: dist.mu,
      y1: dist.mu,
      line: {
        color: '#f87171',
        width: 2.5,
        dash: 'dash',
      },
    });

    layout.annotations.push({
      x: STATE.xScale === 'log' ? Math.log10(N * 0.9) : N * 0.9,
      y: dist.mu,
      text: `μ = ${dist.mu}`,
      showarrow: false,
      yshift: 14,
      font: { color: '#f87171', size: 13, family: 'JetBrains Mono, monospace' },
      bgcolor: 'rgba(26, 29, 39, 0.85)',
      bordercolor: '#f87171',
      borderwidth: 1,
      borderpad: 4,
    });
  }

  // @ts-ignore
  Plotly.react('lln-chart', traces, layout, { responsive: true, displayModeBar: false });
}

/**
 * Update the statistical cards in the DOM.
 */
function updateStats(upToTrial = null) {
  const N = upToTrial ?? STATE.totalTrials;
  const dist = DISTRIBUTIONS[STATE.distribution];
  const path1 = STATE.pathsData[0];
  const finalMean = path1 ? path1[N - 1] : null;

  $('stat-trials').textContent = N.toLocaleString();

  if (dist.mu !== null) {
    $('stat-true-mean').textContent = fmt(dist.mu, 3);
  } else {
    $('stat-true-mean').textContent = 'Undefined (∞)';
  }

  if (finalMean !== null) {
    $('stat-final-mean').textContent = fmt(finalMean, 4);

    if (dist.mu !== null) {
      const absErr = Math.abs(finalMean - dist.mu);
      $('stat-abs-error').textContent = fmt(absErr, 4);
    } else {
      $('stat-abs-error').textContent = 'N/A';
    }
  } else {
    $('stat-final-mean').textContent = '—';
    $('stat-abs-error').textContent = '—';
  }
}

/**
 * Execute a complete simulation run.
 */
function runSimulation() {
  stopAnimation();
  generateData();
  updatePlot();
  updateStats();
}

/**
 * Stop any ongoing animation.
 */
function stopAnimation() {
  if (STATE.animating) {
    STATE.animating = false;
    if (STATE.animationId) {
      cancelAnimationFrame(STATE.animationId);
      STATE.animationId = null;
    }
    const btn = $('btn-animate');
    if (btn) btn.textContent = '🎬 Animate';
  }
}

/**
 * Animate the convergence of the sample means step-by-step.
 */
function startAnimation() {
  if (STATE.animating) {
    stopAnimation();
    return;
  }

  generateData();
  STATE.animating = true;
  const btn = $('btn-animate');
  if (btn) btn.textContent = '⏹ Stop';

  const total = STATE.totalTrials;
  let currentN = Math.max(2, Math.floor(total * 0.01));
  const growthRate = 1.05;

  function step() {
    if (!STATE.animating) return;

    currentN = Math.min(total, Math.ceil(currentN * growthRate) + 2);
    updatePlot(currentN);
    updateStats(currentN);

    if (currentN < total) {
      STATE.animationId = requestAnimationFrame(step);
    } else {
      stopAnimation();
    }
  }

  STATE.animationId = requestAnimationFrame(step);
}

/**
 * Initialize event handlers and initial render.
 */
export default function init() {
  // Bind inputs
  const distSelect = $('dist-select');
  const trialsSlider = $('trials-slider');
  const trialsValue = $('trials-value');
  const pathsSlider = $('paths-slider');
  const pathsValue = $('paths-value');
  const xScaleSelect = $('xscale-select');

  distSelect.addEventListener('change', (e) => {
    STATE.distribution = e.target.value;
    runSimulation();
  });

  trialsSlider.addEventListener('input', (e) => {
    STATE.totalTrials = parseInt(e.target.value, 10);
    trialsValue.textContent = STATE.totalTrials;
    runSimulation();
  });

  pathsSlider.addEventListener('input', (e) => {
    STATE.numPaths = parseInt(e.target.value, 10);
    pathsValue.textContent = STATE.numPaths;
    runSimulation();
  });

  xScaleSelect.addEventListener('change', (e) => {
    STATE.xScale = e.target.value;
    updatePlot();
  });

  $('btn-run').addEventListener('click', runSimulation);
  $('btn-animate').addEventListener('click', startAnimation);
  $('btn-reset').addEventListener('click', () => {
    distSelect.value = 'coin';
    STATE.distribution = 'coin';
    trialsSlider.value = '1000';
    STATE.totalTrials = 1000;
    trialsValue.textContent = '1000';
    pathsSlider.value = '3';
    STATE.numPaths = 3;
    pathsValue.textContent = '3';
    xScaleSelect.value = 'linear';
    STATE.xScale = 'linear';
    runSimulation();
  });

  // Initial execution
  runSimulation();
  console.log('Law of Large Numbers Simulation initialized ✅');
}


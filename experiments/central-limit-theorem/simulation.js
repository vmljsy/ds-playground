/**
 * Central Limit Theorem (CLT) Interactive Simulation
 *
 * A self-contained ES module that generates populations from various
 * distributions, repeatedly samples from them, and visualises both the
 * population histogram and the sampling distribution of the sample mean
 * using Plotly.js (expected as a global).
 *
 * Usage:  import init from './simulation.js';  init();
 */

// ─────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────

const STATE = {
  population: [],       // current population data
  sampleMeans: [],      // collected sample means
  popMean: 0,
  popStd: 0,
  sampleSize: 30,       // n
  numSamples: 1000,     // how many samples to draw
  distribution: 'exponential',
  animating: false,
  animationId: null,    // handle for cancelling animation
};

// Human-readable labels for each distribution key
const DIST_LABELS = {
  exponential: 'Exponential (λ=0.5)',
  uniform: 'Uniform (0–10)',
  bimodal: 'Bimodal',
  poisson: 'Poisson (λ=3)',
  beta_ushaped: 'Beta U-Shaped (0.5, 0.5)',
  dice: 'Fair Six-Sided Die',
};

// ─────────────────────────────────────────────────────────
//  Random-variate helpers
// ─────────────────────────────────────────────────────────

/**
 * Box-Muller transform – returns a single Normal(mean, std) variate.
 */
function boxMullerNormal(mean = 0, std = 1) {
  let u1, u2;
  do { u1 = Math.random(); } while (u1 === 0); // avoid log(0)
  u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * std + mean;
}

/**
 * Generate a Beta(alpha, beta) variate using Jöhnk's algorithm.
 * Works well for alpha, beta < 1.
 */
function betaRandom(alpha, beta) {
  // Jöhnk's algorithm for alpha,beta in (0,1)
  while (true) {
    const u1 = Math.random();
    const u2 = Math.random();
    const x = Math.pow(u1, 1 / alpha);
    const y = Math.pow(u2, 1 / beta);
    const s = x + y;
    if (s <= 1 && s > 0) {
      return x / s;
    }
  }
}

/**
 * Generate a Poisson(lambda) variate using Knuth's algorithm.
 */
function poissonRandom(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ─────────────────────────────────────────────────────────
//  Population generators (100 000 data points each)
// ─────────────────────────────────────────────────────────

const POPULATION_SIZE = 100_000;

const generators = {
  /** Exponential with scale = 2 (mean = 2) */
  exponential() {
    const data = new Float64Array(POPULATION_SIZE);
    for (let i = 0; i < POPULATION_SIZE; i++) {
      data[i] = -Math.log(Math.random()) * 2;
    }
    return data;
  },

  /** Continuous Uniform(0, 10) */
  uniform() {
    const data = new Float64Array(POPULATION_SIZE);
    for (let i = 0; i < POPULATION_SIZE; i++) {
      data[i] = Math.random() * 10;
    }
    return data;
  },

  /** Bimodal: 50 % Normal(3, 0.8) + 50 % Normal(8, 0.8) */
  bimodal() {
    const data = new Float64Array(POPULATION_SIZE);
    const half = POPULATION_SIZE / 2;
    for (let i = 0; i < POPULATION_SIZE; i++) {
      data[i] = i < half
        ? boxMullerNormal(3, 0.8)
        : boxMullerNormal(8, 0.8);
    }
    return data;
  },

  /** Poisson(λ = 3) */
  poisson() {
    const data = new Float64Array(POPULATION_SIZE);
    for (let i = 0; i < POPULATION_SIZE; i++) {
      data[i] = poissonRandom(3);
    }
    return data;
  },

  /** Beta(0.5, 0.5) — U-shaped distribution on (0, 1) */
  beta_ushaped() {
    const data = new Float64Array(POPULATION_SIZE);
    for (let i = 0; i < POPULATION_SIZE; i++) {
      data[i] = betaRandom(0.5, 0.5);
    }
    return data;
  },

  /** Fair six-sided die — discrete integers 1-6 */
  dice() {
    const data = new Float64Array(POPULATION_SIZE);
    for (let i = 0; i < POPULATION_SIZE; i++) {
      data[i] = Math.floor(Math.random() * 6) + 1;
    }
    return data;
  },
};

// ─────────────────────────────────────────────────────────
//  Statistics utilities
// ─────────────────────────────────────────────────────────

/** Compute the arithmetic mean of an array-like. */
function mean(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/** Compute the population standard deviation of an array-like. */
function std(arr, mu) {
  if (mu === undefined) mu = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - mu;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / arr.length);
}

/** Standard normal PDF for plotting the theoretical curve. */
function normalPdf(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

// ─────────────────────────────────────────────────────────
//  Sampling helpers
// ─────────────────────────────────────────────────────────

/**
 * Draw one sample of size `n` from `population` (with replacement)
 * and return its mean.
 */
function drawSampleMean(population, n) {
  let sum = 0;
  const len = population.length;
  for (let i = 0; i < n; i++) {
    sum += population[Math.floor(Math.random() * len)];
  }
  return sum / n;
}

// ─────────────────────────────────────────────────────────
//  Plotly chart helpers
// ─────────────────────────────────────────────────────────

/** Shared dark-theme layout defaults. */
function baseLayout(title) {
  return {
    title: { text: title, font: { size: 15, color: '#e8eaed' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8eaed', family: 'Inter' },
    xaxis: { gridcolor: '#2d3148', zerolinecolor: '#2d3148' },
    yaxis: { gridcolor: '#2d3148', zerolinecolor: '#2d3148', title: 'Density' },
    margin: { t: 50, r: 20, b: 50, l: 60 },
    showlegend: true,
    legend: { font: { color: '#9aa0a6' } },
    bargap: 0.05,
  };
}

/** Build population histogram traces + mean line. */
function populationTraces(population, popMean) {
  return [
    {
      x: Array.from(population),
      type: 'histogram',
      histnorm: 'probability density',
      marker: { color: 'rgba(70,130,180,0.6)', line: { color: 'rgba(70,130,180,0.9)', width: 1 } },
      name: 'Population',
    },
    // Vertical mean line (tall thin shape)
    {
      x: [popMean, popMean],
      y: [0, 1],         // will be scaled by yaxis range via yref below
      mode: 'lines',
      line: { color: '#ef4444', width: 2, dash: 'dash' },
      name: `Mean (${popMean.toFixed(2)})`,
      yref: 'paper',     // 0-1 covers full chart height
    },
  ];
}

/** Build sampling-distribution traces: histogram + normal curve + mean line. */
function samplingTraces(sampleMeans, popMean, popStd, n) {
  const theoreticalSE = popStd / Math.sqrt(n);

  // Build theoretical normal PDF curve (~200 points)
  const lo = popMean - 4 * theoreticalSE;
  const hi = popMean + 4 * theoreticalSE;
  const step = (hi - lo) / 200;
  const curveX = [];
  const curveY = [];
  for (let x = lo; x <= hi; x += step) {
    curveX.push(x);
    curveY.push(normalPdf(x, popMean, theoreticalSE));
  }

  return [
    {
      x: [...sampleMeans],
      type: 'histogram',
      histnorm: 'probability density',
      marker: { color: 'rgba(255,127,80,0.55)', line: { color: 'rgba(255,127,80,0.85)', width: 1 } },
      name: 'Sample means',
    },
    {
      x: curveX,
      y: curveY,
      mode: 'lines',
      line: { color: '#facc15', width: 2.5 },
      name: `N(μ, σ²/n)`,
    },
    {
      x: [popMean, popMean],
      y: [0, 1],
      mode: 'lines',
      line: { color: '#ef4444', width: 2, dash: 'dash' },
      name: `Pop. Mean (${popMean.toFixed(2)})`,
      yref: 'paper',
    },
  ];
}

// ─────────────────────────────────────────────────────────
//  Update functions
// ─────────────────────────────────────────────────────────

/** Render / update both Plotly charts. */
function updatePlots() {
  const distLabel = DIST_LABELS[STATE.distribution] || STATE.distribution;

  // -- Population chart --
  Plotly.react(
    'population-chart',
    populationTraces(STATE.population, STATE.popMean),
    baseLayout(`Population Distribution (${distLabel})`),
    { responsive: true, displayModeBar: false },
  );

  // -- Sampling distribution chart --
  Plotly.react(
    'sampling-chart',
    samplingTraces(STATE.sampleMeans, STATE.popMean, STATE.popStd, STATE.sampleSize),
    baseLayout(`Sampling Distribution of X̄  (n = ${STATE.sampleSize})`),
    { responsive: true, displayModeBar: false },
  );
}

/** Push computed statistics into the DOM. */
function updateStats() {
  const el = (id) => document.getElementById(id);

  el('stat-pop-mean').textContent = STATE.popMean.toFixed(2);
  el('stat-pop-std').textContent = STATE.popStd.toFixed(2);

  if (STATE.sampleMeans.length === 0) {
    el('stat-sample-mean').textContent = '—';
    el('stat-empirical-se').textContent = '—';
    el('stat-theoretical-se').textContent = (STATE.popStd / Math.sqrt(STATE.sampleSize)).toFixed(4);
    el('stat-ratio').textContent = '—';
    return;
  }

  const empiricalMean = mean(STATE.sampleMeans);
  const empiricalSE = std(STATE.sampleMeans, empiricalMean);
  const theoreticalSE = STATE.popStd / Math.sqrt(STATE.sampleSize);
  const ratio = empiricalSE / theoreticalSE;

  el('stat-sample-mean').textContent = empiricalMean.toFixed(2);
  el('stat-empirical-se').textContent = empiricalSE.toFixed(4);
  el('stat-theoretical-se').textContent = theoreticalSE.toFixed(4);
  el('stat-ratio').textContent = ratio.toFixed(2);
}

// ─────────────────────────────────────────────────────────
//  Core simulation
// ─────────────────────────────────────────────────────────

/**
 * Generate a fresh population, draw all samples at once,
 * and update the visualisation.
 */
function runSimulation() {
  // Stop any running animation first
  stopAnimation();

  // 1. Generate population
  const gen = generators[STATE.distribution];
  if (!gen) {
    console.error(`Unknown distribution: ${STATE.distribution}`);
    return;
  }
  STATE.population = gen();

  // 2. Compute population statistics
  STATE.popMean = mean(STATE.population);
  STATE.popStd = std(STATE.population, STATE.popMean);

  // 3. Draw samples and compute means
  STATE.sampleMeans = [];
  for (let i = 0; i < STATE.numSamples; i++) {
    STATE.sampleMeans.push(drawSampleMean(STATE.population, STATE.sampleSize));
  }

  // 4. Update UI
  updatePlots();
  updateStats();
}

// ─────────────────────────────────────────────────────────
//  Animated drawing mode
// ─────────────────────────────────────────────────────────

/** Stop a running animation gracefully. */
function stopAnimation() {
  STATE.animating = false;
  if (STATE.animationId !== null) {
    clearTimeout(STATE.animationId);
    STATE.animationId = null;
  }
  // Reset button label if element exists
  const btn = document.getElementById('btn-animate');
  if (btn) btn.textContent = 'Animate';
}

/**
 * Draw samples one batch at a time with a visible delay so the user
 * can watch the sampling distribution build up.
 */
function animateDrawing() {
  if (STATE.animating) {
    // If already animating, treat click as stop
    stopAnimation();
    updateStats();
    return;
  }

  // Generate a fresh population
  const gen = generators[STATE.distribution];
  if (!gen) return;
  STATE.population = gen();
  STATE.popMean = mean(STATE.population);
  STATE.popStd = std(STATE.population, STATE.popMean);
  STATE.sampleMeans = [];
  STATE.animating = true;

  const btn = document.getElementById('btn-animate');
  if (btn) btn.textContent = 'Stop';

  // Update population chart immediately
  const distLabel = DIST_LABELS[STATE.distribution] || STATE.distribution;
  Plotly.react(
    'population-chart',
    populationTraces(STATE.population, STATE.popMean),
    baseLayout(`Population Distribution (${distLabel})`),
    { responsive: true, displayModeBar: false },
  );

  const BATCH = 10; // samples per frame
  let drawn = 0;

  function step() {
    if (!STATE.animating || drawn >= STATE.numSamples) {
      // Finished
      stopAnimation();
      updateStats();
      return;
    }

    // Draw a batch
    const end = Math.min(drawn + BATCH, STATE.numSamples);
    for (let i = drawn; i < end; i++) {
      STATE.sampleMeans.push(drawSampleMean(STATE.population, STATE.sampleSize));
    }
    drawn = end;

    // Update counter in the animate button
    if (btn) btn.textContent = `Stop (${drawn}/${STATE.numSamples})`;

    // Refresh sampling chart & stats
    Plotly.react(
      'sampling-chart',
      samplingTraces(STATE.sampleMeans, STATE.popMean, STATE.popStd, STATE.sampleSize),
      baseLayout(`Sampling Distribution of X̄  (n = ${STATE.sampleSize})`),
      { responsive: true, displayModeBar: false },
    );
    updateStats();

    // Schedule next batch
    STATE.animationId = setTimeout(step, 10);
  }

  step();
}

// ─────────────────────────────────────────────────────────
//  Reset
// ─────────────────────────────────────────────────────────

function resetSimulation() {
  stopAnimation();
  STATE.sampleMeans = [];
  updatePlots();
  updateStats();
}

// ─────────────────────────────────────────────────────────
//  Initialisation
// ─────────────────────────────────────────────────────────

/**
 * Set up all event listeners and run the initial simulation.
 * Call this once after the DOM is ready.
 */
export default function init() {
  const el = (id) => document.getElementById(id);

  // ── Distribution dropdown ──
  const distSelect = el('dist-select');
  if (distSelect) {
    distSelect.value = STATE.distribution;
    distSelect.addEventListener('change', (e) => {
      STATE.distribution = e.target.value;
      runSimulation();
    });
  }

  // ── Sample size slider ──
  const sizeSlider = el('sample-size-slider');
  const sizeLabel = el('sample-size-value');
  if (sizeSlider) {
    sizeSlider.value = STATE.sampleSize;
    if (sizeLabel) sizeLabel.textContent = STATE.sampleSize;
    sizeSlider.addEventListener('input', (e) => {
      STATE.sampleSize = parseInt(e.target.value, 10);
      if (sizeLabel) sizeLabel.textContent = STATE.sampleSize;
      runSimulation();
    });
  }

  // ── Number of samples slider ──
  const numSlider = el('num-samples-slider');
  const numLabel = el('num-samples-value');
  if (numSlider) {
    numSlider.value = STATE.numSamples;
    if (numLabel) numLabel.textContent = STATE.numSamples;
    numSlider.addEventListener('input', (e) => {
      STATE.numSamples = parseInt(e.target.value, 10);
      if (numLabel) numLabel.textContent = STATE.numSamples;
      runSimulation();
    });
  }

  // ── Buttons ──
  const btnRun = el('btn-run');
  if (btnRun) btnRun.addEventListener('click', runSimulation);

  const btnAnimate = el('btn-animate');
  if (btnAnimate) btnAnimate.addEventListener('click', animateDrawing);

  const btnReset = el('btn-reset');
  if (btnReset) btnReset.addEventListener('click', resetSimulation);

  // ── Initial run ──
  runSimulation();

  console.log('CLT Simulation initialized');
}

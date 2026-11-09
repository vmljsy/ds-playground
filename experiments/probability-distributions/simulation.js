/**
 * Probability Distributions Interactive Simulator
 *
 * Renders interactive continuous and discrete distributions (PDF/PMF and CDF)
 * with dynamic parameter controls, interval probability integration, and KaTeX formulas.
 */

import {
  normalPdf, normalCdf,
  tPdf, tCdf,
  chiSqPdf, chiSqCdf,
  binomialPmf, poissonPmf,
  DARK_LAYOUT, $, fmt, linspace
} from '../../js/common.js';

// ─────────────────────────────────────────────────────────
//  Distribution Metadata & Definitions
// ─────────────────────────────────────────────────────────

const DISTRIBUTIONS = {
  normal: {
    name: 'Normal (Gaussian)',
    type: 'continuous',
    params: {
      mu: { label: 'Mean (μ)', min: -5, max: 5, step: 0.1, default: 0 },
      sigma: { label: 'Std Dev (σ)', min: 0.2, max: 4, step: 0.1, default: 1 }
    },
    defaultRange: [-1.96, 1.96],
    evalDomain(p) {
      const minX = p.mu - 4 * p.sigma;
      const maxX = p.mu + 4 * p.sigma;
      return { minX, maxX };
    },
    pdf(x, p) { return normalPdf(x, p.mu, p.sigma); },
    cdf(x, p) { return normalCdf(x, p.mu, p.sigma); },
    mean(p) { return p.mu; },
    variance(p) { return p.sigma * p.sigma; },
    formula: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left(-\\frac{(x - \\mu)^2}{2\\sigma^2}\\right)',
    application: 'The baseline distribution for measurement errors, physical traits, intelligence quotients, and the asymptotic limit of all independent additive random processes (CLT).'
  },

  student_t: {
    name: "Student's t-Distribution",
    type: 'continuous',
    params: {
      df: { label: 'Degrees of Freedom (ν)', min: 1, max: 50, step: 1, default: 4 }
    },
    defaultRange: [-2.78, 2.78],
    evalDomain(p) {
      return { minX: -6, maxX: 6 };
    },
    pdf(x, p) { return tPdf(x, p.df); },
    cdf(x, p) { return tCdf(x, p.df); },
    mean(p) { return p.df > 1 ? 0 : NaN; },
    variance(p) { return p.df > 2 ? p.df / (p.df - 2) : (p.df > 0 ? Infinity : NaN); },
    formula: 'f(t) = \\frac{\\Gamma((\\nu+1)/2)}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\nu/2)} \\left(1 + \\frac{t^2}{\\nu}\\right)^{-(\\nu+1)/2}',
    application: 'Used when estimating the population mean with small sample sizes (n < 30) where the true population variance σ is unknown. Heavier tails reflect increased uncertainty.'
  },

  binomial: {
    name: 'Binomial Distribution',
    type: 'discrete',
    params: {
      n: { label: 'Number of Trials (n)', min: 5, max: 80, step: 1, default: 40 },
      p: { label: 'Success Probability (p)', min: 0.05, max: 0.95, step: 0.05, default: 0.25 }
    },
    defaultRange: [5, 15],
    evalDomain(p) {
      return { minX: 0, maxX: p.n };
    },
    pmf(k, p) { return binomialPmf(k, p.n, p.p); },
    cdf(k, p) {
      let sum = 0;
      for (let i = 0; i <= Math.floor(k); i++) sum += binomialPmf(i, p.n, p.p);
      return Math.min(1, sum);
    },
    mean(p) { return p.n * p.p; },
    variance(p) { return p.n * p.p * (1 - p.p); },
    formula: 'P(X = k) = \\binom{n}{k} p^k (1 - p)^{n - k}, \\quad k \\in \\{0, 1, \\dots, n\\}',
    application: 'Counts the number of successes in n independent Bernoulli trials. Fundamental to A/B testing conversions, click-through rates, and quality assurance pass/fail inspection.'
  },

  poisson: {
    name: 'Poisson Distribution',
    type: 'discrete',
    params: {
      lambda: { label: 'Event Rate (λ)', min: 1, max: 30, step: 0.5, default: 8 }
    },
    defaultRange: [4, 12],
    evalDomain(p) {
      return { minX: 0, maxX: Math.max(20, Math.ceil(p.lambda + 4 * Math.sqrt(p.lambda))) };
    },
    pmf(k, p) { return poissonPmf(k, p.lambda); },
    cdf(k, p) {
      let sum = 0;
      for (let i = 0; i <= Math.floor(k); i++) sum += poissonPmf(i, p.lambda);
      return Math.min(1, sum);
    },
    mean(p) { return p.lambda; },
    variance(p) { return p.lambda; },
    formula: 'P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}, \\quad k \\in \\{0, 1, 2, \\dots\\}',
    application: 'Models counts of rare, independent events occurring over fixed intervals of time or space: server request volumes, call center queues, system crashes, or defective pixels.'
  },

  exponential: {
    name: 'Exponential Distribution',
    type: 'continuous',
    params: {
      lambda: { label: 'Rate (λ)', min: 0.2, max: 3, step: 0.1, default: 1.0 }
    },
    defaultRange: [0, 2.5],
    evalDomain(p) {
      return { minX: 0, maxX: 6 / p.lambda };
    },
    pdf(x, p) { return x >= 0 ? p.lambda * Math.exp(-p.lambda * x) : 0; },
    cdf(x, p) { return x >= 0 ? 1 - Math.exp(-p.lambda * x) : 0; },
    mean(p) { return 1 / p.lambda; },
    variance(p) { return 1 / (p.lambda * p.lambda); },
    formula: 'f(x) = \\lambda e^{-\\lambda x}, \\quad x \\ge 0',
    application: 'Continuous waiting time between Poisson arrivals. Famous for its memoryless property P(X > s + t | X > s) = P(X > t). Used in reliability engineering, customer churn time, and radioactive decay.'
  },

  chisquare: {
    name: 'Chi-Square (χ²) Distribution',
    type: 'continuous',
    params: {
      k: { label: 'Degrees of Freedom (k)', min: 1, max: 25, step: 1, default: 4 }
    },
    defaultRange: [0.71, 9.49],
    evalDomain(p) {
      return { minX: 0, maxX: Math.max(12, p.k + 4 * Math.sqrt(2 * p.k)) };
    },
    pdf(x, p) { return chiSqPdf(x, p.k); },
    cdf(x, p) { return chiSqCdf(x, p.k); },
    mean(p) { return p.k; },
    variance(p) { return 2 * p.k; },
    formula: 'f(x) = \\frac{1}{2^{k/2}\\Gamma(k/2)} x^{k/2 - 1} e^{-x/2}, \\quad x > 0',
    application: 'Distribution of the sum of k squared standard normal variables. Drives goodness-of-fit tests, contingency table test of independence, and confidence intervals for unknown population variance.'
  },

  uniform: {
    name: 'Continuous Uniform',
    type: 'continuous',
    params: {
      a: { label: 'Lower Bound (a)', min: -5, max: 2, step: 0.5, default: 0 },
      b: { label: 'Upper Bound (b)', min: 1, max: 10, step: 0.5, default: 5 }
    },
    defaultRange: [1, 4],
    evalDomain(p) {
      const pad = (p.b - p.a) * 0.2;
      return { minX: p.a - pad, maxX: p.b + pad };
    },
    pdf(x, p) { return (x >= p.a && x <= p.b) ? 1 / (p.b - p.a) : 0; },
    cdf(x, p) {
      if (x < p.a) return 0;
      if (x > p.b) return 1;
      return (x - p.a) / (p.b - p.a);
    },
    mean(p) { return (p.a + p.b) / 2; },
    variance(p) { return Math.pow(p.b - p.a, 2) / 12; },
    formula: 'f(x) = \\frac{1}{b - a}, \\quad a \\le x \\le b',
    application: 'The maximum entropy distribution when only the support is known. Serves as the bedrock of pseudo-random number generators (PRNGs) and Monte Carlo integration algorithms.'
  },

  lognormal: {
    name: 'Log-Normal Distribution',
    type: 'continuous',
    params: {
      mu: { label: 'Log-Scale Mean (μ)', min: -1, max: 2, step: 0.1, default: 0 },
      sigma: { label: 'Log-Scale Std (σ)', min: 0.2, max: 1.5, step: 0.05, default: 0.6 }
    },
    defaultRange: [0.3, 3.2],
    evalDomain(p) {
      return { minX: 0, maxX: Math.exp(p.mu + 3 * p.sigma) };
    },
    pdf(x, p) {
      if (x <= 0) return 0;
      const z = (Math.log(x) - p.mu) / p.sigma;
      return Math.exp(-0.5 * z * z) / (x * p.sigma * Math.sqrt(2 * Math.PI));
    },
    cdf(x, p) {
      if (x <= 0) return 0;
      return normalCdf((Math.log(x) - p.mu) / p.sigma);
    },
    mean(p) { return Math.exp(p.mu + 0.5 * p.sigma * p.sigma); },
    variance(p) { return (Math.exp(p.sigma * p.sigma) - 1) * Math.exp(2 * p.mu + p.sigma * p.sigma); },
    formula: 'f(x) = \\frac{1}{x\\sigma\\sqrt{2\\pi}} \\exp\\left(-\\frac{(\\ln x - \\mu)^2}{2\\sigma^2}\\right), \\quad x > 0',
    application: 'Ubiquitous for naturally strictly positive, highly right-skewed phenomena created by multiplicative effects: web page response latency, individual incomes, transaction amounts, and file sizes.'
  }
};

// ─────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────

const STATE = {
  distKey: 'normal',
  params: { mu: 0, sigma: 1 },
  rangeLower: -1.96,
  rangeUpper: 1.96,
};

// ─────────────────────────────────────────────────────────
//  Main Initialization
// ─────────────────────────────────────────────────────────

export default function init() {
  const distSelect = $('dist-select');
  const presetSelect = $('preset-select');
  const rangeLowerInput = $('range-lower');
  const rangeUpperInput = $('range-upper');
  const btnResetRange = $('btn-reset-range');

  distSelect.addEventListener('change', (e) => {
    switchDistribution(e.target.value);
  });

  presetSelect.addEventListener('change', (e) => {
    applyPreset(e.target.value);
  });

  rangeLowerInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    STATE.rangeLower = Math.min(val, STATE.rangeUpper - 0.01);
    $('val-range-lower').textContent = fmt(STATE.rangeLower, 2);
    updatePlots();
  });

  rangeUpperInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    STATE.rangeUpper = Math.max(val, STATE.rangeLower + 0.01);
    $('val-range-upper').textContent = fmt(STATE.rangeUpper, 2);
    updatePlots();
  });

  btnResetRange.addEventListener('click', () => {
    const dist = DISTRIBUTIONS[STATE.distKey];
    STATE.rangeLower = dist.defaultRange[0];
    STATE.rangeUpper = dist.defaultRange[1];
    syncRangeInputs();
    updatePlots();
  });

  // Initial load
  switchDistribution('normal');
}

// ─────────────────────────────────────────────────────────
//  Switch Distribution & Build Sliders
// ─────────────────────────────────────────────────────────

function switchDistribution(key) {
  STATE.distKey = key;
  const dist = DISTRIBUTIONS[key];

  // Initialize default params
  STATE.params = {};
  for (const [pKey, pDef] of Object.entries(dist.params)) {
    STATE.params[pKey] = pDef.default;
  }

  STATE.rangeLower = dist.defaultRange[0];
  STATE.rangeUpper = dist.defaultRange[1];

  // Build dynamic controls
  buildParamControls();
  syncRangeInputs();
  updateTheoryText();
  updatePlots();
}

function buildParamControls() {
  const container = $('dynamic-params');
  container.innerHTML = '';
  const dist = DISTRIBUTIONS[STATE.distKey];

  for (const [pKey, pDef] of Object.entries(dist.params)) {
    const wrap = document.createElement('div');
    wrap.className = 'control-group';

    const label = document.createElement('label');
    label.htmlFor = `param-${pKey}`;
    label.innerHTML = `${pDef.label}: <span id="val-param-${pKey}">${pDef.default}</span>`;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `param-${pKey}`;
    input.min = pDef.min;
    input.max = pDef.max;
    input.step = pDef.step;
    input.value = STATE.params[pKey];

    input.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      STATE.params[pKey] = val;
      $(`val-param-${pKey}`).textContent = pDef.step >= 1 ? val : fmt(val, 2);

      // Re-adjust range sliders if bounds expand
      adjustRangeBounds();
      updatePlots();
    });

    wrap.appendChild(label);
    wrap.appendChild(input);
    container.appendChild(wrap);
  }
}

function adjustRangeBounds() {
  const dist = DISTRIBUTIONS[STATE.distKey];
  const domain = dist.evalDomain(STATE.params);

  const rangeLowerInput = $('range-lower');
  const rangeUpperInput = $('range-upper');

  rangeLowerInput.min = domain.minX;
  rangeLowerInput.max = domain.maxX;
  rangeUpperInput.min = domain.minX;
  rangeUpperInput.max = domain.maxX;

  // Clamp current range
  STATE.rangeLower = Math.max(domain.minX, Math.min(domain.maxX - 0.1, STATE.rangeLower));
  STATE.rangeUpper = Math.min(domain.maxX, Math.max(domain.minX + 0.1, STATE.rangeUpper));
}

function syncRangeInputs() {
  adjustRangeBounds();
  $('range-lower').value = STATE.rangeLower;
  $('range-upper').value = STATE.rangeUpper;
  $('val-range-lower').textContent = fmt(STATE.rangeLower, 2);
  $('val-range-upper').textContent = fmt(STATE.rangeUpper, 2);
  $('btn-reset-range').textContent = `Reset to [${fmt(DISTRIBUTIONS[STATE.distKey].defaultRange[0])}, ${fmt(DISTRIBUTIONS[STATE.distKey].defaultRange[1])}]`;
}

function updateTheoryText() {
  const dist = DISTRIBUTIONS[STATE.distKey];
  $('badge-dist-type').textContent = dist.type.toUpperCase();
  $('chart-pdf-title').textContent = dist.type === 'continuous' ? 'Probability Density Function (PDF)' : 'Probability Mass Function (PMF)';

  // KaTeX formula
  if (window.katex) {
    window.katex.render(dist.formula, $('formula-math'), { displayMode: true, throwOnError: false });
  } else {
    $('formula-math').textContent = dist.formula;
  }

  $('application-desc').textContent = dist.application;
}

// ─────────────────────────────────────────────────────────
//  Preset Handlers
// ─────────────────────────────────────────────────────────

function applyPreset(preset) {
  if (preset === 'standard_normal') {
    $('dist-select').value = 'normal';
    switchDistribution('normal');
  } else if (preset === 'small_sample_t') {
    $('dist-select').value = 'student_t';
    switchDistribution('student_t');
    STATE.params.df = 4;
    $('param-df').value = 4;
    $('val-param-df').textContent = '4';
    updatePlots();
  } else if (preset === 'ab_conversion') {
    $('dist-select').value = 'binomial';
    switchDistribution('binomial');
    STATE.params.n = 50;
    STATE.params.p = 0.15;
    $('param-n').value = 50;
    $('param-p').value = 0.15;
    $('val-param-n').textContent = '50';
    $('val-param-p').textContent = '0.15';
    adjustRangeBounds();
    STATE.rangeLower = 3;
    STATE.rangeUpper = 13;
    syncRangeInputs();
    updatePlots();
  } else if (preset === 'server_requests') {
    $('dist-select').value = 'poisson';
    switchDistribution('poisson');
    STATE.params.lambda = 12;
    $('param-lambda').value = 12;
    $('val-param-lambda').textContent = '12';
    adjustRangeBounds();
    STATE.rangeLower = 6;
    STATE.rangeUpper = 18;
    syncRangeInputs();
    updatePlots();
  } else if (preset === 'customer_wait') {
    $('dist-select').value = 'exponential';
    switchDistribution('exponential');
    STATE.params.lambda = 0.2;
    $('param-lambda').value = 0.2;
    $('val-param-lambda').textContent = '0.20';
    adjustRangeBounds();
    STATE.rangeLower = 0;
    STATE.rangeUpper = 5;
    syncRangeInputs();
    updatePlots();
  } else if (preset === 'goodness_fit') {
    $('dist-select').value = 'chisquare';
    switchDistribution('chisquare');
    STATE.params.k = 3;
    $('param-k').value = 3;
    $('val-param-k').textContent = '3';
    adjustRangeBounds();
    STATE.rangeLower = 0;
    STATE.rangeUpper = 7.81;
    syncRangeInputs();
    updatePlots();
  } else if (preset === 'page_latency') {
    $('dist-select').value = 'lognormal';
    switchDistribution('lognormal');
    STATE.params.mu = 1.0;
    STATE.params.sigma = 0.5;
    $('param-mu').value = 1.0;
    $('param-sigma').value = 0.5;
    $('val-param-mu').textContent = '1.00';
    $('val-param-sigma').textContent = '0.50';
    adjustRangeBounds();
    STATE.rangeLower = 1.5;
    STATE.rangeUpper = 6.0;
    syncRangeInputs();
    updatePlots();
  }
}

// ─────────────────────────────────────────────────────────
//  Plotting
// ─────────────────────────────────────────────────────────

function updatePlots() {
  const dist = DISTRIBUTIONS[STATE.distKey];
  const p = STATE.params;
  const domain = dist.evalDomain(p);
  const x1 = Math.min(STATE.rangeLower, STATE.rangeUpper);
  const x2 = Math.max(STATE.rangeLower, STATE.rangeUpper);

  // Compute Expected Value, Variance, Interval Probability
  const ev = dist.mean(p);
  const variance = dist.variance(p);
  const sd = Math.sqrt(variance);

  let intervalProb = 0;

  if (dist.type === 'continuous') {
    intervalProb = Math.max(0, dist.cdf(x2, p) - dist.cdf(x1, p));
  } else {
    // Discrete sum
    let sum = 0;
    for (let k = Math.ceil(x1); k <= Math.floor(x2); k++) {
      sum += dist.pmf(k, p);
    }
    intervalProb = sum;
  }

  // Update Stat Displays
  $('stat-interval-prob').textContent = fmt(intervalProb, 4);
  $('stat-mean').textContent = isNaN(ev) ? 'Undefined' : fmt(ev, 3);
  $('stat-variance').textContent = isNaN(variance) ? 'Undefined' : (variance === Infinity ? '∞' : fmt(variance, 3));
  $('stat-std').textContent = isNaN(sd) ? 'Undefined' : fmt(sd, 3);

  // Render Charts
  if (dist.type === 'continuous') {
    renderContinuousCharts(dist, p, domain, x1, x2);
  } else {
    renderDiscreteCharts(dist, p, domain, x1, x2);
  }
}

function renderContinuousCharts(dist, p, domain, x1, x2) {
  const nPoints = 250;
  const xs = linspace(domain.minX, domain.maxX, nPoints);
  const ys = xs.map(x => dist.pdf(x, p));
  const cdfYs = xs.map(x => dist.cdf(x, p));

  // Shaded region points between x1 and x2
  const shadeXs = [];
  const shadeYs = [];
  shadeXs.push(x1);
  shadeYs.push(0);

  for (let i = 0; i < xs.length; i++) {
    if (xs[i] >= x1 && xs[i] <= x2) {
      shadeXs.push(xs[i]);
      shadeYs.push(ys[i]);
    }
  }
  shadeXs.push(x2);
  shadeYs.push(0);

  // Trace 1: PDF Curve
  const tracePdf = {
    x: xs,
    y: ys,
    mode: 'lines',
    name: 'f(x)',
    line: { color: '#38bdf8', width: 2.5 },
    hoverinfo: 'x+y'
  };

  // Trace 2: Shaded Interval Area
  const traceShade = {
    x: shadeXs,
    y: shadeYs,
    fill: 'tozeroy',
    type: 'scatter',
    mode: 'none',
    name: `Area [${fmt(x1)}, ${fmt(x2)}]`,
    fillcolor: 'rgba(56, 189, 248, 0.22)',
    hoverinfo: 'none'
  };

  const layoutPdf = {
    ...DARK_LAYOUT,
    title: { text: `${dist.name} — Density`, font: { size: 13, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: 'x', range: [domain.minX, domain.maxX] },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Density f(x)' },
    showlegend: false
  };

  // Trace 3: CDF Curve
  const traceCdf = {
    x: xs,
    y: cdfYs,
    mode: 'lines',
    name: 'F(x)',
    line: { color: '#10b981', width: 2.5 },
    hoverinfo: 'x+y'
  };

  // CDF Markers at x1 and x2
  const cdfPoints = {
    x: [x1, x2],
    y: [dist.cdf(x1, p), dist.cdf(x2, p)],
    mode: 'markers',
    name: 'Range Bounds',
    marker: { size: 7, color: '#f59e0b' },
    hoverinfo: 'x+y'
  };

  const layoutCdf = {
    ...DARK_LAYOUT,
    title: { text: `${dist.name} — Cumulative Probability`, font: { size: 13, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: 'x', range: [domain.minX, domain.maxX] },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Probability F(x)', range: [-0.02, 1.05] },
    showlegend: false
  };

  Plotly.react('plot-pdf', [traceShade, tracePdf], layoutPdf, { responsive: true, displayModeBar: false });
  Plotly.react('plot-cdf', [traceCdf, cdfPoints], layoutCdf, { responsive: true, displayModeBar: false });
}

function renderDiscreteCharts(dist, p, domain, x1, x2) {
  const ks = [];
  const minK = Math.max(0, Math.floor(domain.minX));
  const maxK = Math.ceil(domain.maxX);

  for (let k = minK; k <= maxK; k++) {
    ks.push(k);
  }

  const pms = ks.map(k => dist.pmf(k, p));
  const cdfs = ks.map(k => dist.cdf(k, p));

  // Colors: highlight bars inside [x1, x2]
  const barColors = ks.map(k => (k >= Math.ceil(x1) && k <= Math.floor(x2)) ? '#38bdf8' : '#27272a');
  const barBorders = ks.map(k => (k >= Math.ceil(x1) && k <= Math.floor(x2)) ? '#0284c7' : '#3f3f46');

  const tracePmf = {
    x: ks,
    y: pms,
    type: 'bar',
    marker: {
      color: barColors,
      line: { color: barBorders, width: 1.5 }
    },
    hoverinfo: 'x+y'
  };

  const layoutPmf = {
    ...DARK_LAYOUT,
    title: { text: `${dist.name} — Mass Function P(X=k)`, font: { size: 13, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: 'k (Outcomes)' },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Probability P(X=k)' },
    showlegend: false
  };

  // CDF as step line
  const traceCdf = {
    x: ks,
    y: cdfs,
    mode: 'lines+markers',
    line: { shape: 'hv', color: '#10b981', width: 2 },
    marker: { size: 5, color: '#10b981' },
    hoverinfo: 'x+y'
  };

  const layoutCdf = {
    ...DARK_LAYOUT,
    title: { text: `${dist.name} — Cumulative P(X ≤ k)`, font: { size: 13, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: 'k (Outcomes)' },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Probability F(k)', range: [-0.02, 1.05] },
    showlegend: false
  };

  Plotly.react('plot-pdf', [tracePmf], layoutPmf, { responsive: true, displayModeBar: false });
  Plotly.react('plot-cdf', [traceCdf], layoutCdf, { responsive: true, displayModeBar: false });
}


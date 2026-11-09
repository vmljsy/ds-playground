/**
 * A/B Testing & Two-Sample Inference Simulation
 *
 * Simulates online experiments comparing Variant A (Control) vs Variant B (Treatment).
 * Supports both conversion rate testing (two-proportion z-test) and
 * continuous metric evaluation (two-sample Welch's t-test), plus sequential peeking tracking.
 */

import {
  randomNormal,
  twoPropZTest, twoSampleWelchTTest,
  normalPdf, normalInv,
  DARK_LAYOUT, $, fmt, fmtPValue, linspace
} from '../../js/common.js';

// ─────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────

const STATE = {
  metricType: 'proportions', // 'proportions' or 'continuous'
  sampleSize: 2500,          // n per variant
  baselineRate: 0.10,        // pA
  trueLift: 0.015,           // absolute lift (e.g. +1.5 pp)
  baselineMean: 45.0,        // For continuous (e.g. $45)
  baselineStd: 15.0,
  trueMeanLift: 4.5,         // For continuous (e.g. +$4.50)
  alpha: 0.05,
  streaming: false,
  streamTimer: null,
  currentN: 2500,

  // Stored experimental results
  dataA: [],
  dataB: [],
  peekingHistory: []         // array of { n, pValue, z }
};

// ─────────────────────────────────────────────────────────
//  Main Initialization
// ─────────────────────────────────────────────────────────

export default function init() {
  const metricSelect = $('metric-select');
  const sampleSlider = $('sample-size-slider');
  const baselineSlider = $('baseline-slider');
  const liftSlider = $('lift-slider');

  const btnRunFull = $('btn-run-full');
  const btnStream = $('btn-stream');
  const btnReset = $('btn-reset');

  metricSelect.addEventListener('change', (e) => {
    STATE.metricType = e.target.value;
    updateMetricControls();
    runFullSimulation();
  });

  sampleSlider.addEventListener('input', (e) => {
    STATE.sampleSize = parseInt(e.target.value, 10);
    $('val-sample-size').textContent = STATE.sampleSize.toLocaleString();
    runFullSimulation();
  });

  baselineSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (STATE.metricType === 'proportions') {
      STATE.baselineRate = val;
      $('val-baseline').textContent = `${fmt(val * 100, 1)}%`;
    } else {
      STATE.baselineMean = val;
      $('val-baseline').textContent = `$${fmt(val, 2)}`;
    }
    runFullSimulation();
  });

  liftSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (STATE.metricType === 'proportions') {
      STATE.trueLift = val;
      $('val-lift').textContent = `${val >= 0 ? '+' : ''}${fmt(val * 100, 1)}% pp`;
    } else {
      STATE.trueMeanLift = val;
      $('val-lift').textContent = `${val >= 0 ? '+' : ''}$${fmt(val, 2)}`;
    }
    runFullSimulation();
  });

  btnRunFull.addEventListener('click', () => {
    stopStreaming();
    runFullSimulation();
  });

  btnStream.addEventListener('click', () => {
    if (STATE.streaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  });

  btnReset.addEventListener('click', () => {
    stopStreaming();
    runFullSimulation();
  });

  // Initial load
  updateMetricControls();
  runFullSimulation();
}

function updateMetricControls() {
  const isProp = STATE.metricType === 'proportions';
  const baselineSlider = $('baseline-slider');
  const liftSlider = $('lift-slider');

  if (isProp) {
    $('badge-metric-name').textContent = 'Conversion Rate';
    $('lbl-baseline').textContent = 'Baseline Rate (p_A)';
    $('lbl-lift').textContent = 'True Effect Lift (Δ)';

    baselineSlider.min = 0.02;
    baselineSlider.max = 0.30;
    baselineSlider.step = 0.005;
    baselineSlider.value = STATE.baselineRate;
    $('val-baseline').textContent = `${fmt(STATE.baselineRate * 100, 1)}%`;

    liftSlider.min = -0.03;
    liftSlider.max = 0.04;
    liftSlider.step = 0.002;
    liftSlider.value = STATE.trueLift;
    $('val-lift').textContent = `${STATE.trueLift >= 0 ? '+' : ''}${fmt(STATE.trueLift * 100, 1)}% pp`;
  } else {
    $('badge-metric-name').textContent = 'Revenue per User ($)';
    $('lbl-baseline').textContent = 'Baseline Revenue (μ_A)';
    $('lbl-lift').textContent = 'True Revenue Lift (Δ)';

    baselineSlider.min = 10;
    baselineSlider.max = 100;
    baselineSlider.step = 1;
    baselineSlider.value = STATE.baselineMean;
    $('val-baseline').textContent = `$${fmt(STATE.baselineMean, 2)}`;

    liftSlider.min = -10;
    liftSlider.max = 15;
    liftSlider.step = 0.5;
    liftSlider.value = STATE.trueMeanLift;
    $('val-lift').textContent = `${STATE.trueMeanLift >= 0 ? '+' : ''}$${fmt(STATE.trueMeanLift, 2)}`;
  }
}

// ─────────────────────────────────────────────────────────
//  Simulation Logic
// ─────────────────────────────────────────────────────────

function runFullSimulation() {
  STATE.currentN = STATE.sampleSize;
  generateCompleteDataset();
  renderAll();
}

function generateCompleteDataset() {
  const n = STATE.sampleSize;
  const isProp = STATE.metricType === 'proportions';

  STATE.dataA = [];
  STATE.dataB = [];
  STATE.peekingHistory = [];

  const pA = STATE.baselineRate;
  const pB = Math.max(0.001, Math.min(0.999, pA + STATE.trueLift));

  const muA = STATE.baselineMean;
  const muB = Math.max(0, muA + STATE.trueMeanLift);
  const stdA = STATE.baselineStd;
  const stdB = STATE.baselineStd * 1.05;

  let sumA = 0;
  let sumB = 0;

  // We sample checkpoints to record peeking trajectory
  const checkpointStep = Math.max(10, Math.floor(n / 100));

  for (let i = 1; i <= n; i++) {
    let valA, valB;

    if (isProp) {
      valA = Math.random() < pA ? 1 : 0;
      valB = Math.random() < pB ? 1 : 0;
    } else {
      valA = randomNormal(muA, stdA);
      valB = randomNormal(muB, stdB);
    }

    sumA += valA;
    sumB += valB;
    STATE.dataA.push(valA);
    STATE.dataB.push(valB);

    if (i >= 30 && i % checkpointStep === 0) {
      let pVal;
      if (isProp) {
        const test = twoPropZTest(sumA, i, sumB, i, STATE.alpha);
        pVal = test.pValue;
      } else {
        // Welch approximation on slice
        const m1 = sumA / i;
        const m2 = sumB / i;
        const s1 = stdA;
        const s2 = stdB;
        const test = twoSampleWelchTTest(m1, s1, i, m2, s2, i, STATE.alpha);
        pVal = test.pValue;
      }
      STATE.peekingHistory.push({ n: i, pValue: pVal });
    }
  }
}

function startStreaming() {
  STATE.streaming = true;
  $('btn-stream').textContent = 'Stop Streaming';
  $('btn-stream').className = 'btn btn-primary';

  generateCompleteDataset();
  const fullN = STATE.sampleSize;
  let currentStep = 50;
  const stepIncrement = Math.max(25, Math.floor(fullN / 80));

  STATE.streamTimer = setInterval(() => {
    currentStep += stepIncrement;
    if (currentStep >= fullN) {
      currentStep = fullN;
      stopStreaming();
    }
    STATE.currentN = currentStep;
    renderAll();
  }, 40);
}

function stopStreaming() {
  if (STATE.streaming) {
    clearInterval(STATE.streamTimer);
    STATE.streaming = false;
    $('btn-stream').textContent = 'Stream Visitors Live';
    $('btn-stream').className = 'btn btn-secondary';
  }
}

// ─────────────────────────────────────────────────────────
//  Calculations & Analysis
// ─────────────────────────────────────────────────────────

function renderAll() {
  const n = STATE.currentN;
  const isProp = STATE.metricType === 'proportions';

  $('badge-peeking-status').textContent = `Current Sample: n=${n.toLocaleString()}`;

  const subA = STATE.dataA.slice(0, n);
  const subB = STATE.dataB.slice(0, n);

  let result;
  if (isProp) {
    let convA = 0;
    let convB = 0;
    for (let i = 0; i < n; i++) {
      convA += subA[i];
      convB += subB[i];
    }
    result = twoPropZTest(convA, n, convB, n, STATE.alpha);
  } else {
    let sumA = 0, sumB = 0;
    for (let i = 0; i < n; i++) {
      sumA += subA[i];
      sumB += subB[i];
    }
    const m1 = sumA / n;
    const m2 = sumB / n;

    let sqA = 0, sqB = 0;
    for (let i = 0; i < n; i++) {
      sqA += (subA[i] - m1) * (subA[i] - m1);
      sqB += (subB[i] - m2) * (subB[i] - m2);
    }
    const s1 = Math.sqrt(sqA / (n - 1));
    const s2 = Math.sqrt(sqB / (n - 1));

    const test = twoSampleWelchTTest(m1, s1, n, m2, s2, n, STATE.alpha);
    const zStar = normalInv(1 - STATE.alpha / 2);
    const me1 = zStar * (s1 / Math.sqrt(n));
    const me2 = zStar * (s2 / Math.sqrt(n));

    result = {
      p1: m1,
      p2: m2,
      diff: test.diff,
      relLift: m1 > 0 ? (test.diff / m1) * 100 : 0,
      sePool: test.se,
      z: test.t,
      pValue: test.pValue,
      zCritUpper: test.tCritUpper,
      ciDiff: test.ciDiff,
      ci1: [m1 - me1, m1 + me1],
      ci2: [m2 - me2, m2 + me2],
      me1,
      me2,
      reject: test.reject
    };
  }

  // Update Stat Display Cards
  if (isProp) {
    const me1 = (result.ci1[1] - result.p1) * 100;
    const me2 = (result.ci2[1] - result.p2) * 100;
    $('stat-var-a').textContent = `${fmt(result.p1 * 100, 2)}% ± ${fmt(me1, 2)}%`;
    $('stat-var-b').textContent = `${fmt(result.p2 * 100, 2)}% ± ${fmt(me2, 2)}%`;
    $('stat-abs-lift').textContent = `${result.diff >= 0 ? '+' : ''}${fmt(result.diff * 100, 2)}% pp`;
  } else {
    $('stat-var-a').textContent = `$${fmt(result.p1, 2)} ± $${fmt(result.me1, 2)}`;
    $('stat-var-b').textContent = `$${fmt(result.p2, 2)} ± $${fmt(result.me2, 2)}`;
    $('stat-abs-lift').textContent = `${result.diff >= 0 ? '+' : ''}$${fmt(result.diff, 2)}`;
  }

  $('stat-rel-lift').textContent = `${result.relLift >= 0 ? '+' : ''}${fmt(result.relLift, 2)}%`;
  $('stat-rel-lift').style.color = result.relLift >= 0 ? 'var(--chart-emerald)' : 'var(--chart-rose)';
  $('stat-test-stat').textContent = (result.z >= 0 ? '+' : '') + fmt(result.z, 2);
  $('stat-p-value').textContent = fmtPValue(result.pValue);
  $('stat-p-value').style.color = result.reject ? 'var(--chart-emerald)' : 'var(--chart-rose)';

  // Update Decision Banner
  updateDecisionBanner(result, isProp);

  // Render Charts
  renderVariantsChart(result, isProp);
  renderDiffChart(result, isProp);
  renderPeekingChart(n);
}

function updateDecisionBanner(res, isProp) {
  const banner = $('decision-banner');
  const title = $('decision-title');
  const detail = $('decision-detail');
  const badge = $('decision-badge');

  const unit = isProp ? '% pp' : ' USD';
  const diffStr = (res.diff >= 0 ? '+' : '') + (isProp ? fmt(res.diff * 100, 2) : fmt(res.diff, 2)) + unit;
  const relStr = (res.relLift >= 0 ? '+' : '') + fmt(res.relLift, 2) + '%';

  if (res.reject && res.diff > 0) {
    banner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    banner.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
    title.textContent = 'Statistically Significant Winner!';
    title.style.color = '#10b981';
    detail.textContent = `Variant B achieved a verified lift of ${diffStr} (${relStr} relative) with p = ${fmtPValue(res.pValue)} ≤ 0.05. 95% Confidence Interval excludes zero.`;
    badge.className = 'badge badge-emerald';
    badge.textContent = 'Roll Out Variant B';
  } else if (res.reject && res.diff < 0) {
    banner.style.borderColor = 'rgba(244, 63, 94, 0.4)';
    banner.style.backgroundColor = 'rgba(244, 63, 94, 0.05)';
    title.textContent = 'Statistically Significant Regression!';
    title.style.color = '#f43f5e';
    detail.textContent = `Variant B caused a statistically significant decline (${diffStr}) with p = ${fmtPValue(res.pValue)} ≤ 0.05. Abort variant rollout.`;
    badge.className = 'badge badge-outline';
    badge.style.color = '#f43f5e';
    badge.style.borderColor = '#f43f5e';
    badge.textContent = 'Discard Variant B';
  } else {
    banner.style.borderColor = 'var(--border)';
    banner.style.backgroundColor = 'var(--card-elevated)';
    title.textContent = 'Inconclusive / No Significant Difference';
    title.style.color = '#fafafa';
    detail.textContent = `Observed difference (${diffStr}) is within normal random chance bounds (p = ${fmtPValue(res.pValue)} > 0.05). 95% CI overlaps zero.`;
    badge.className = 'badge badge-outline';
    badge.style.color = 'var(--foreground)';
    badge.style.borderColor = 'var(--border)';
    badge.textContent = 'Keep Testing';
  }
}

// ─────────────────────────────────────────────────────────
//  Plotting
// ─────────────────────────────────────────────────────────

function renderVariantsChart(res, isProp) {
  const yVals = isProp ? [res.p1 * 100, res.p2 * 100] : [res.p1, res.p2];
  const errVals = isProp
    ? [(res.ci1[1] - res.p1) * 100, (res.ci2[1] - res.p2) * 100]
    : [res.me1, res.me2];

  const trace = {
    x: ['Variant A (Control)', 'Variant B (Treatment)'],
    y: yVals,
    type: 'bar',
    marker: {
      color: ['#27272a', res.reject ? (res.diff > 0 ? '#10b981' : '#f43f5e') : '#38bdf8'],
      line: { color: ['#3f3f46', '#fafafa'], width: 1.5 }
    },
    error_y: {
      type: 'data',
      array: errVals,
      visible: true,
      color: '#fafafa',
      thickness: 2,
      width: 12
    },
    hoverinfo: 'x+y'
  };

  const layout = {
    ...DARK_LAYOUT,
    title: { text: isProp ? 'Conversion Rate (%) with 95% CI' : 'Revenue per User ($) with 95% CI', font: { size: 13, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: '' },
    yaxis: {
      ...DARK_LAYOUT.yaxis,
      title: isProp ? 'Conversion Rate (%)' : 'Average Revenue ($)',
      range: [0, Math.max(...yVals) * 1.35]
    },
    showlegend: false
  };

  Plotly.react('plot-variants', [trace], layout, { responsive: true, displayModeBar: false });
}

function renderDiffChart(res, isProp) {
  const diff = isProp ? res.diff * 100 : res.diff;
  const se = isProp ? res.sePool * 100 : res.sePool;
  const ciLower = isProp ? res.ciDiff[0] * 100 : res.ciDiff[0];
  const ciUpper = isProp ? res.ciDiff[1] * 100 : res.ciDiff[1];

  const span = Math.max(Math.abs(diff) + 4 * se, 3);
  const xs = linspace(-span, span, 200);
  const ys = xs.map(x => normalPdf(x, diff, se));

  // Shaded 95% CI
  const shadeX = [];
  const shadeY = [];
  shadeX.push(ciLower);
  shadeY.push(0);

  for (let i = 0; i < xs.length; i++) {
    if (xs[i] >= ciLower && xs[i] <= ciUpper) {
      shadeX.push(xs[i]);
      shadeY.push(ys[i]);
    }
  }
  shadeX.push(ciUpper);
  shadeY.push(0);

  const tracePdf = {
    x: xs,
    y: ys,
    mode: 'lines',
    name: 'Difference Distribution',
    line: { color: '#38bdf8', width: 2.5 }
  };

  const traceCi = {
    x: shadeX,
    y: shadeY,
    fill: 'tozeroy',
    type: 'scatter',
    mode: 'none',
    name: '95% CI of Difference',
    fillcolor: res.reject ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.22)'
  };

  const layout = {
    ...DARK_LAYOUT,
    title: { text: `Estimated Lift: ${diff >= 0 ? '+' : ''}${fmt(diff, 2)} [${fmt(ciLower, 2)}, ${fmt(ciUpper, 2)}]`, font: { size: 13, color: '#fafafa' } },
    xaxis: {
      ...DARK_LAYOUT.xaxis,
      title: isProp ? 'Difference in Conversion Rate (% pp)' : 'Difference in Revenue ($)'
    },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Density' },
    shapes: [
      {
        type: 'line',
        x0: 0,
        x1: 0,
        y0: 0,
        y1: Math.max(...ys) * 1.15,
        line: { color: '#f59e0b', width: 2, dash: 'dash' }
      }
    ],
    showlegend: true
  };

  Plotly.react('plot-diff', [traceCi, tracePdf], layout, { responsive: true, displayModeBar: false });
}

function renderPeekingChart(currentN) {
  const history = STATE.peekingHistory.filter(h => h.n <= currentN);
  if (history.length === 0) return;

  const ns = history.map(h => h.n);
  const pVals = history.map(h => h.pValue);

  const traceP = {
    x: ns,
    y: pVals,
    mode: 'lines',
    name: 'Running p-Value',
    line: { color: '#38bdf8', width: 2 },
    hoverinfo: 'x+y'
  };

  const layout = {
    ...DARK_LAYOUT,
    title: { text: 'Sequential p-Value Path (Beware Early Stopping False Positives!)', font: { size: 13, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: 'Accumulated Visitors per Variant (N)' },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'p-Value', range: [0, 1.02] },
    shapes: [
      {
        type: 'line',
        x0: 0,
        x1: STATE.sampleSize,
        y0: 0.05,
        y1: 0.05,
        line: { color: '#f43f5e', width: 2, dash: 'dash' }
      }
    ],
    showlegend: false
  };

  Plotly.react('plot-peeking', [traceP], layout, { responsive: true, displayModeBar: false });
}


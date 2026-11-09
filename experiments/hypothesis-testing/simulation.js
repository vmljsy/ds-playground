/**
 * Hypothesis Testing Interactive Simulation
 *
 * Visualizes Null Distributions, Critical Values, Rejection Regions,
 * p-Value area integration, and Type I/II Error / Power curves.
 */

import {
  normalPdf, normalCdf, normalInv,
  tPdf, tCdf, tInv,
  randomNormal,
  DARK_LAYOUT, $, fmt, fmtPValue, linspace
} from '../../js/common.js';

// ─────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────

const STATE = {
  testFamily: 'z',          // 'z', 't', 'compare'
  direction: 'two-sided',   // 'two-sided', 'greater', 'less'
  alpha: 0.05,
  df: 5,
  stat: 2.15,               // Observed test statistic
  viewMode: 'null_pvalue',  // 'null_pvalue' or 'power_errors'
  trueEffect: 2.0,          // Delta for power curve
};

// ─────────────────────────────────────────────────────────
//  Main Initialization
// ─────────────────────────────────────────────────────────

export default function init() {
  const testSelect = $('test-select');
  const dirSelect = $('direction-select');
  const alphaSelect = $('alpha-select');
  const dfSlider = $('df-slider');
  const statSlider = $('stat-slider');
  const viewModeSelect = $('view-mode-select');

  const btnDrawNull = $('btn-draw-null');
  const btnDrawAlt = $('btn-draw-alt');

  testSelect.addEventListener('change', (e) => {
    STATE.testFamily = e.target.value;
    $('stat-name').textContent = STATE.testFamily === 't' ? 't_obs' : 'z_obs';
    $('df-group').style.display = STATE.testFamily === 'z' ? 'none' : 'flex';
    updateAll();
  });

  dirSelect.addEventListener('change', (e) => {
    STATE.direction = e.target.value;
    updateAll();
  });

  alphaSelect.addEventListener('change', (e) => {
    STATE.alpha = parseFloat(e.target.value);
    updateAll();
  });

  dfSlider.addEventListener('input', (e) => {
    STATE.df = parseInt(e.target.value, 10);
    $('val-df').textContent = STATE.df;
    updateAll();
  });

  statSlider.addEventListener('input', (e) => {
    STATE.stat = parseFloat(e.target.value);
    $('val-stat').textContent = fmt(STATE.stat, 2);
    updateAll();
  });

  viewModeSelect.addEventListener('change', (e) => {
    STATE.viewMode = e.target.value;
    updateAll();
  });

  btnDrawNull.addEventListener('click', () => {
    const draw = randomNormal(0, 1);
    STATE.stat = parseFloat(draw.toFixed(2));
    statSlider.value = STATE.stat;
    $('val-stat').textContent = fmt(STATE.stat, 2);
    updateAll();
  });

  btnDrawAlt.addEventListener('click', () => {
    const draw = randomNormal(STATE.trueEffect, 1);
    STATE.stat = parseFloat(draw.toFixed(2));
    statSlider.value = STATE.stat;
    $('val-stat').textContent = fmt(STATE.stat, 2);
    updateAll();
  });

  // Initial setup
  $('df-group').style.display = 'none'; // starts on z-test
  updateAll();
}

// ─────────────────────────────────────────────────────────
//  Calculations & Decision Logic
// ─────────────────────────────────────────────────────────

function updateAll() {
  const alpha = STATE.alpha;
  const dir = STATE.direction;
  const isT = STATE.testFamily === 't';
  const isCompare = STATE.testFamily === 'compare';
  const stat = STATE.stat;
  const df = STATE.df;

  // 1. Critical Values
  let critUpper, critLower;
  if (isT || isCompare) {
    if (dir === 'two-sided') {
      critUpper = tInv(1 - alpha / 2, df);
      critLower = -critUpper;
    } else if (dir === 'greater') {
      critUpper = tInv(1 - alpha, df);
      critLower = -Infinity;
    } else {
      critLower = tInv(alpha, df);
      critUpper = Infinity;
    }
  } else {
    // Normal z
    if (dir === 'two-sided') {
      critUpper = normalInv(1 - alpha / 2);
      critLower = -critUpper;
    } else if (dir === 'greater') {
      critUpper = normalInv(1 - alpha);
      critLower = -Infinity;
    } else {
      critLower = normalInv(alpha);
      critUpper = Infinity;
    }
  }

  // Also calculate normal z-crit for comparison
  const zCritUpper = dir === 'two-sided' ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);

  // 2. p-Value
  let pValue;
  if (isT) {
    if (dir === 'two-sided') {
      pValue = 2 * (1 - tCdf(Math.abs(stat), df));
    } else if (dir === 'greater') {
      pValue = 1 - tCdf(stat, df);
    } else {
      pValue = tCdf(stat, df);
    }
  } else {
    if (dir === 'two-sided') {
      pValue = 2 * (1 - normalCdf(Math.abs(stat)));
    } else if (dir === 'greater') {
      pValue = 1 - normalCdf(stat);
    } else {
      pValue = normalCdf(stat);
    }
  }

  // 3. Rejection verdict
  let reject = false;
  if (dir === 'two-sided') {
    reject = Math.abs(stat) >= critUpper;
  } else if (dir === 'greater') {
    reject = stat >= critUpper;
  } else {
    reject = stat <= critLower;
  }

  // 4. Power calculation (under N(delta, 1))
  const delta = STATE.trueEffect;
  let power = 0;
  if (dir === 'two-sided') {
    power = (1 - normalCdf(critUpper - delta)) + normalCdf(critLower - delta);
  } else if (dir === 'greater') {
    power = 1 - normalCdf(critUpper - delta);
  } else {
    power = normalCdf(critLower - delta);
  }
  const beta = 1 - power;

  // 5. Update UI Stats Panel
  $('stat-p-value').textContent = fmtPValue(pValue);
  $('stat-p-value').style.color = reject ? 'var(--chart-emerald)' : 'var(--chart-rose)';
  $('stat-alpha').textContent = fmt(alpha, 4);
  
  if (dir === 'two-sided') {
    $('stat-crit-val').textContent = `±${fmt(critUpper, 3)}`;
    $('badge-tails').textContent = 'Two-Tailed Rejection';
  } else if (dir === 'greater') {
    $('stat-crit-val').textContent = `+${fmt(critUpper, 3)}`;
    $('badge-tails').textContent = 'Right-Tailed Rejection';
  } else {
    $('stat-crit-val').textContent = `${fmt(critLower, 3)}`;
    $('badge-tails').textContent = 'Left-Tailed Rejection';
  }

  $('stat-obs-val').textContent = (stat >= 0 ? '+' : '') + fmt(stat, 3);
  $('stat-type1').textContent = `${fmt(alpha * 100, 1)}%`;
  $('stat-power').textContent = `${fmt(power * 100, 1)}%`;

  // 6. Update Verdict Banner
  updateVerdictBanner(reject, pValue, alpha, stat, critUpper, critLower, dir);

  // 7. Render Plots
  renderMainPlot(critUpper, critLower, stat, isT, isCompare, df, dir);
  
  if (STATE.viewMode === 'power_errors') {
    renderPowerPlot(critUpper, critLower, delta, dir);
  } else {
    renderRatioBarPlot(pValue, alpha);
  }
}

function updateVerdictBanner(reject, pValue, alpha, stat, critUpper, critLower, dir) {
  const banner = $('verdict-banner');
  const title = $('verdict-title');
  const detail = $('verdict-detail');
  const badge = $('verdict-badge');

  if (reject) {
    banner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    banner.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
    title.textContent = 'Reject Null Hypothesis H₀ — Statistically Significant';
    title.style.color = '#10b981';
    detail.textContent = `p-value (${fmtPValue(pValue)}) ≤ α (${fmt(alpha, 4)}) · Observed statistic (${fmt(stat, 3)}) falls inside the critical rejection boundary.`;
    badge.className = 'badge badge-emerald';
    badge.textContent = 'Reject H₀';
  } else {
    banner.style.borderColor = 'var(--border)';
    banner.style.backgroundColor = 'var(--card-elevated)';
    title.textContent = 'Fail to Reject H₀ — Inconclusive / Insufficient Evidence';
    title.style.color = '#fafafa';
    detail.textContent = `p-value (${fmtPValue(pValue)}) > α (${fmt(alpha, 4)}) · The observed result is consistent with random chance variation under H₀.`;
    badge.className = 'badge badge-outline';
    badge.textContent = 'Fail to Reject';
  }
}

// ─────────────────────────────────────────────────────────
//  Plotting
// ─────────────────────────────────────────────────────────

function renderMainPlot(critUpper, critLower, stat, isT, isCompare, df, dir) {
  const minX = -4.5;
  const maxX = 4.5;
  const xs = linspace(minX, maxX, 300);

  // Null density values
  const pdfFn = isT ? (x => tPdf(x, df)) : (x => normalPdf(x, 0, 1));
  const ys = xs.map(pdfFn);

  // 1. Shaded Critical Rejection Region
  const critShadeX = [];
  const critShadeY = [];

  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    let inCrit = false;
    if (dir === 'two-sided') inCrit = x <= critLower || x >= critUpper;
    else if (dir === 'greater') inCrit = x >= critUpper;
    else inCrit = x <= critLower;

    if (inCrit) {
      critShadeX.push(x);
      critShadeY.push(ys[i]);
    } else if (critShadeX.length > 0 && critShadeX[critShadeX.length - 1] !== null) {
      critShadeX.push(null);
      critShadeY.push(null);
    }
  }

  const traceCritArea = {
    x: critShadeX,
    y: critShadeY,
    fill: 'tozeroy',
    type: 'scatter',
    mode: 'none',
    name: `Critical Rejection (α=${fmt(STATE.alpha, 3)})`,
    fillcolor: 'rgba(244, 63, 94, 0.28)',
    hoverinfo: 'none'
  };

  // 2. Shaded p-Value Tail Area
  const pValShadeX = [];
  const pValShadeY = [];
  const absStat = Math.abs(stat);

  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    let inPVal = false;
    if (dir === 'two-sided') inPVal = x <= -absStat || x >= absStat;
    else if (dir === 'greater') inPVal = x >= stat;
    else inPVal = x <= stat;

    if (inPVal) {
      pValShadeX.push(x);
      pValShadeY.push(ys[i]);
    } else if (pValShadeX.length > 0 && pValShadeX[pValShadeX.length - 1] !== null) {
      pValShadeX.push(null);
      pValShadeY.push(null);
    }
  }

  const tracePValArea = {
    x: pValShadeX,
    y: pValShadeY,
    fill: 'tozeroy',
    type: 'scatter',
    mode: 'none',
    name: 'p-Value Tail Area',
    fillcolor: 'rgba(56, 189, 248, 0.40)',
    hoverinfo: 'none'
  };

  // 3. Primary Distribution Line
  const traceNullCurve = {
    x: xs,
    y: ys,
    mode: 'lines',
    name: isT ? `Student's t (df=${df})` : 'Normal N(0, 1)',
    line: { color: '#38bdf8', width: 2.5 },
    hoverinfo: 'x+y'
  };

  const traces = [traceCritArea, tracePValArea, traceNullCurve];

  // If in comparison mode, overlay normal N(0, 1) and t(df) simultaneously
  if (isCompare) {
    const zYs = xs.map(x => normalPdf(x, 0, 1));
    const tYs = xs.map(x => tPdf(x, df));

    traceNullCurve.name = `Student's t (df=${df})`;
    traceNullCurve.y = tYs;
    traceNullCurve.line.color = '#f59e0b'; // Amber for t

    const traceNormal = {
      x: xs,
      y: zYs,
      mode: 'lines',
      name: 'Standard Normal Z',
      line: { color: '#38bdf8', width: 2, dash: 'dash' },
      hoverinfo: 'x+y'
    };
    traces.push(traceNormal);
  }

  // 4. Critical Boundaries & Observed Statistic Lines (Shapes)
  const shapes = [];

  // Critical Value vertical lines
  if (critUpper !== Infinity) {
    shapes.push({
      type: 'line',
      x0: critUpper,
      x1: critUpper,
      y0: 0,
      y1: isT ? tPdf(critUpper, df) * 1.15 : normalPdf(critUpper, 0, 1) * 1.15,
      line: { color: '#f43f5e', width: 2, dash: 'dash' }
    });
  }
  if (critLower !== -Infinity) {
    shapes.push({
      type: 'line',
      x0: critLower,
      x1: critLower,
      y0: 0,
      y1: isT ? tPdf(critLower, df) * 1.15 : normalPdf(critLower, 0, 1) * 1.15,
      line: { color: '#f43f5e', width: 2, dash: 'dash' }
    });
  }

  // Observed Statistic Marker
  shapes.push({
    type: 'line',
    x0: stat,
    x1: stat,
    y0: 0,
    y1: 0.42,
    line: { color: '#fafafa', width: 2.5 }
  });

  const layout = {
    ...DARK_LAYOUT,
    title: { text: 'Sampling Distribution Under H₀ & Critical Cutoffs', font: { size: 13, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: 'Test Statistic Value', range: [minX, maxX] },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Density', range: [-0.01, 0.45] },
    shapes,
    showlegend: true
  };

  Plotly.react('plot-null', traces, layout, { responsive: true, displayModeBar: false });
}

function renderRatioBarPlot(pValue, alpha) {
  $('side-plot-title').textContent = 'p-Value vs Alpha Comparison';

  const trace = {
    x: ['Significance α', 'Sample p-Value'],
    y: [alpha, pValue],
    type: 'bar',
    marker: {
      color: [
        'rgba(244, 63, 94, 0.75)',
        pValue <= alpha ? 'rgba(16, 185, 129, 0.85)' : 'rgba(56, 189, 248, 0.85)'
      ],
      line: { color: '#fafafa', width: 1.5 }
    },
    text: [fmt(alpha, 4), fmtPValue(pValue)],
    textposition: 'auto',
    hoverinfo: 'x+y'
  };

  const layout = {
    ...DARK_LAYOUT,
    title: { text: pValue <= alpha ? 'p ≤ α (Significant)' : 'p > α (Not Significant)', font: { size: 12, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: '' },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Probability Mass', range: [0, Math.max(0.15, pValue * 1.25, alpha * 1.25)] },
    showlegend: false
  };

  Plotly.react('plot-comparison', [trace], layout, { responsive: true, displayModeBar: false });
}

function renderPowerPlot(critUpper, critLower, delta, dir) {
  $('side-plot-title').textContent = 'Power & Error Distributions (H₀ vs H₁)';

  const xs = linspace(-4, 6, 250);
  const nullYs = xs.map(x => normalPdf(x, 0, 1));
  const altYs = xs.map(x => normalPdf(x, delta, 1));

  const traceH0 = {
    x: xs,
    y: nullYs,
    mode: 'lines',
    name: 'Null H₀ (μ=0)',
    line: { color: '#71717a', width: 2, dash: 'dot' }
  };

  const traceH1 = {
    x: xs,
    y: altYs,
    mode: 'lines',
    name: `Alt H₁ (μ=${delta})`,
    line: { color: '#10b981', width: 2.5 }
  };

  // Shaded Power Area under H1 beyond crit
  const powerX = [];
  const powerY = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    let inRejection = false;
    if (dir === 'two-sided') inRejection = x >= critUpper || x <= critLower;
    else if (dir === 'greater') inRejection = x >= critUpper;
    else inRejection = x <= critLower;

    if (inRejection) {
      powerX.push(x);
      powerY.push(altYs[i]);
    }
  }

  const tracePower = {
    x: powerX,
    y: powerY,
    fill: 'tozeroy',
    type: 'scatter',
    mode: 'none',
    name: 'Power (1 - β)',
    fillcolor: 'rgba(16, 185, 129, 0.28)'
  };

  const layout = {
    ...DARK_LAYOUT,
    title: { text: `Effect Size δ=${delta} · Overlapping Hypotheses`, font: { size: 12, color: '#fafafa' } },
    xaxis: { ...DARK_LAYOUT.xaxis, title: 'Value', range: [-4, 6] },
    yaxis: { ...DARK_LAYOUT.yaxis, title: 'Density', range: [-0.01, 0.45] },
    shapes: [
      {
        type: 'line',
        x0: critUpper,
        x1: critUpper,
        y0: 0,
        y1: 0.42,
        line: { color: '#f43f5e', width: 2, dash: 'dash' }
      }
    ],
    showlegend: true
  };

  Plotly.react('plot-comparison', [traceH0, traceH1, tracePower], layout, { responsive: true, displayModeBar: false });
}


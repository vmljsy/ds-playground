/**
 * OLS Regression & Outlier Robustness Simulation
 *
 * Demonstrates:
 * - Ordinary Least Squares (OLS) closed-form solution
 * - Extreme sensitivity and low breakdown point of OLS to leverage points
 * - Interactive dragging of a single outlier point
 * - Real-time recalculation of slope (β₁), intercept (β₀), MSE, and R²
 * - Visual comparison with uncorrupted baseline regression line
 * - Geometric visualization of vertical residual drop lines
 */

import { DARK_LAYOUT, $, fmt, randomNormal } from '../../js/common.js';

// ─── Colors ─────────────────────────────────────────────────────────────────
const COLOR_BASE_POINTS = '#38bdf8';   // Sky Blue
const COLOR_OUTLIER = '#f43f5e';       // Rose Red
const COLOR_OLS_LINE = '#f43f5e';      // Current Fit
const COLOR_BASELINE_LINE = '#10b981'; // Uncorrupted Fit (Emerald)
const COLOR_RESIDUALS = '#a1a1aa';     // Muted Gray

// ─── Simulation State ───────────────────────────────────────────────────────
const STATE = {
  numBasePoints: 15,
  basePoints: [],        // 15 static points { x, y }
  outlier: { x: 80, y: 30 }, // Single draggable point
  showResiduals: true,
  showBaseline: true,
  noiseLevel: 5.5,
  isDragging: false,

  // Current OLS metrics (Base points + Outlier)
  currentOLS: { slope: 0, intercept: 0, mse: 0, r2: 0 },

  // Baseline OLS metrics (Base points only)
  baselineOLS: { slope: 0, intercept: 0, mse: 0, r2: 0 },
};

// ─── Data Generation ────────────────────────────────────────────────────────
function generateData() {
  const points = [];
  // True relationship: y = 1.8 * x + 15
  const step = 70 / (STATE.numBasePoints - 1);
  for (let i = 0; i < STATE.numBasePoints; i++) {
    const x = 12 + i * step + (Math.random() - 0.5) * 3;
    const noise = randomNormal(0, STATE.noiseLevel);
    const y = 1.8 * x + 15 + noise;
    points.push({
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(190, y))
    });
  }

  STATE.basePoints = points;

  // Set default outlier position as a high-leverage outlier
  STATE.outlier = { x: 82, y: 35 };

  computeAllOLS();
}

// ─── Mathematical Core: Closed-Form OLS ─────────────────────────────────────

/**
 * Compute slope β₁, intercept β₀, MSE, and R² using standard closed-form formulas:
 *   β₁ = Σ[(x - x̄)(y - ȳ)] / Σ[(x - x̄)²]
 *   β₀ = ȳ - β₁ · x̄
 */
function calculateOLS(points) {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: 0, mse: 0, r2: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += points[i].x;
    sumY += points[i].y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = points[i].x - meanX;
    const dy = points[i].y - meanY;
    num += dx * dy;
    den += dx * dx;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // Calculate SSE, SST, MSE, R²
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const yPred = intercept + slope * points[i].x;
    const res = points[i].y - yPred;
    sse += res * res;
    const dev = points[i].y - meanY;
    sst += dev * dev;
  }

  const mse = sse / n;
  const r2 = sst === 0 ? 0 : Math.max(0, 1 - (sse / sst));

  return { slope, intercept, mse, r2 };
}

/**
 * Recompute both baseline (15 points) and full (16 points with outlier) models.
 */
function computeAllOLS() {
  // 1. Baseline fit (without outlier)
  STATE.baselineOLS = calculateOLS(STATE.basePoints);

  // 2. Current fit (base points + outlier)
  const allPoints = [...STATE.basePoints, { x: STATE.outlier.x, y: STATE.outlier.y }];
  STATE.currentOLS = calculateOLS(allPoints);
}

// ─── Plotly Rendering ───────────────────────────────────────────────────────
function renderPlot() {
  const traces = [];

  // Trace 0: Base 15 static points
  traces.push({
    x: STATE.basePoints.map(p => p.x),
    y: STATE.basePoints.map(p => p.y),
    mode: 'markers',
    name: 'Base Data (n=15)',
    marker: {
      size: 11,
      color: COLOR_BASE_POINTS,
      opacity: 0.9,
      line: { color: '#09090b', width: 1.5 }
    },
    hoverinfo: 'x+y+name',
    type: 'scatter'
  });

  // Trace 1: The Outlier Point (Draggable)
  traces.push({
    x: [STATE.outlier.x],
    y: [STATE.outlier.y],
    mode: 'markers+text',
    name: 'Draggable Outlier',
    text: ['  Outlier'],
    textposition: 'top right',
    textfont: {
      color: '#fafafa',
      family: 'Geist Mono, monospace',
      size: 12
    },
    marker: {
      size: 18,
      symbol: 'diamond',
      color: COLOR_OUTLIER,
      line: { color: '#ffffff', width: 2.5 }
    },
    hoverinfo: 'x+y+name',
    type: 'scatter'
  });

  // Trace 2: Current OLS Line (skewed by outlier)
  const lineX = [0, 100];
  const lineY = lineX.map(x => STATE.currentOLS.intercept + STATE.currentOLS.slope * x);
  const sign = STATE.currentOLS.intercept >= 0 ? '+' : '-';
  const absB = Math.abs(STATE.currentOLS.intercept);

  traces.push({
    x: lineX,
    y: lineY,
    mode: 'lines',
    name: `Fit (with Outlier): y = ${fmt(STATE.currentOLS.slope, 2)}x ${sign} ${fmt(absB, 1)}`,
    line: {
      color: COLOR_OLS_LINE,
      width: 2.5
    },
    hoverinfo: 'name',
    type: 'scatter'
  });

  // Trace 3: Baseline Fit Line (without outlier)
  if (STATE.showBaseline) {
    const baseLineY = lineX.map(x => STATE.baselineOLS.intercept + STATE.baselineOLS.slope * x);
    const baseSign = STATE.baselineOLS.intercept >= 0 ? '+' : '-';
    const baseAbsB = Math.abs(STATE.baselineOLS.intercept);

    traces.push({
      x: lineX,
      y: baseLineY,
      mode: 'lines',
      name: `Baseline (Clean): y = ${fmt(STATE.baselineOLS.slope, 2)}x ${baseSign} ${fmt(baseAbsB, 1)}`,
      line: {
        color: COLOR_BASELINE_LINE,
        width: 2,
        dash: 'dash'
      },
      hoverinfo: 'name',
      type: 'scatter'
    });
  }

  // Trace 4: Vertical Residual Lines (Drop lines to fitted line)
  if (STATE.showResiduals) {
    const allPoints = [...STATE.basePoints, { x: STATE.outlier.x, y: STATE.outlier.y }];
    const resX = [];
    const resY = [];

    allPoints.forEach(p => {
      const yPred = STATE.currentOLS.intercept + STATE.currentOLS.slope * p.x;
      resX.push(p.x, p.x, null);
      resY.push(p.y, yPred, null);
    });

    traces.push({
      x: resX,
      y: resY,
      mode: 'lines',
      name: 'Residuals (e = y - ŷ)',
      line: {
        color: COLOR_RESIDUALS,
        width: 1.2,
        dash: 'dot'
      },
      hoverinfo: 'none',
      showlegend: true,
      type: 'scatter'
    });
  }

  const layout = {
    ...DARK_LAYOUT,
    title: {
      text: `OLS Fit · MSE = ${fmt(STATE.currentOLS.mse, 1)} · R² = ${fmt(STATE.currentOLS.r2, 3)}`,
      font: { color: '#fafafa', size: 14, family: 'Geist, sans-serif' },
      x: 0.02,
      xanchor: 'left',
    },
    xaxis: {
      ...DARK_LAYOUT.xaxis,
      range: [0, 100],
      title: 'Predictor Variable (X)',
      zeroline: false,
    },
    yaxis: {
      ...DARK_LAYOUT.yaxis,
      range: [0, 200],
      title: 'Response Variable (Y)',
      zeroline: false,
    },
    margin: { t: 45, r: 20, b: 45, l: 55 },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      xanchor: 'left',
      yanchor: 'top',
      font: { color: '#a1a1aa', size: 11 },
      bgcolor: 'rgba(9, 9, 11, 0.85)',
      bordercolor: '#27272a',
      borderwidth: 1
    },
    hovermode: 'closest'
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    editable: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
  };

  Plotly.react('regression-plot', traces, layout, config);
}

// ─── UI & Status Updates ────────────────────────────────────────────────────
function updateUI() {
  const curr = STATE.currentOLS;
  const base = STATE.baselineOLS;

  const sign = curr.intercept >= 0 ? '+' : '-';
  $('stat-equation').textContent = `y = ${fmt(curr.slope, 2)}x ${sign} ${fmt(Math.abs(curr.intercept), 1)}`;
  $('stat-mse').textContent = fmt(curr.mse, 2);
  $('stat-r2').textContent = fmt(curr.r2, 3);

  const baseSign = base.intercept >= 0 ? '+' : '-';
  $('stat-base-equation').textContent = `y = ${fmt(base.slope, 2)}x ${baseSign} ${fmt(Math.abs(base.intercept), 1)}`;
  $('stat-base-mse').textContent = fmt(base.mse, 2);
  $('stat-base-r2').textContent = fmt(base.r2, 3);

  // Outlier position
  $('stat-outlier-x').textContent = fmt(STATE.outlier.x, 1);
  $('stat-outlier-y').textContent = fmt(STATE.outlier.y, 1);
  $('outlier-x-slider').value = Math.round(STATE.outlier.x);
  $('outlier-y-slider').value = Math.round(STATE.outlier.y);
  $('outlier-x-val').textContent = fmt(STATE.outlier.x, 1);
  $('outlier-y-val').textContent = fmt(STATE.outlier.y, 1);

  // Delta slope & leverage indicator
  const slopeDiff = curr.slope - base.slope;
  const slopeDiffPct = base.slope !== 0 ? (slopeDiff / base.slope) * 100 : 0;
  $('stat-slope-delta').textContent = `${slopeDiff >= 0 ? '+' : ''}${fmt(slopeDiff, 3)} (${fmt(slopeDiffPct, 1)}%)`;

  const mseRatio = base.mse !== 0 ? (curr.mse / base.mse) : 1;
  $('stat-mse-ratio').textContent = `${fmt(mseRatio, 1)}× higher`;

  // Leverage diagnosis
  const meanX = 50; // approximate center
  const distFromMean = Math.abs(STATE.outlier.x - meanX);
  const outlierPred = base.intercept + base.slope * STATE.outlier.x;
  const outlierResidual = Math.abs(STATE.outlier.y - outlierPred);

  const badgeLeverage = $('badge-leverage');
  if (badgeLeverage) {
    if (distFromMean > 25 && outlierResidual > 30) {
      badgeLeverage.className = 'badge badge-rose';
      badgeLeverage.textContent = 'High Leverage & Influential';
    } else if (distFromMean > 25) {
      badgeLeverage.className = 'badge badge-amber';
      badgeLeverage.textContent = 'High Leverage (Extreme X)';
    } else if (outlierResidual > 30) {
      badgeLeverage.className = 'badge badge-secondary';
      badgeLeverage.textContent = 'Outlier with Low Leverage';
    } else {
      badgeLeverage.className = 'badge badge-emerald';
      badgeLeverage.textContent = 'Benign Observation';
    }
  }
}

// ─── Outlier Update Handler ─────────────────────────────────────────────────
function updateOutlier(newX, newY) {
  STATE.outlier.x = Math.max(0, Math.min(100, newX));
  STATE.outlier.y = Math.max(0, Math.min(200, newY));
  computeAllOLS();
  renderPlot();
  updateUI();
}

/**
 * Snap outlier back to the uncorrupted regression line.
 */
function resetOutlier() {
  // Place outlier right on baseline line at x = 80
  const cleanX = 80;
  const cleanY = STATE.baselineOLS.intercept + STATE.baselineOLS.slope * cleanX;
  updateOutlier(cleanX, cleanY);
}

// ─── Main Initialization ────────────────────────────────────────────────────
export default function init() {
  generateData();
  renderPlot();
  updateUI();

  // Action Buttons
  $('btn-reset-outlier').addEventListener('click', () => {
    resetOutlier();
  });

  $('btn-new-data').addEventListener('click', () => {
    generateData();
    renderPlot();
    updateUI();
  });

  // Outlier Coordinate Range Sliders
  $('outlier-x-slider').addEventListener('input', (e) => {
    updateOutlier(parseFloat(e.target.value), STATE.outlier.y);
  });

  $('outlier-y-slider').addEventListener('input', (e) => {
    updateOutlier(STATE.outlier.x, parseFloat(e.target.value));
  });

  // Toggles
  $('toggle-residuals').addEventListener('change', (e) => {
    STATE.showResiduals = e.target.checked;
    renderPlot();
  });

  $('toggle-baseline').addEventListener('change', (e) => {
    STATE.showBaseline = e.target.checked;
    renderPlot();
  });

  // Noise Slider
  $('noise-slider').addEventListener('input', (e) => {
    STATE.noiseLevel = parseFloat(e.target.value);
    $('noise-val').textContent = fmt(STATE.noiseLevel, 1);
    generateData();
    renderPlot();
    updateUI();
  });

  // Plotly Drag and Click Interaction
  const plotDiv = $('regression-plot');

  // Convert mouse pixel coordinates to Plotly data values
  function pixelToData(evt) {
    const bbox = plotDiv.getBoundingClientRect();
    if (plotDiv._fullLayout && plotDiv._fullLayout.xaxis && plotDiv._fullLayout.yaxis) {
      const xaxis = plotDiv._fullLayout.xaxis;
      const yaxis = plotDiv._fullLayout.yaxis;
      const xPixel = evt.clientX - bbox.left;
      const yPixel = evt.clientY - bbox.top;

      if (xPixel >= xaxis._offset && xPixel <= xaxis._offset + xaxis._length &&
          yPixel >= yaxis._offset && yPixel <= yaxis._offset + yaxis._length) {
        return {
          x: xaxis.p2c(xPixel),
          y: yaxis.p2c(yPixel)
        };
      }
    }
    return null;
  }

  // Mouse drag handling
  plotDiv.addEventListener('mousedown', (evt) => {
    const dataCoords = pixelToData(evt);
    if (!dataCoords) return;

    // Check if clicked near outlier point (within 10 data units)
    const dx = dataCoords.x - STATE.outlier.x;
    const dy = (dataCoords.y - STATE.outlier.y) / 2; // scaled for y range [0, 200]
    if (Math.sqrt(dx * dx + dy * dy) < 12) {
      STATE.isDragging = true;
      plotDiv.style.cursor = 'grabbing';
      evt.preventDefault();
    }
  });

  window.addEventListener('mousemove', (evt) => {
    if (!STATE.isDragging) return;
    const dataCoords = pixelToData(evt);
    if (dataCoords) {
      updateOutlier(dataCoords.x, dataCoords.y);
    }
  });

  window.addEventListener('mouseup', () => {
    if (STATE.isDragging) {
      STATE.isDragging = false;
      plotDiv.style.cursor = 'default';
    }
  });

  // Clicking anywhere on the plot repositions the outlier
  plotDiv.addEventListener('click', (evt) => {
    const dataCoords = pixelToData(evt);
    if (dataCoords) {
      updateOutlier(dataCoords.x, dataCoords.y);
    }
  });

  // Plotly Native Editable Restyle event support
  plotDiv.on && plotDiv.on('plotly_restyle', (data) => {
    // If Trace 1 (outlier) was moved via Plotly's native editable marker
    if (data && data[0] && data[0]['x']) {
      const newX = data[0]['x'][0];
      const newY = data[0]['y'] ? data[0]['y'][0] : STATE.outlier.y;
      updateOutlier(newX, newY);
    }
  });
}


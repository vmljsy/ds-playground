/**
 * K-Nearest Neighbors (KNN) Decision Boundary Simulation
 *
 * Visualizes non-parametric classification boundaries:
 * - Pre-populated 2-class dataset (Interlocking moons, rings, blobs)
 * - 50x50 background grid evaluation with K-nearest neighbors search
 * - Majority voting and probability density contour mapping
 * - Overfitting (low K) vs Underfitting (high K) analysis
 * - Interactive click-to-add custom points for Class A / Class B
 */

import { DARK_LAYOUT, $, fmt, randomNormal } from '../../js/common.js';

// ─── Colors ─────────────────────────────────────────────────────────────────
const COLOR_CLASS_A = '#f43f5e'; // Rose / Red (Class 0)
const COLOR_CLASS_B = '#38bdf8'; // Sky / Blue (Class 1)

// Discrete Contour Colorscale: Light Rose to Light Sky
const CONTOUR_COLORSCALE = [
  [0.0, 'rgba(244, 63, 94, 0.38)'],
  [0.499, 'rgba(244, 63, 94, 0.15)'],
  [0.5, 'rgba(250, 250, 250, 0.4)'],
  [0.501, 'rgba(56, 189, 248, 0.15)'],
  [1.0, 'rgba(56, 189, 248, 0.38)']
];

// ─── Simulation State ───────────────────────────────────────────────────────
const STATE = {
  k: 3,
  clickClass: 0,        // 0 for Class A (Red), 1 for Class B (Blue)
  metric: 'euclidean',  // 'euclidean' or 'manhattan'
  preset: 'moons',      // 'moons', 'rings', 'blobs'
  points: [],           // Array of { x, y, label, isCustom }
  gridResolution: 50,   // 50x50 grid
  gridX: [],
  gridY: [],
  gridZ: [],            // 2D matrix [50][50] of predicted probabilities (0 to 1)
  accuracy: 100,
};

// ─── Dataset Generators ─────────────────────────────────────────────────────
function generatePreset(preset = 'moons') {
  const points = [];

  if (preset === 'moons') {
    // Interlocking half-moons in [10, 90] space
    const n = 45;
    // Upper moon (Class A / Red)
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * i) / (n - 1);
      const r = 24 + randomNormal(0, 2.2);
      const x = 42 - r * Math.cos(angle);
      const y = 48 + r * Math.sin(angle);
      points.push({ x, y, label: 0, isCustom: false });
    }
    // Lower moon (Class B / Blue)
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * i) / (n - 1);
      const r = 24 + randomNormal(0, 2.2);
      const x = 58 + r * Math.cos(angle);
      const y = 52 - r * Math.sin(angle);
      points.push({ x, y, label: 1, isCustom: false });
    }
  } else if (preset === 'rings') {
    // Inner circle (Class A) & Outer ring (Class B)
    for (let i = 0; i < 40; i++) {
      const r = Math.random() * 15 + randomNormal(0, 1.5);
      const th = Math.random() * 2 * Math.PI;
      points.push({
        x: 50 + r * Math.cos(th),
        y: 50 + r * Math.sin(th),
        label: 0,
        isCustom: false
      });
    }
    for (let i = 0; i < 55; i++) {
      const r = 32 + randomNormal(0, 3.0);
      const th = Math.random() * 2 * Math.PI;
      points.push({
        x: 50 + r * Math.cos(th),
        y: 50 + r * Math.sin(th),
        label: 1,
        isCustom: false
      });
    }
  } else {
    // Two overlapping Gaussian blobs
    for (let i = 0; i < 45; i++) {
      points.push({
        x: randomNormal(35, 11),
        y: randomNormal(62, 11),
        label: 0,
        isCustom: false
      });
    }
    for (let i = 0; i < 45; i++) {
      points.push({
        x: randomNormal(65, 11),
        y: randomNormal(38, 11),
        label: 1,
        isCustom: false
      });
    }
  }

  // Clamp points to [5, 95]
  points.forEach(p => {
    p.x = Math.max(5, Math.min(95, p.x));
    p.y = Math.max(5, Math.min(95, p.y));
  });

  return points;
}

// ─── Mathematical Core: KNN Grid Search ─────────────────────────────────────

/**
 * Compute distance between point A and B using active metric.
 */
function distance(x1, y1, x2, y2, metric = 'euclidean') {
  const dx = x1 - x2;
  const dy = y1 - y2;
  if (metric === 'manhattan') {
    return Math.abs(dx) + Math.abs(dy);
  }
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Predict class probability for a single query point (qx, qy).
 * Returns P(Class = 1 | query) in [0, 1].
 */
function predictKNN(qx, qy, k, metric = 'euclidean', excludeSelfIndex = -1) {
  const n = STATE.points.length;
  if (n === 0) return 0.5;

  const actualK = Math.min(k, excludeSelfIndex >= 0 ? n - 1 : n);
  if (actualK <= 0) return 0.5;

  // Compute distances to all points
  const dists = [];
  for (let i = 0; i < n; i++) {
    if (i === excludeSelfIndex) continue;
    const p = STATE.points[i];
    const d = distance(qx, qy, p.x, p.y, metric);
    dists.push({ dist: d, label: p.label });
  }

  // Sort by distance ascending
  dists.sort((a, b) => a.dist - b.dist);

  // Take top K neighbors and tally votes
  let countB = 0;
  for (let i = 0; i < actualK; i++) {
    if (dists[i].label === 1) countB++;
  }

  return countB / actualK;
}

/**
 * Recompute full 50x50 decision grid.
 */
function recomputeGrid() {
  const res = STATE.gridResolution; // 50
  const xVals = [];
  const yVals = [];

  for (let i = 0; i < res; i++) {
    xVals.push(i * (100 / (res - 1)));
    yVals.push(i * (100 / (res - 1)));
  }

  const zMatrix = [];
  for (let r = 0; r < res; r++) {
    const row = [];
    const qy = yVals[r];
    for (let c = 0; c < res; c++) {
      const qx = xVals[c];
      const probB = predictKNN(qx, qy, STATE.k, STATE.metric);
      row.push(probB);
    }
    zMatrix.push(row);
  }

  STATE.gridX = xVals;
  STATE.gridY = yVals;
  STATE.gridZ = zMatrix;

  // Compute Leave-One-Out or Resubstitution Training Accuracy
  computeAccuracy();
}

/**
 * Compute Leave-One-Out validation accuracy on training set.
 */
function computeAccuracy() {
  if (STATE.points.length === 0) {
    STATE.accuracy = 100;
    return;
  }

  let correct = 0;
  for (let i = 0; i < STATE.points.length; i++) {
    const p = STATE.points[i];
    // Leave-one-out to give meaningful accuracy even when K=1
    const probB = predictKNN(p.x, p.y, STATE.k, STATE.metric, STATE.k === 1 ? -1 : i);
    const predicted = probB >= 0.5 ? 1 : 0;
    if (predicted === p.label) correct++;
  }

  STATE.accuracy = (correct / STATE.points.length) * 100;
}

// ─── Plotly Rendering ───────────────────────────────────────────────────────
function renderPlot() {
  const traces = [];

  // Trace 0: 50x50 Background Contour Plot of Decision Boundary
  traces.push({
    x: STATE.gridX,
    y: STATE.gridY,
    z: STATE.gridZ,
    type: 'contour',
    name: 'Decision Surface',
    colorscale: CONTOUR_COLORSCALE,
    showscale: false,
    hoverinfo: 'none',
    contours: {
      coloring: 'heatmap',
      showlines: true,
      start: 0,
      end: 1,
      size: 0.1,
      line: {
        color: 'rgba(255, 255, 255, 0.12)',
        width: 1
      }
    },
    line: {
      smoothing: 0.85
    }
  });

  // Trace 1: Class A (Red / Rose) Training Points
  const ptsA = STATE.points.filter(p => p.label === 0);
  traces.push({
    x: ptsA.map(p => p.x),
    y: ptsA.map(p => p.y),
    mode: 'markers',
    name: `Class A · Red (n=${ptsA.length})`,
    marker: {
      size: 11,
      color: COLOR_CLASS_A,
      line: { color: '#09090b', width: 1.5 }
    },
    hoverinfo: 'x+y+name',
    type: 'scatter'
  });

  // Trace 2: Class B (Blue / Sky) Training Points
  const ptsB = STATE.points.filter(p => p.label === 1);
  traces.push({
    x: ptsB.map(p => p.x),
    y: ptsB.map(p => p.y),
    mode: 'markers',
    name: `Class B · Blue (n=${ptsB.length})`,
    marker: {
      size: 11,
      color: COLOR_CLASS_B,
      line: { color: '#09090b', width: 1.5 }
    },
    hoverinfo: 'x+y+name',
    type: 'scatter'
  });

  const layout = {
    ...DARK_LAYOUT,
    title: {
      text: `KNN Decision Surface (K = ${STATE.k}) · Resolution: 50×50`,
      font: { color: '#fafafa', size: 14, family: 'Geist, sans-serif' },
      x: 0.02,
      xanchor: 'left',
    },
    xaxis: {
      ...DARK_LAYOUT.xaxis,
      range: [0, 100],
      title: 'Feature X₁',
      zeroline: false,
    },
    yaxis: {
      ...DARK_LAYOUT.yaxis,
      range: [0, 100],
      title: 'Feature X₂',
      zeroline: false,
    },
    margin: { t: 45, r: 20, b: 45, l: 50 },
    showlegend: true,
    legend: {
      x: 1.02,
      y: 1,
      xanchor: 'left',
      yanchor: 'top',
      font: { color: '#a1a1aa', size: 11 },
      bgcolor: 'rgba(9, 9, 11, 0.8)',
      bordercolor: '#27272a',
      borderwidth: 1
    },
    hovermode: 'closest'
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
  };

  Plotly.react('knn-plot', traces, layout, config);
}

// ─── UI & Status Updates ────────────────────────────────────────────────────
function updateUI() {
  $('k-display').textContent = STATE.k;
  $('k-slider').value = STATE.k;
  $('stat-k').textContent = STATE.k;
  $('stat-pts-a').textContent = STATE.points.filter(p => p.label === 0).length;
  $('stat-pts-b').textContent = STATE.points.filter(p => p.label === 1).length;
  $('stat-pts-total').textContent = STATE.points.length;
  $('stat-acc').textContent = `${fmt(STATE.accuracy, 1)}%`;

  // Model complexity / regime analysis
  const regimeBadge = $('badge-regime');
  const regimeDesc = $('stat-regime-desc');

  if (STATE.k === 1) {
    if (regimeBadge) {
      regimeBadge.className = 'badge badge-rose';
      regimeBadge.textContent = 'Severe Overfitting (High Variance)';
    }
    if (regimeDesc) {
      regimeDesc.textContent = 'K=1 forms jagged "islands" around every single data point, memorizing noise.';
    }
  } else if (STATE.k <= 7) {
    if (regimeBadge) {
      regimeBadge.className = 'badge badge-emerald';
      regimeBadge.textContent = 'Optimal Generalization';
    }
    if (regimeDesc) {
      regimeDesc.textContent = 'Balanced trade-off between variance and bias; boundary reflects underlying manifold.';
    }
  } else if (STATE.k <= 13) {
    if (regimeBadge) {
      regimeBadge.className = 'badge badge-outline';
      regimeBadge.textContent = 'Moderate Smoothing';
    }
    if (regimeDesc) {
      regimeDesc.textContent = 'Boundaries become increasingly smooth and begin ignoring fine local pockets.';
    }
  } else {
    if (regimeBadge) {
      regimeBadge.className = 'badge badge-amber';
      regimeBadge.textContent = 'Underfitting (High Bias)';
    }
    if (regimeDesc) {
      regimeDesc.textContent = 'Large K over-averages neighborhood votes, washing out genuine non-linear patterns.';
    }
  }
}

// ─── Main Initialization ────────────────────────────────────────────────────
export default function init() {
  STATE.points = generatePreset(STATE.preset);
  recomputeGrid();
  renderPlot();
  updateUI();

  // Bind Parameter K Slider
  const kSlider = $('k-slider');
  kSlider.addEventListener('input', (e) => {
    STATE.k = parseInt(e.target.value, 10);
    recomputeGrid();
    renderPlot();
    updateUI();
  });

  // Bind Click Action Radio Buttons
  const radioClassA = $('radio-class-a');
  const radioClassB = $('radio-class-b');

  const onRadioChange = () => {
    STATE.clickClass = radioClassA.checked ? 0 : 1;
    $('lbl-radio-a').classList.toggle('active', radioClassA.checked);
    $('lbl-radio-b').classList.toggle('active', radioClassB.checked);
  };

  radioClassA.addEventListener('change', onRadioChange);
  radioClassB.addEventListener('change', onRadioChange);

  // Bind Distance Metric
  $('metric-select').addEventListener('change', (e) => {
    STATE.metric = e.target.value;
    recomputeGrid();
    renderPlot();
    updateUI();
  });

  // Bind Dataset Preset
  $('preset-select').addEventListener('change', (e) => {
    STATE.preset = e.target.value;
    STATE.points = generatePreset(STATE.preset);
    recomputeGrid();
    renderPlot();
    updateUI();
  });

  // Bind Reset Dataset
  $('btn-reset').addEventListener('click', () => {
    STATE.points = generatePreset(STATE.preset);
    recomputeGrid();
    renderPlot();
    updateUI();
  });

  // Bind Clear Custom Points
  $('btn-clear-custom').addEventListener('click', () => {
    STATE.points = STATE.points.filter(p => !p.isCustom);
    recomputeGrid();
    renderPlot();
    updateUI();
  });

  // Bind Quick Add Noise button
  $('btn-add-noise').addEventListener('click', () => {
    for (let i = 0; i < 4; i++) {
      STATE.points.push({
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        label: Math.random() < 0.5 ? 0 : 1,
        isCustom: true
      });
    }
    recomputeGrid();
    renderPlot();
    updateUI();
  });

  // Click on Plotly canvas to add point of selected class
  const plotDiv = $('knn-plot');
  plotDiv.addEventListener('click', (evt) => {
    const bbox = plotDiv.getBoundingClientRect();
    if (plotDiv._fullLayout && plotDiv._fullLayout.xaxis && plotDiv._fullLayout.yaxis) {
      const xaxis = plotDiv._fullLayout.xaxis;
      const yaxis = plotDiv._fullLayout.yaxis;
      const xPixel = evt.clientX - bbox.left;
      const yPixel = evt.clientY - bbox.top;

      if (xPixel >= xaxis._offset && xPixel <= xaxis._offset + xaxis._length &&
          yPixel >= yaxis._offset && yPixel <= yaxis._offset + yaxis._length) {
        const xVal = xaxis.p2c(xPixel);
        const yVal = yaxis.p2c(yPixel);
        if (xVal >= 0 && xVal <= 100 && yVal >= 0 && yVal <= 100) {
          STATE.points.push({
            x: xVal,
            y: yVal,
            label: STATE.clickClass,
            isCustom: true
          });
          recomputeGrid();
          renderPlot();
          updateUI();
        }
      }
    }
  });
}


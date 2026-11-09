/**
 * K-Means Clustering (Lloyd's Algorithm) Simulation
 *
 * Demonstrates iterative clustering on 2D data:
 * - Data generation: ~100 random points loosely grouped into clusters
 * - Random centroid initialization (and optional K-Means++)
 * - Step 1: Voronoi assignment of points to closest centroid
 * - Step 2: Centroid re-centering to cluster mean
 * - Inertia (WCSS) tracking and convergence detection
 */

import { DARK_LAYOUT, $, fmt, randomNormal } from '../../js/common.js';

// ─── Cluster Palette ────────────────────────────────────────────────────────
const CLUSTER_COLORS = [
  '#38bdf8', // Cyan / Light Blue
  '#f43f5e', // Rose / Red
  '#10b981', // Emerald / Green
  '#f59e0b', // Amber / Yellow
  '#a855f7', // Purple / Violet
  '#fb923c', // Orange
  '#06b6d4', // Teal
];

const UNASSIGNED_COLOR = '#71717a';

// ─── Simulation State ───────────────────────────────────────────────────────
const STATE = {
  k: 3,
  points: [],          // Array of { x, y, cluster: -1 }
  centroids: [],       // Array of { x, y, color, id }
  centroidHistory: [], // Array of centroids snapshots for trajectory lines
  step: 'uninitialized', // 'uninitialized', 'assigned', 'moved', 'converged'
  iteration: 0,
  wcss: 0,
  maxShift: 0,
  isRunning: false,
  animationTimer: null,
  animationSpeed: 600, // ms between steps
  initMethod: 'random', // 'random' or 'kmeanspp'
  datasetPreset: 'gaussian3',
};

// ─── Data Generation ────────────────────────────────────────────────────────
function generateData(preset = 'gaussian3') {
  const points = [];

  if (preset === 'gaussian3') {
    // 3 well-separated loose clusters (~100 points)
    const centers = [
      { x: 25, y: 75, std: 8, n: 35 },
      { x: 75, y: 65, std: 9, n: 35 },
      { x: 50, y: 25, std: 8, n: 35 },
    ];
    centers.forEach(c => {
      for (let i = 0; i < c.n; i++) {
        const x = Math.max(3, Math.min(97, randomNormal(c.x, c.std)));
        const y = Math.max(3, Math.min(97, randomNormal(c.y, c.std)));
        points.push({ x, y, cluster: -1 });
      }
    });
  } else if (preset === 'clusters4') {
    // 4 clusters across quadrants (~100 points)
    const centers = [
      { x: 25, y: 30, std: 7, n: 25 },
      { x: 28, y: 75, std: 8, n: 25 },
      { x: 75, y: 30, std: 8, n: 25 },
      { x: 75, y: 80, std: 7, n: 25 },
    ];
    centers.forEach(c => {
      for (let i = 0; i < c.n; i++) {
        const x = Math.max(3, Math.min(97, randomNormal(c.x, c.std)));
        const y = Math.max(3, Math.min(97, randomNormal(c.y, c.std)));
        points.push({ x, y, cluster: -1 });
      }
    });
  } else if (preset === 'concentric') {
    // Center cluster + outer ring
    for (let i = 0; i < 40; i++) {
      const r = Math.random() * 12;
      const th = Math.random() * 2 * Math.PI;
      points.push({
        x: Math.max(5, Math.min(95, 50 + r * Math.cos(th))),
        y: Math.max(5, Math.min(95, 50 + r * Math.sin(th))),
        cluster: -1
      });
    }
    for (let i = 0; i < 65; i++) {
      const r = 32 + randomNormal(0, 3.5);
      const th = Math.random() * 2 * Math.PI;
      points.push({
        x: Math.max(5, Math.min(95, 50 + r * Math.cos(th))),
        y: Math.max(5, Math.min(95, 50 + r * Math.sin(th))),
        cluster: -1
      });
    }
  } else {
    // Uniform scatter (100 points)
    for (let i = 0; i < 100; i++) {
      points.push({
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 90,
        cluster: -1
      });
    }
  }

  return points;
}

// ─── Mathematical Algorithms ────────────────────────────────────────────────

/**
 * Euclidean distance between two 2D points.
 */
function distSq(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

function dist(p1, p2) {
  return Math.sqrt(distSq(p1, p2));
}

/**
 * Initialize K centroids within data bounding box.
 */
function initCentroids() {
  stopAutoRun();
  STATE.centroids = [];
  STATE.centroidHistory = [];
  STATE.iteration = 0;
  STATE.maxShift = 0;

  // Unassign all points
  STATE.points.forEach(p => p.cluster = -1);

  if (STATE.initMethod === 'kmeanspp' && STATE.points.length > 0) {
    // K-Means++ initialization
    // 1. Pick first centroid uniformly at random from points
    const firstIdx = Math.floor(Math.random() * STATE.points.length);
    STATE.centroids.push({
      x: STATE.points[firstIdx].x,
      y: STATE.points[firstIdx].y,
      color: CLUSTER_COLORS[0 % CLUSTER_COLORS.length],
      id: 0,
    });

    // 2. Select remaining K-1 centroids with probability proportional to D(x)^2
    for (let c = 1; c < STATE.k; c++) {
      const d2 = STATE.points.map(p => {
        let minD2 = Infinity;
        for (const cent of STATE.centroids) {
          const d = distSq(p, cent);
          if (d < minD2) minD2 = d;
        }
        return minD2;
      });

      const sumD2 = d2.reduce((a, b) => a + b, 0);
      let rand = Math.random() * sumD2;
      let chosenIdx = 0;
      for (let i = 0; i < d2.length; i++) {
        rand -= d2[i];
        if (rand <= 0) {
          chosenIdx = i;
          break;
        }
      }

      STATE.centroids.push({
        x: STATE.points[chosenIdx].x,
        y: STATE.points[chosenIdx].y,
        color: CLUSTER_COLORS[c % CLUSTER_COLORS.length],
        id: c,
      });
    }
  } else {
    // Standard random placement within bounds [10, 90]
    for (let i = 0; i < STATE.k; i++) {
      // Pick random coordinates or random point to avoid far off-screen centroids
      if (STATE.points.length > 0 && Math.random() < 0.8) {
        const p = STATE.points[Math.floor(Math.random() * STATE.points.length)];
        STATE.centroids.push({
          x: Math.max(5, Math.min(95, p.x + (Math.random() - 0.5) * 10)),
          y: Math.max(5, Math.min(95, p.y + (Math.random() - 0.5) * 10)),
          color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
          id: i,
        });
      } else {
        STATE.centroids.push({
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80,
          color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
          id: i,
        });
      }
    }
  }

  // Save initial snapshot
  saveCentroidHistory();

  STATE.step = 'initialized';
  calculateWCSS();
  updateUI();
  renderPlot();
}

/**
 * Step 1: Assignment Phase
 * Assign each point to its nearest centroid.
 */
function stepAssign() {
  if (STATE.centroids.length === 0) {
    initCentroids();
  }

  let changed = false;
  STATE.points.forEach(p => {
    let bestDist = Infinity;
    let bestCluster = -1;

    STATE.centroids.forEach((cent, cIdx) => {
      const d = distSq(p, cent);
      if (d < bestDist) {
        bestDist = d;
        bestCluster = cIdx;
      }
    });

    if (p.cluster !== bestCluster) {
      p.cluster = bestCluster;
      changed = true;
    }
  });

  STATE.step = 'assigned';
  calculateWCSS();
  updateUI();
  renderPlot();

  return changed;
}

/**
 * Step 2: Update Phase
 * Move each centroid to the mean of its assigned points.
 */
function stepMoveCentroids() {
  if (STATE.centroids.length === 0) return false;

  let maxShift = 0;

  STATE.centroids.forEach((cent, cIdx) => {
    const assigned = STATE.points.filter(p => p.cluster === cIdx);
    if (assigned.length > 0) {
      let sumX = 0;
      let sumY = 0;
      assigned.forEach(p => {
        sumX += p.x;
        sumY += p.y;
      });
      const newX = sumX / assigned.length;
      const newY = sumY / assigned.length;

      const shift = dist({ x: newX, y: newY }, cent);
      if (shift > maxShift) maxShift = shift;

      cent.x = newX;
      cent.y = newY;
    } else {
      // Empty cluster: re-seed to a random point or jitter
      if (STATE.points.length > 0) {
        const randPt = STATE.points[Math.floor(Math.random() * STATE.points.length)];
        cent.x = randPt.x + (Math.random() - 0.5) * 5;
        cent.y = randPt.y + (Math.random() - 0.5) * 5;
      }
    }
  });

  STATE.iteration++;
  STATE.maxShift = maxShift;
  saveCentroidHistory();

  // Convergence check: if centroids barely moved (< 0.05 units)
  if (maxShift < 0.05 && STATE.iteration > 1) {
    STATE.step = 'converged';
    stopAutoRun();
  } else {
    STATE.step = 'moved';
  }

  calculateWCSS();
  updateUI();
  renderPlot();

  return maxShift >= 0.05;
}

/**
 * Perform a single step of the K-Means algorithm.
 */
function singleStep() {
  if (STATE.step === 'uninitialized') {
    initCentroids();
  } else if (STATE.step === 'initialized' || STATE.step === 'moved') {
    stepAssign();
  } else if (STATE.step === 'assigned') {
    stepMoveCentroids();
  } else if (STATE.step === 'converged') {
    stopAutoRun();
  }
}

/**
 * Save snapshot of centroid positions for trajectory plotting.
 */
function saveCentroidHistory() {
  const snapshot = STATE.centroids.map(c => ({ x: c.x, y: c.y, id: c.id }));
  STATE.centroidHistory.push(snapshot);
}

/**
 * Calculate Within-Cluster Sum of Squares (WCSS / Inertia).
 */
function calculateWCSS() {
  let totalWcss = 0;
  if (STATE.centroids.length === 0) {
    STATE.wcss = 0;
    return;
  }

  STATE.points.forEach(p => {
    if (p.cluster >= 0 && p.cluster < STATE.centroids.length) {
      const cent = STATE.centroids[p.cluster];
      totalWcss += distSq(p, cent);
    } else {
      // If unassigned, measure to nearest centroid
      let minDistSq = Infinity;
      STATE.centroids.forEach(cent => {
        const d = distSq(p, cent);
        if (d < minDistSq) minDistSq = d;
      });
      if (minDistSq < Infinity) totalWcss += minDistSq;
    }
  });

  STATE.wcss = totalWcss;
}

// ─── Auto-Run Animation ─────────────────────────────────────────────────────
function startAutoRun() {
  if (STATE.isRunning) return;
  STATE.isRunning = true;
  $('btn-autorun').textContent = 'Pause Animation';
  $('btn-autorun').classList.remove('btn-primary');
  $('btn-autorun').classList.add('btn-secondary');

  STATE.animationTimer = setInterval(() => {
    if (STATE.step === 'converged') {
      stopAutoRun();
      return;
    }
    singleStep();
  }, STATE.animationSpeed);
}

function stopAutoRun() {
  if (STATE.animationTimer) {
    clearInterval(STATE.animationTimer);
    STATE.animationTimer = null;
  }
  STATE.isRunning = false;
  const btn = $('btn-autorun');
  if (btn) {
    btn.textContent = 'Auto-Run (Animate)';
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
  }
}

function toggleAutoRun() {
  if (STATE.isRunning) {
    stopAutoRun();
  } else {
    if (STATE.step === 'converged') {
      // Re-init if already converged
      initCentroids();
    }
    startAutoRun();
  }
}

// ─── Plotly Rendering ───────────────────────────────────────────────────────
function renderPlot() {
  const traces = [];

  // 1. Data point traces: one trace per cluster
  // Unassigned points trace (if any)
  const unassigned = STATE.points.filter(p => p.cluster === -1);
  if (unassigned.length > 0) {
    traces.push({
      x: unassigned.map(p => p.x),
      y: unassigned.map(p => p.y),
      mode: 'markers',
      name: 'Unassigned',
      marker: {
        size: 9,
        color: UNASSIGNED_COLOR,
        opacity: 0.75,
        line: { color: '#09090b', width: 1 }
      },
      hoverinfo: 'x+y+name',
      type: 'scatter'
    });
  }

  // Active cluster point traces
  for (let c = 0; c < STATE.k; c++) {
    const pts = STATE.points.filter(p => p.cluster === c);
    const color = CLUSTER_COLORS[c % CLUSTER_COLORS.length];
    traces.push({
      x: pts.map(p => p.x),
      y: pts.map(p => p.y),
      mode: 'markers',
      name: `Cluster ${c + 1} (n=${pts.length})`,
      marker: {
        size: 9,
        color: color,
        opacity: 0.85,
        line: { color: '#09090b', width: 1.2 }
      },
      hoverinfo: 'x+y+name',
      type: 'scatter'
    });
  }

  // 2. Centroid trajectory trails
  if (STATE.centroidHistory.length > 1) {
    for (let c = 0; c < STATE.k; c++) {
      const trailX = [];
      const trailY = [];
      for (const snap of STATE.centroidHistory) {
        if (snap[c]) {
          trailX.push(snap[c].x);
          trailY.push(snap[c].y);
        }
      }
      traces.push({
        x: trailX,
        y: trailY,
        mode: 'lines',
        name: `Path ${c + 1}`,
        line: {
          color: CLUSTER_COLORS[c % CLUSTER_COLORS.length],
          width: 2,
          dash: 'dot'
        },
        hoverinfo: 'none',
        showlegend: false,
        type: 'scatter'
      });
    }
  }

  // 3. Centroids trace: large cross/X markers with distinct color
  if (STATE.centroids.length > 0) {
    traces.push({
      x: STATE.centroids.map(c => c.x),
      y: STATE.centroids.map(c => c.y),
      mode: 'markers+text',
      name: 'Centroids (μ)',
      text: STATE.centroids.map((c, i) => ` C${i + 1}`),
      textposition: 'top right',
      textfont: {
        color: '#fafafa',
        family: 'Geist Mono, monospace',
        size: 11
      },
      marker: {
        size: 18,
        symbol: 'x',
        color: STATE.centroids.map(c => c.color),
        line: {
          color: '#ffffff',
          width: 3
        }
      },
      hoverinfo: 'x+y+name',
      type: 'scatter'
    });
  }

  const layout = {
    ...DARK_LAYOUT,
    title: {
      text: `K-Means Iteration ${STATE.iteration} · Phase: ${formatPhase(STATE.step)}`,
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

  Plotly.react('kmeans-plot', traces, layout, config);
}

// ─── UI & Status Updates ────────────────────────────────────────────────────
function formatPhase(step) {
  switch (step) {
    case 'uninitialized': return 'Ready (Uninitialized)';
    case 'initialized':   return 'Centroids Placed';
    case 'assigned':      return 'Step 1 Complete (Points Assigned)';
    case 'moved':         return 'Step 2 Complete (Centroids Shifted)';
    case 'converged':     return 'Converged! (Centroids Stable)';
    default:              return step;
  }
}

function updateUI() {
  $('stat-k').textContent = STATE.k;
  $('stat-iter').textContent = STATE.iteration;
  $('stat-wcss').textContent = fmt(STATE.wcss, 1);
  $('stat-shift').textContent = fmt(STATE.maxShift, 3);
  $('stat-phase').textContent = formatPhase(STATE.step);

  const phaseBadge = $('badge-status');
  if (phaseBadge) {
    if (STATE.step === 'converged') {
      phaseBadge.className = 'badge badge-emerald';
      phaseBadge.textContent = 'Converged';
    } else if (STATE.step === 'uninitialized') {
      phaseBadge.className = 'badge badge-outline';
      phaseBadge.textContent = 'Not Started';
    } else {
      phaseBadge.className = 'badge badge-amber';
      phaseBadge.textContent = `Running · Iter ${STATE.iteration}`;
    }
  }

  // Update cluster breakdown
  const breakdownEl = $('cluster-breakdown');
  if (breakdownEl) {
    let html = '';
    for (let c = 0; c < STATE.k; c++) {
      const count = STATE.points.filter(p => p.cluster === c).length;
      const color = CLUSTER_COLORS[c % CLUSTER_COLORS.length];
      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.8125rem;">
          <span style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
            <span>Cluster ${c + 1}</span>
          </span>
          <span class="font-mono" style="font-weight: 600;">${count} pts (${STATE.points.length ? Math.round(count / STATE.points.length * 100) : 0}%)</span>
        </div>
      `;
    }
    breakdownEl.innerHTML = html;
  }

  // Sync inputs
  $('k-input').value = STATE.k;
  $('k-slider').value = STATE.k;
  $('k-display').textContent = STATE.k;
}

// ─── Main Initialization ────────────────────────────────────────────────────
export default function init() {
  // Generate initial dataset
  STATE.points = generateData(STATE.datasetPreset);

  // Bind controls
  const kInput = $('k-input');
  const kSlider = $('k-slider');

  const onKChange = (val) => {
    const newK = Math.max(1, Math.min(7, parseInt(val, 10) || 3));
    if (newK !== STATE.k) {
      STATE.k = newK;
      initCentroids();
    }
  };

  kInput.addEventListener('change', (e) => onKChange(e.target.value));
  kSlider.addEventListener('input', (e) => onKChange(e.target.value));

  $('btn-init').addEventListener('click', () => {
    initCentroids();
  });

  $('btn-assign').addEventListener('click', () => {
    stopAutoRun();
    stepAssign();
  });

  $('btn-move').addEventListener('click', () => {
    stopAutoRun();
    stepMoveCentroids();
  });

  $('btn-autorun').addEventListener('click', () => {
    toggleAutoRun();
  });

  $('btn-reset').addEventListener('click', () => {
    stopAutoRun();
    STATE.points = generateData(STATE.datasetPreset);
    initCentroids();
  });

  $('preset-select').addEventListener('change', (e) => {
    stopAutoRun();
    STATE.datasetPreset = e.target.value;
    STATE.points = generateData(STATE.datasetPreset);
    initCentroids();
  });

  $('init-method-select').addEventListener('change', (e) => {
    STATE.initMethod = e.target.value;
    initCentroids();
  });

  $('speed-slider').addEventListener('input', (e) => {
    STATE.animationSpeed = parseInt(e.target.value, 10);
    $('speed-value').textContent = `${STATE.animationSpeed}ms`;
    if (STATE.isRunning) {
      stopAutoRun();
      startAutoRun();
    }
  });

  // Enable click on plot to add custom point
  const plotDiv = $('kmeans-plot');
  plotDiv.addEventListener('click', (evt) => {
    // Only add if click is within plot area (not modebar)
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
          STATE.points.push({ x: xVal, y: yVal, cluster: -1 });
          if (STATE.centroids.length > 0) {
            stepAssign();
          } else {
            renderPlot();
          }
        }
      }
    }
  });

  // First initialization
  initCentroids();
}


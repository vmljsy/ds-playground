/**
 * DS Simulations — Shared Utilities
 * 
 * Common helper functions used across all experiment pages.
 */

// ─── Random Number Generators ────────────────────────────────────

/**
 * Generate a normally-distributed random number using the Box-Muller transform.
 * @param {number} mean - Mean of the distribution
 * @param {number} std - Standard deviation
 * @returns {number}
 */
export function randomNormal(mean = 0, std = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * std + mean;
}

/**
 * Generate an exponentially-distributed random number.
 * @param {number} scale - Scale parameter (1/λ)
 * @returns {number}
 */
export function randomExponential(scale = 1) {
  return -Math.log(Math.random()) * scale;
}

/**
 * Generate a Poisson-distributed random number using Knuth's algorithm.
 * @param {number} lambda - Rate parameter
 * @returns {number}
 */
export function randomPoisson(lambda = 1) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ─── Statistical Functions ───────────────────────────────────────

/**
 * Compute the arithmetic mean of an array.
 * @param {number[]} arr
 * @returns {number}
 */
export function mean(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/**
 * Compute the standard deviation of an array (population SD).
 * @param {number[]} arr
 * @returns {number}
 */
export function std(arr) {
  const m = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / arr.length);
}

/**
 * Compute the normal PDF value.
 * @param {number} x
 * @param {number} mu - Mean
 * @param {number} sigma - Standard deviation
 * @returns {number}
 */
export function normalPdf(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Draw a random sample (with replacement) from an array.
 * @param {number[]} population
 * @param {number} size
 * @returns {number[]}
 */
export function sampleWithReplacement(population, size) {
  const sample = new Array(size);
  for (let i = 0; i < size; i++) {
    sample[i] = population[Math.floor(Math.random() * population.length)];
  }
  return sample;
}

/**
 * Generate linearly spaced values.
 * @param {number} start
 * @param {number} end
 * @param {number} n - Number of points
 * @returns {number[]}
 */
export function linspace(start, end, n) {
  const arr = new Array(n);
  const step = (end - start) / (n - 1);
  for (let i = 0; i < n; i++) {
    arr[i] = start + step * i;
  }
  return arr;
}

// ─── Plotly Theme ────────────────────────────────────────────────

/**
 * Default dark Plotly layout matching the site's color scheme.
 * Spread this into your Plotly layout objects.
 */
export const DARK_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: '#e8eaed', family: 'Inter, sans-serif', size: 13 },
  xaxis: {
    gridcolor: '#2d3148',
    zerolinecolor: '#2d3148',
    linecolor: '#2d3148',
  },
  yaxis: {
    gridcolor: '#2d3148',
    zerolinecolor: '#2d3148',
    linecolor: '#2d3148',
    title: 'Density',
  },
  margin: { t: 50, r: 20, b: 50, l: 60 },
  showlegend: true,
  legend: { font: { color: '#9aa0a6', size: 12 } },
  bargap: 0.05,
};

// ─── DOM Helpers ─────────────────────────────────────────────────

/**
 * Shorthand for document.getElementById.
 * @param {string} id
 * @returns {HTMLElement}
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Format a number to a fixed number of decimals.
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
export function fmt(value, decimals = 2) {
  return Number(value).toFixed(decimals);
}


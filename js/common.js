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
  let u1, u2;
  do { u1 = Math.random(); } while (u1 === 0);
  u2 = Math.random();
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

// ─── Statistical Summary Functions ───────────────────────────────

/**
 * Compute the arithmetic mean of an array.
 * @param {number[]} arr
 * @returns {number}
 */
export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/**
 * Compute the standard deviation of an array.
 * @param {number[]} arr
 * @param {boolean} sample - true for sample SD (div by n-1), false for population SD (div by n)
 * @returns {number}
 */
export function std(arr, sample = false) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    sumSq += d * d;
  }
  const denom = sample ? arr.length - 1 : arr.length;
  return Math.sqrt(sumSq / denom);
}

// ─── Mathematical & Special Functions ────────────────────────────

/**
 * Lanczos approximation for log-gamma function ln(Gamma(x)).
 * Accurate to > 1e-12 for x > 0.
 * @param {number} x
 * @returns {number}
 */
export function logGamma(x) {
  if (x <= 0) return 0;
  const p = [
    0.99999999999980993,
    676.5203681218851,
   -1259.1392167224028,
    771.32342877765313,
   -176.61502916214059,
    12.507343278686905,
   -0.138571095836524,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  const g = 7;
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = p[0];
  const t = x + g + 0.5;
  for (let i = 1; i < p.length; i++) {
    a += p[i] / (x + i);
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Error function erf(x) via Chebyshev approximation.
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

/**
 * Regularized incomplete beta function I_x(a, b) via continued fraction.
 * @param {number} x (0 <= x <= 1)
 * @param {number} a (> 0)
 * @param {number} b (> 0)
 * @returns {number}
 */
export function incBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incBeta(1 - x, b, a);
  }

  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)) / a;

  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 100; m++) {
    // even step
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;

    // odd step
    num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < 1e-12) break;
  }

  return factor * h;
}

/**
 * Regularized lower incomplete gamma function P(a, x) = gamma(a, x) / Gamma(a).
 * @param {number} a
 * @param {number} x
 * @returns {number}
 */
export function gammaLowerInc(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 120; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  } else {
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 120; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    const gammcf = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
    return 1 - gammcf;
  }
}

// ─── Probability Distributions (PDF / PMF / CDF / Quantiles) ─────

/**
 * Compute Normal Probability Density Function (PDF).
 * @param {number} x
 * @param {number} mu - Mean
 * @param {number} sigma - Standard deviation
 * @returns {number}
 */
export function normalPdf(x, mu = 0, sigma = 1) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Compute Normal Cumulative Distribution Function (CDF).
 * @param {number} x
 * @param {number} mu
 * @param {number} sigma
 * @returns {number}
 */
export function normalCdf(x, mu = 0, sigma = 1) {
  const z = (x - mu) / (sigma * Math.SQRT2);
  return 0.5 * (1 + erf(z));
}

/**
 * Compute Inverse Normal CDF (Probit function) using Acklam's algorithm.
 * High precision (< 1.15e-9 relative error).
 * @param {number} p - Probability in (0, 1)
 * @param {number} mu - Mean
 * @param {number} sigma - Standard deviation
 * @returns {number}
 */
export function normalInv(p, mu = 0, sigma = 1) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680133088877199e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];
  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let z;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    z = (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
        ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    z = (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5])*q /
        (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
         ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }

  return z * sigma + mu;
}

/**
 * Student's t Probability Density Function (PDF).
 * @param {number} t
 * @param {number} df - Degrees of freedom (> 0)
 * @returns {number}
 */
export function tPdf(t, df) {
  if (df <= 0) return 0;
  const logNumerator = logGamma((df + 1) / 2);
  const logDenominator = logGamma(df / 2) + 0.5 * Math.log(df * Math.PI);
  const power = -((df + 1) / 2) * Math.log(1 + (t * t) / df);
  return Math.exp(logNumerator - logDenominator + power);
}

/**
 * Student's t Cumulative Distribution Function (CDF).
 * @param {number} t
 * @param {number} df
 * @returns {number}
 */
export function tCdf(t, df) {
  if (df <= 0) return NaN;
  if (t === 0) return 0.5;
  const x = df / (df + t * t);
  const ib = incBeta(x, df / 2, 0.5);
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

/**
 * Inverse Student's t CDF (Quantile function).
 * Finds t such that tCdf(t, df) = p using fast binary search.
 * @param {number} p (0 < p < 1)
 * @param {number} df
 * @returns {number}
 */
export function tInv(p, df) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // For very high df, normal approximation is accurate to > 4 decimals
  if (df > 500) return normalInv(p);

  let low = p < 0.5 ? -60 : 0;
  let high = p < 0.5 ? 0 : 60;

  for (let iter = 0; iter < 45; iter++) {
    const mid = (low + high) / 2;
    const val = tCdf(mid, df);
    if (val < p) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

/**
 * Chi-Square Probability Density Function (PDF).
 * @param {number} x (>= 0)
 * @param {number} k - Degrees of freedom
 * @returns {number}
 */
export function chiSqPdf(x, k) {
  if (x <= 0 || k <= 0) return 0;
  const halfK = k / 2;
  const logVal = (halfK - 1) * Math.log(x) - x / 2 - halfK * Math.log(2) - logGamma(halfK);
  return Math.exp(logVal);
}

/**
 * Chi-Square Cumulative Distribution Function (CDF).
 * @param {number} x
 * @param {number} k
 * @returns {number}
 */
export function chiSqCdf(x, k) {
  if (x <= 0 || k <= 0) return 0;
  return gammaLowerInc(k / 2, x / 2);
}

/**
 * Binomial Probability Mass Function (PMF).
 * P(X = k) = nCk * p^k * (1-p)^(n-k)
 * @param {number} k - Number of successes (integer)
 * @param {number} n - Number of trials (integer)
 * @param {number} p - Probability of success (0 <= p <= 1)
 * @returns {number}
 */
export function binomialPmf(k, n, p) {
  if (k < 0 || k > n || p < 0 || p > 1) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logComb = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  const logProb = logComb + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logProb);
}

/**
 * Poisson Probability Mass Function (PMF).
 * P(X = k) = (lambda^k * exp(-lambda)) / k!
 * @param {number} k
 * @param {number} lambda
 * @returns {number}
 */
export function poissonPmf(k, lambda) {
  if (k < 0 || lambda <= 0) return 0;
  const logProb = k * Math.log(lambda) - lambda - logGamma(k + 1);
  return Math.exp(logProb);
}

// ─── Hypothesis Testing & Inferential Statistics ─────────────────

/**
 * One-Sample z-Test.
 * Tests H0: mu = mu0 (with known population sigma).
 * @param {number} xBar - Sample mean
 * @param {number} mu0 - Hypothesized null mean
 * @param {number} sigma - Population standard deviation
 * @param {number} n - Sample size
 * @param {number} alpha - Significance level (default 0.05)
 * @param {string} direction - 'two-sided', 'greater', or 'less'
 */
export function oneSampleZTest(xBar, mu0, sigma, n, alpha = 0.05, direction = 'two-sided') {
  const se = sigma / Math.sqrt(n);
  const z = (xBar - mu0) / se;

  let pValue, zCritLower, zCritUpper, reject;

  if (direction === 'two-sided') {
    zCritUpper = normalInv(1 - alpha / 2);
    zCritLower = -zCritUpper;
    pValue = 2 * (1 - normalCdf(Math.abs(z)));
    reject = Math.abs(z) >= zCritUpper;
  } else if (direction === 'greater') {
    zCritUpper = normalInv(1 - alpha);
    zCritLower = -Infinity;
    pValue = 1 - normalCdf(z);
    reject = z >= zCritUpper;
  } else {
    zCritLower = normalInv(alpha);
    zCritUpper = Infinity;
    pValue = normalCdf(z);
    reject = z <= zCritLower;
  }

  // Two-sided confidence interval for mu
  const zStar = normalInv(1 - alpha / 2);
  const me = zStar * se;
  const ci = [xBar - me, xBar + me];

  return { z, se, pValue, zCritLower, zCritUpper, ci, me, reject, alpha };
}

/**
 * One-Sample Student's t-Test.
 * Tests H0: mu = mu0 (with unknown sigma, estimated from sample).
 * @param {number[]} sampleArr - Array of numeric samples
 * @param {number} mu0 - Hypothesized null mean
 * @param {number} alpha - Significance level
 * @param {string} direction - 'two-sided', 'greater', 'less'
 */
export function oneSampleTTest(sampleArr, mu0, alpha = 0.05, direction = 'two-sided') {
  const n = sampleArr.length;
  const df = n - 1;
  const xBar = mean(sampleArr);
  const s = std(sampleArr, true);
  const se = s / Math.sqrt(n);
  const t = se > 0 ? (xBar - mu0) / se : 0;

  let pValue, tCritLower, tCritUpper, reject;

  if (direction === 'two-sided') {
    tCritUpper = tInv(1 - alpha / 2, df);
    tCritLower = -tCritUpper;
    pValue = 2 * (1 - tCdf(Math.abs(t), df));
    reject = Math.abs(t) >= tCritUpper;
  } else if (direction === 'greater') {
    tCritUpper = tInv(1 - alpha, df);
    tCritLower = -Infinity;
    pValue = 1 - tCdf(t, df);
    reject = t >= tCritUpper;
  } else {
    tCritLower = tInv(alpha, df);
    tCritUpper = Infinity;
    pValue = tCdf(t, df);
    reject = t <= tCritLower;
  }

  const tStar = tInv(1 - alpha / 2, df);
  const me = tStar * se;
  const ci = [xBar - me, xBar + me];

  return { t, xBar, s, se, df, pValue, tCritLower, tCritUpper, ci, me, reject, alpha };
}

/**
 * Two-Sample Welch's t-Test (unequal variances assumed).
 * Tests H0: mu1 = mu2.
 */
export function twoSampleWelchTTest(mean1, s1, n1, mean2, s2, n2, alpha = 0.05, direction = 'two-sided') {
  const diff = mean2 - mean1;
  const v1 = (s1 * s1) / n1;
  const v2 = (s2 * s2) / n2;
  const se = Math.sqrt(v1 + v2);
  const t = se > 0 ? diff / se : 0;

  // Welch-Satterthwaite degrees of freedom
  const numDf = (v1 + v2) * (v1 + v2);
  const denDf = (v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1);
  const df = denDf > 0 ? numDf / denDf : 1;

  let pValue, tCritUpper, tCritLower, reject;

  if (direction === 'two-sided') {
    tCritUpper = tInv(1 - alpha / 2, df);
    tCritLower = -tCritUpper;
    pValue = 2 * (1 - tCdf(Math.abs(t), df));
    reject = Math.abs(t) >= tCritUpper;
  } else if (direction === 'greater') {
    tCritUpper = tInv(1 - alpha, df);
    tCritLower = -Infinity;
    pValue = 1 - tCdf(t, df);
    reject = t >= tCritUpper;
  } else {
    tCritLower = tInv(alpha, df);
    tCritUpper = Infinity;
    pValue = tCdf(t, df);
    reject = t <= tCritLower;
  }

  const tStar = tInv(1 - alpha / 2, df);
  const me = tStar * se;
  const ciDiff = [diff - me, diff + me];

  return { diff, se, t, df, pValue, tCritLower, tCritUpper, ciDiff, me, reject, alpha };
}

/**
 * Two-Proportion z-Test (A/B testing standard for conversion rates).
 * Tests H0: p1 = p2.
 * @param {number} x1 - Successes in group 1 (Control)
 * @param {number} n1 - Total trials in group 1
 * @param {number} x2 - Successes in group 2 (Treatment)
 * @param {number} n2 - Total trials in group 2
 * @param {number} alpha - Significance level (default 0.05)
 * @param {string} direction - 'two-sided', 'greater', 'less'
 */
export function twoPropZTest(x1, n1, x2, n2, alpha = 0.05, direction = 'two-sided') {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const diff = p2 - p1;

  // Pooled proportion for H0 standard error
  const pPool = (x1 + x2) / (n1 + n2);
  const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));

  // Unpooled standard error for confidence interval
  const seUnpooled = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);

  const z = sePool > 0 ? diff / sePool : 0;

  let pValue, zCritUpper, zCritLower, reject;

  if (direction === 'two-sided') {
    zCritUpper = normalInv(1 - alpha / 2);
    zCritLower = -zCritUpper;
    pValue = 2 * (1 - normalCdf(Math.abs(z)));
    reject = Math.abs(z) >= zCritUpper;
  } else if (direction === 'greater') {
    zCritUpper = normalInv(1 - alpha);
    zCritLower = -Infinity;
    pValue = 1 - normalCdf(z);
    reject = z >= zCritUpper;
  } else {
    zCritLower = normalInv(alpha);
    zCritUpper = Infinity;
    pValue = normalCdf(z);
    reject = z <= zCritLower;
  }

  const zStar = normalInv(1 - alpha / 2);
  const me = zStar * seUnpooled;
  const ciDiff = [diff - me, diff + me];

  // Margin of error for individual proportions
  const me1 = zStar * Math.sqrt((p1 * (1 - p1)) / n1);
  const me2 = zStar * Math.sqrt((p2 * (1 - p2)) / n2);
  const ci1 = [p1 - me1, p1 + me1];
  const ci2 = [p2 - me2, p2 + me2];

  const relLift = p1 > 0 ? (diff / p1) * 100 : 0;

  return {
    p1, p2, diff, relLift,
    pPool, sePool, seUnpooled,
    z, pValue, zCritLower, zCritUpper,
    ciDiff, ci1, ci2, meDiff: me,
    reject, alpha
  };
}

// ─── Formatting & Sampling Utilities ─────────────────────────────

/**
 * Format p-values in standard scientific convention.
 * @param {number} p
 * @returns {string}
 */
export function fmtPValue(p) {
  if (p === undefined || isNaN(p)) return '—';
  if (p < 0.0001) return '< 0.0001';
  if (p < 0.001) return '< 0.001';
  return p.toFixed(4);
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
 * Default dark Plotly layout matching the site's shadcn zinc color scheme.
 */
export const DARK_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: '#fafafa', family: 'Geist, Inter, sans-serif', size: 12 },
  xaxis: {
    gridcolor: '#27272a',
    zerolinecolor: '#3f3f46',
    linecolor: '#27272a',
    tickfont: { color: '#a1a1aa' },
    titlefont: { color: '#fafafa' },
  },
  yaxis: {
    gridcolor: '#27272a',
    zerolinecolor: '#3f3f46',
    linecolor: '#27272a',
    tickfont: { color: '#a1a1aa' },
    titlefont: { color: '#fafafa' },
  },
  margin: { t: 40, r: 24, b: 45, l: 55 },
  showlegend: true,
  legend: {
    font: { color: '#a1a1aa', size: 11 },
    bgcolor: 'rgba(9, 9, 11, 0.75)',
    bordercolor: '#27272a',
    borderwidth: 1
  },
  bargap: 0.05,
};

// ─── DOM Helpers ─────────────────────────────────────────────────

export function $(id) {
  return document.getElementById(id);
}

export function fmt(value, decimals = 2) {
  if (value === undefined || isNaN(value)) return '—';
  return Number(value).toFixed(decimals);
}

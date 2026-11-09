# ds.sim — Interactive Statistics & Machine Learning Lab

Visual intuition for probability theorems, statistical inference, and machine learning algorithms. High-precision numerical simulations executed directly client-side in your browser.

🌐 **Profile**: [vmljsy.github.io](https://vmljsy.github.io)  
📦 **Repository**: [github.com/vmljsy/ds-playground](https://github.com/vmljsy/ds-playground)

---

## Available Experiments (9 Modules)

### Machine Learning
| Experiment | Status | Key Concepts & Features |
|---|---|---|
| [**Linear Regression & Outliers**](experiments/linear-regression/) | ✅ Live | Closed-form OLS solution ($\beta_1, \beta_0$), dynamic MSE & $R^2$, clean baseline comparison, and real-time interactive outlier dragging demonstrating extreme leverage sensitivity |
| [**K-Means Clustering**](experiments/kmeans-clustering/) | ✅ Live | Lloyd's coordinate-descent algorithm, frame-by-frame Voronoi point assignment, centroid updates, WCSS inertia tracking, trajectory trails, and K-Means++ distance seeding |
| [**KNN Decision Boundaries**](experiments/knn-classification/) | ✅ Live | Non-parametric classification over a $50 \times 50$ contour surface, majority voting, metric selection ($L_1 / L_2$), bias-variance tradeoff (overfitting at $K=1$ vs underfitting at $K \ge 15$), and click-to-add training points |

### Statistical Inference & Testing
| Experiment | Status | Key Concepts & Features |
|---|---|---|
| [**Confidence Intervals**](experiments/confidence-intervals/) | ✅ Live | Frequentist repeated sampling coverage, margin of error ($E \propto 1/\sqrt{n}$), $z$-intervals vs Student's $t$-intervals, and empirical hit/miss rate tracking |
| [**Hypothesis Testing**](experiments/hypothesis-testing/) | ✅ Live | One-sample $z$ and $t$ tests, two-tailed and one-tailed rejection regions, critical values, $p$-value integration, and statistical power / Type I & II error curves |
| [**A/B Testing**](experiments/ab-testing/) | ✅ Live | Two-proportion $z$-tests, Welch's $t$-tests for continuous revenue metrics, difference confidence intervals, and the sequential peeking hazard simulator |

### Probability & Asymptotics
| Experiment | Status | Key Concepts & Features |
|---|---|---|
| [**Central Limit Theorem**](experiments/central-limit-theorem/) | ✅ Live | Convergence of sample means to $N(\mu, \sigma^2/n)$ across exponential, uniform, bimodal, Poisson, beta, and discrete dice distributions |
| [**Law of Large Numbers**](experiments/law-of-large-numbers/) | ✅ Live | Multi-path stochastic convergence of running sample averages $\bar{X}_n \to \mu$ with up to 5,000 trials |
| [**Probability Distributions**](experiments/probability-distributions/) | ✅ Live | Interactive catalog of continuous and discrete models (Normal, Student's $t$, Binomial, Poisson, $\chi^2$, Exponential) with live PDF, PMF, and CDF calculators |

---

## Tech Stack & Architecture

- **Vanilla JavaScript (ES6 Modules)** — Clean, zero-build-step client-side code
- **HTML5 & CSS3** — Minimalist design system inspired by shadcn/ui zinc palette
- **Plotly.js (v2.35.2 via CDN)** — High-performance interactive data visualizations and contours
- **KaTeX (v0.16.11 via CDN)** — Fast client-side mathematical equation rendering
- **Static Deployment** — Fully compatible with Cloudflare Pages, GitHub Pages, or any static host

---

## Project Structure

```
ds-simulations/
├── index.html                                 # Main catalog & live preview sandbox
├── 404.html                                   # Custom 404 page
├── css/
│   └── style.css                              # Design system tokens & layout rules
├── js/
│   └── common.js                              # Shared statistical & math utilities
├── docs/
│   └── data_science_simulation_specs.md       # Interactive simulation specifications
├── experiments/
│   ├── central-limit-theorem/                 # EXP-01: Central Limit Theorem
│   ├── law-of-large-numbers/                  # EXP-02: Law of Large Numbers
│   ├── probability-distributions/             # EXP-03: Probability Distributions
│   ├── confidence-intervals/                  # EXP-04: Confidence Intervals
│   ├── hypothesis-testing/                    # EXP-05: Hypothesis Testing
│   ├── ab-testing/                            # EXP-06: A/B Testing & Inference
│   ├── linear-regression/                     # EXP-07: Linear Regression & OLS
│   ├── kmeans-clustering/                     # EXP-08: K-Means (Lloyd's Algorithm)
│   └── knn-classification/                    # EXP-09: KNN Decision Boundaries
└── README.md
```

---

## Adding a New Experiment

1. **Create the folder**: `experiments/your-experiment-name/`
2. **Add `index.html`**:
   - Link `../../css/style.css`, Plotly.js, and KaTeX
   - Structure layout with `.sim-layout`, `.sim-sidebar` (controls & statistics), and `.sim-main` (visualization)
3. **Add `simulation.js`**:
   - Export a default `init()` function
   - Import utilities (`DARK_LAYOUT`, `$`, `fmt`, etc.) from `../../js/common.js`
4. **Register in `index.html`**:
   - Add a new card in `#experiments-grid`
   - Update the category tab count badges in `.tabs-list`
   - Add footer links

### Basic Simulation Module Template

```javascript
// experiments/your-experiment/simulation.js
import { DARK_LAYOUT, $, fmt, mean, std } from '../../js/common.js';

export default function init() {
  // 1. Initialize state
  // 2. Bind DOM inputs and action buttons
  // 3. Render Plotly traces
  console.log('Simulation initialized');
}
```

---

## Local Development

Serve with any static web server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# Or open index.html directly with a browser
```

---

## Deployment

### Cloudflare Pages / GitHub Pages
1. Push to your Git repository:
   ```bash
   git push origin main
   ```
2. Connect to [Cloudflare Pages](https://pages.cloudflare.com/) or enable GitHub Pages in repo settings:
   - **Build command**: *(leave blank — zero build required)*
   - **Build output directory**: `/` (root)

---

## Author

- **Vimal** — [vmljsy.github.io](https://vmljsy.github.io) &middot; GitHub: [@vmljsy](https://github.com/vmljsy)

## License

[MIT](LICENSE)

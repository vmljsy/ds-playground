# DS Simulations

Interactive data science simulations — learn statistics, probability, and ML concepts by experimenting in your browser.

🌐 **Live site**: Deploy to Cloudflare Pages (or any static host)

## Available Experiments

| Experiment | Status | Description |
|---|---|---|
| [Central Limit Theorem](experiments/central-limit-theorem/) | ✅ Live | See how sample means converge to a normal distribution |
| [Law of Large Numbers](experiments/law-of-large-numbers/) | ✅ Live | Watch sample averages stabilize as trials increase across multiple paths |
| Linear Regression | 🔜 Coming soon | Interactive least squares fitting |

## Tech Stack

- **Pure HTML/CSS/JS** — no build step, no framework
- **Plotly.js** — interactive charts (loaded from CDN)
- **KaTeX** — LaTeX math rendering (loaded from CDN)
- **Cloudflare Pages** — hosting

## Project Structure

```
ds-simulations/
├── index.html                              # Landing page
├── css/
│   └── style.css                           # Shared stylesheet
├── js/
│   └── common.js                           # Shared utilities
├── experiments/
│   └── central-limit-theorem/
│       ├── index.html                      # Experiment page
│       └── simulation.js                   # Simulation logic
└── README.md
```

## Adding a New Experiment

1. **Create a folder**: `experiments/your-experiment-name/`
2. **Copy the template**: Use `experiments/central-limit-theorem/` as a starting point
3. **Create `index.html`**: The experiment page with controls, charts, and explanations
4. **Create `simulation.js`**: The simulation logic as an ES module with a default `init()` export
5. **Add a card**: Add an experiment card to the root `index.html`
6. **Update the count**: Update the experiment count in the section title

### Simulation JS Template

```js
// experiments/your-experiment/simulation.js
import { mean, std, $, fmt, DARK_LAYOUT } from '../../js/common.js';

export default function init() {
  // 1. Set up state
  // 2. Bind event listeners
  // 3. Run initial simulation
  console.log('Your experiment initialized ✅');
}
```

## Local Development

Just serve the files with any static server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .

# Or just open index.html in your browser
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub/GitLab
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Connect your repo
4. Settings:
   - **Build command**: (leave empty — no build needed)
   - **Build output directory**: `/` (or `.`)
5. Deploy! 🚀

No build step, no config files — it just works.

## License

MIT


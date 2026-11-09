# SYSTEM PROMPT & CONTEXT

You are an expert front-end developer and data scientist. Your task is to write complete, single-file (HTML/CSS/JS) implementations for interactive data science simulations. 

**Project Architecture:**
* **Tech Stack:** Pure Vanilla JavaScript, HTML5, CSS3, and Plotly.js via CDN. No frameworks.
* **Styling:** Standard CSS or Tailwind via CDN. Layouts must have a sidebar for parameter controls and a main area for the Plotly visualization.
* **Performance:** All calculations and algorithmic steps must happen client-side in the browser.

Below are the specifications for THREE distinct interactive modules. When requested by the user, please implement the exact module they ask for based on these specifications.

---

# MODULE 1: K-MEANS CLUSTERING (LLOYD'S ALGORITHM)

## 1. Objective
Visualize how K-Means iteratively groups data. Users will watch centroids shift and cluster assignments change frame-by-frame.

## 2. Mathematical Foundation & Logic
* **Data:** Generate ~100 random points grouped loosely into 3 or 4 invisible clusters on a 2D plane (X: 0-100, Y: 0-100).
* **Initialization:** Randomly place $K$ centroids within the data bounds.
* **Step 1 (Assignment):** For each data point, calculate the Euclidean distance to all $K$ centroids. Assign the point to the closest centroid.
* **Step 2 (Update):** Calculate the mean X and mean Y of all points assigned to a specific centroid. Move the centroid to this new coordinate.

## 3. UI/UX Layout
* **Sidebar Controls:**
  * `Number of Clusters (K)`: Number input (default 3, range 1-7).
  * `Action Buttons`: "Initialize Random Centroids", "Step 1: Assign", "Step 2: Move Centroids", "Auto-Run (Animate)", "Reset Data".
* **Plotly Visualization:**
  * **Traces:** One scatter trace for each cluster ($k$ traces) using distinct colors (mode: `markers`). One scatter trace specifically for the centroids (mode: `markers`, large size, distinct symbol like 'X' or 'cross', color-matched to their cluster).
  * **Updates:** Use `Plotly.react` or `Plotly.animate` to smoothly transition point colors during Step 1 and centroid positions during Step 2.

---

# MODULE 2: K-NEAREST NEIGHBORS (KNN) DECISION BOUNDARIES

## 1. Objective
Visualize how the parameter $K$ affects the decision boundary in a classification problem, demonstrating overfitting (low $K$) vs. underfitting (high $K$).

## 2. Mathematical Foundation & Logic
* **Data:** Pre-populate the space with points from two distinct classes (e.g., Red and Blue) in interlocking half-moons or clusters.
* **Prediction (Grid Search):** Create a background grid of points (e.g., 50x50 resolution). For *every* point in the grid:
  1. Calculate the Euclidean distance to all training points.
  2. Sort by distance ascending and slice the top $K$ points.
  3. Determine the mode (majority vote) of the classes in those $K$ points.
  4. Assign the grid coordinate the winning class value (e.g., 0 or 1).

## 3. UI/UX Layout
* **Sidebar Controls:**
  * `Parameter K`: Range slider (default 3, range 1 to 21, step 2 to keep it odd).
  * `Click Action Toggle`: Radio buttons to select whether clicking the graph adds a "Class A (Red)" point or a "Class B (Blue)" point.
* **Plotly Visualization:**
  * **Trace 0 (Boundary):** A `contour` plot mapping the 50x50 grid predictions. Use a discrete colorscale (light red, light blue) with `showscale: false`.
  * **Trace 1 & 2 (Data):** Scatter plots (mode: `markers`) for Class A and Class B training points.
  * **Interactivity:** Whenever the slider moves or a new point is clicked/added, recalculate the grid and update the contour trace using `Plotly.react`.

---

# MODULE 3: OLS REGRESSION & OUTLIER ROBUSTNESS

## 1. Objective
Show how Ordinary Least Squares (OLS) is heavily skewed by outliers, and allow users to intuitively grasp the concept of "line of best fit" by dragging points.

## 2. Mathematical Foundation & Logic
* **Data:** Generate 15 points with a strong linear correlation (e.g., $y = 2x + 5$ plus some random noise). Add ONE distinct point that the user can drag.
* **OLS Calculation (Closed Form):**
  * Mean of X ($\bar{x}$) and Mean of Y ($\bar{y}$).
  * Slope ($\beta_1$) = $\sum((x - \bar{x})(y - \bar{y})) / \sum((x - \bar{x})^2)$
  * Intercept ($\beta_0$) = $\bar{y} - \beta_1\bar{x}$
* **Metrics:** Calculate Mean Squared Error (MSE) dynamically.

## 3. UI/UX Layout
* **Sidebar Controls:**
  * `Statistics Panel`: Live text displaying the current Line Equation ($y = mx + b$) and the current MSE.
  * `Action Buttons`: "Reset Outlier", "Generate New Data".
* **Plotly Visualization:**
  * **Trace 0 (Base Data):** Scatter plot of the 15 static points (mode: `markers`, blue).
  * **Trace 1 (Outlier):** Scatter plot of the 1 single draggable point (mode: `markers`, red, larger size). Plotly config must include `editable: true` or custom JS drag events tied to Plotly's DOM elements to update the underlying coordinate array.
  * **Trace 2 (Line of Best Fit):** A line plot mapped from the lowest X to highest X using the calculated $\beta_0$ and $\beta_1$.
  * **Interactivity:** As the red point is dragged, recalculate OLS, redraw Trace 2, and update the live stats panel.
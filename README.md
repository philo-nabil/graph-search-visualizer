# Graph Search Visualizer

An interactive BFS/DFS graph search step-by-step visualizer built with **React + Vite**, deployable to **GitHub Pages**.

Live demo: <https://philo-nabil.github.io/graph-search-visualizer/>

## Features

- Build any undirected graph by adding/removing edges
- Switch between **Breadth-First Search (BFS)** and **Depth-First Search (DFS)**
- Step through the traversal one node at a time (Prev / Next / Reset)
- SVG graph display with visited nodes highlighted
- Input validation: warns if the graph is empty or the start node is not in the graph

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Open <http://localhost:5173/graph-search-visualizer/> in your browser.

### Build for production

```bash
npm run build
```

The output is written to the `dist/` folder.

### Deploy to GitHub Pages

```bash
npm run deploy
```

This runs `npm run build` first (`predeploy`), then pushes `dist/` to the `gh-pages` branch.

After the first deploy, go to your repository **Settings → Pages** and set:

- **Source**: Deploy from a branch
- **Branch**: `gh-pages` / `(root)`

Save. Your site will be live at:

```
https://<your-github-username>.github.io/graph-search-visualizer/
```

## Project structure

```
graph-search-visualizer/
├── index.html                        # HTML entry point
├── vite.config.js                    # Vite config (base path for GitHub Pages)
├── package.json
├── src/
│   ├── main.jsx                      # React entry point
│   ├── App.jsx                       # Thin wrapper that renders BFSDFSViz
│   ├── graph_search_visualizer.js    # Core visualizer component
│   └── index.css                     # Global styles
└── README.md
```

## License

MIT
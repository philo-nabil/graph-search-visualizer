import { useState, useCallback } from 'react';
import { Play, SkipBack, SkipForward, RotateCcw, Plus, Trash2, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

/** Build an undirected adjacency list from an array of {from, to} edge objects. */
function buildAdj(edges) {
  const adj = {};
  for (const { from, to } of edges) {
    const f = from.trim();
    const t = to.trim();
    if (!f || !t) continue;
    if (!adj[f]) adj[f] = [];
    if (!adj[t]) adj[t] = [];
    if (!adj[f].includes(t)) adj[f].push(t);
    if (!adj[t].includes(f)) adj[t].push(f);
  }
  // Sort neighbors for deterministic traversal order
  for (const key of Object.keys(adj)) {
    adj[key].sort();
  }
  return adj;
}

/** Collect all unique node names from edges. */
function collectNodes(edges) {
  const set = new Set();
  for (const { from, to } of edges) {
    const f = from.trim();
    const t = to.trim();
    if (f) set.add(f);
    if (t) set.add(t);
  }
  return [...set].sort();
}

// ---------------------------------------------------------------------------
// BFS / DFS step generators
// ---------------------------------------------------------------------------

const MAX_STEPS = 500;

/**
 * Generate BFS traversal steps starting from `start`.
 * Each step is { visited: Set, queue: [], current: string, message: string }.
 */
function bfsSteps(adj, start) {
  const steps = [];
  const visited = new Set();
  const queue = [start];
  visited.add(start);

  steps.push({
    current: null,
    visited: new Set(visited),
    queue: [...queue],
    stack: null,
    message: `BFS starting from "${start}". Enqueued: ${start}.`,
  });

  while (queue.length > 0 && steps.length < MAX_STEPS) {
    const node = queue.shift();
    const neighbors = adj[node] || [];
    const newNeighbors = [];

    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
        newNeighbors.push(nb);
      }
    }

    steps.push({
      current: node,
      visited: new Set(visited),
      queue: [...queue],
      stack: null,
      message:
        newNeighbors.length > 0
          ? `Visited "${node}". Enqueued neighbors: ${newNeighbors.join(', ')}.`
          : `Visited "${node}". No new neighbors to enqueue.`,
    });
  }

  if (queue.length === 0) {
    steps.push({
      current: null,
      visited: new Set(visited),
      queue: [],
      stack: null,
      message: `BFS complete. Visited ${visited.size} node(s): ${[...visited].join(', ')}.`,
    });
  }

  return steps;
}

/**
 * Generate DFS traversal steps starting from `start`.
 * Neighbors are pushed in reverse order so the smallest-named neighbor
 * is explored first (consistent with BFS ordering).
 */
function dfsSteps(adj, start) {
  const steps = [];
  const visited = new Set();
  const stack = [start];

  steps.push({
    current: null,
    visited: new Set(visited),
    queue: null,
    stack: [...stack],
    message: `DFS starting from "${start}". Stack: [${start}].`,
  });

  while (stack.length > 0 && steps.length < MAX_STEPS) {
    const node = stack.pop();
    if (visited.has(node)) continue;
    visited.add(node);

    const neighbors = adj[node] || [];
    const newNeighbors = [];
    // Push in reverse so that ascending order is explored first
    for (let i = neighbors.length - 1; i >= 0; i--) {
      if (!visited.has(neighbors[i])) {
        stack.push(neighbors[i]);
        newNeighbors.push(neighbors[i]);
      }
    }

    steps.push({
      current: node,
      visited: new Set(visited),
      queue: null,
      stack: [...stack],
      message:
        newNeighbors.length > 0
          ? `Visited "${node}". Pushed neighbors onto stack: ${newNeighbors.slice().reverse().join(', ')}.`
          : `Visited "${node}". No new neighbors to push.`,
    });
  }

  if (stack.length === 0 || steps.length >= MAX_STEPS) {
    steps.push({
      current: null,
      visited: new Set(visited),
      queue: null,
      stack: [],
      message: `DFS complete. Visited ${visited.size} node(s): ${[...visited].join(', ')}.`,
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Step rebuild
// ---------------------------------------------------------------------------

function rebuildSteps(edges, startNode, algo) {
  const nodes = collectNodes(edges);
  const adj = buildAdj(edges);

  const start = startNode.trim();

  if (nodes.length === 0) {
    return { steps: [], nodes, adj, error: 'Graph is empty. Add at least one edge.' };
  }
  if (!start) {
    return { steps: [], nodes, adj, error: 'Please enter a start node.' };
  }
  if (!adj[start]) {
    return {
      steps: [],
      nodes,
      adj,
      error: `Start node "${start}" is not found in the graph. Check your edges.`,
    };
  }

  const steps = algo === 'BFS' ? bfsSteps(adj, start) : dfsSteps(adj, start);
  return { steps, nodes, adj, error: null };
}

// ---------------------------------------------------------------------------
// Graph SVG renderer
// ---------------------------------------------------------------------------

const NODE_R = 22;
const W = 600;
const H = 300;

function layoutNodes(nodes) {
  const positions = {};
  const n = nodes.length;
  if (n === 0) return positions;

  if (n === 1) {
    positions[nodes[0]] = { x: W / 2, y: H / 2 };
    return positions;
  }

  // Arrange in a circle
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - NODE_R - 10;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[node] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  return positions;
}

function GraphSVG({ nodes, adj, step }) {
  const positions = layoutNodes(nodes);
  const visited = step ? step.visited : new Set();
  const current = step ? step.current : null;

  // Deduplicate edges for undirected display
  const drawnEdges = new Set();
  const edges = [];
  for (const from of nodes) {
    for (const to of (adj[from] || [])) {
      const key = [from, to].sort().join('||');
      if (!drawnEdges.has(key)) {
        drawnEdges.add(key);
        edges.push({ from, to });
      }
    }
  }

  if (nodes.length === 0) {
    return (
      <svg width={W} height={H} style={{ background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#9ca3af" fontSize={14}>
          No graph to display yet
        </text>
      </svg>
    );
  }

  return (
    <svg width={W} height={H} style={{ background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      {/* Edges */}
      {edges.map(({ from, to }) => {
        const p1 = positions[from];
        const p2 = positions[to];
        if (!p1 || !p2) return null;
        const bothVisited = visited.has(from) && visited.has(to);
        return (
          <line
            key={`${from}-${to}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={bothVisited ? '#6366f1' : '#d1d5db'}
            strokeWidth={bothVisited ? 2.5 : 1.5}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions[node];
        if (!pos) return null;
        const isCurrent = node === current;
        const isVisited = visited.has(node);
        let fill = '#ffffff';
        let stroke = '#9ca3af';
        if (isCurrent) {
          fill = '#f59e0b';
          stroke = '#d97706';
        } else if (isVisited) {
          fill = '#6366f1';
          stroke = '#4f46e5';
        }
        return (
          <g key={node}>
            <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={2} />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight="bold"
              fill={isVisited || isCurrent ? '#ffffff' : '#374151'}
            >
              {node}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DEFAULT_EDGES = [
  { from: 'A', to: 'B' },
  { from: 'A', to: 'C' },
  { from: 'B', to: 'D' },
  { from: 'C', to: 'D' },
  { from: 'D', to: 'E' },
];

export default function BFSDFSViz() {
  const [edges, setEdges] = useState(DEFAULT_EDGES);
  const [startNode, setStartNode] = useState('A');
  const [algo, setAlgo] = useState('BFS');

  // Current graph state after applying
  const [graphState, setGraphState] = useState(() => rebuildSteps(DEFAULT_EDGES, 'A', 'BFS'));
  const [idx, setIdx] = useState(0);

  const { steps, nodes, adj, error } = graphState;

  // ---------------------------------------------------------------------------
  // Edge management
  // ---------------------------------------------------------------------------

  const addEdge = () => setEdges((prev) => [...prev, { from: '', to: '' }]);

  const removeEdge = (i) => setEdges((prev) => prev.filter((_, j) => j !== i));

  const updateEdge = (i, field, value) =>
    setEdges((prev) => prev.map((e, j) => (j === i ? { ...e, [field]: value } : e)));

  // ---------------------------------------------------------------------------
  // Apply
  // ---------------------------------------------------------------------------

  const handleApply = useCallback(() => {
    const result = rebuildSteps(edges, startNode, algo);
    setGraphState(result);
    setIdx(0);
  }, [edges, startNode, algo]);

  // ---------------------------------------------------------------------------
  // Step navigation — all clamped to [0, max(steps.length - 1, 0)]
  // ---------------------------------------------------------------------------

  const maxIdx = Math.max(steps.length - 1, 0);

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(maxIdx, i + 1));
  const goReset = () => setIdx(0);

  const step = steps.length > 0 ? steps[idx] : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const queueOrStack =
    step && step.queue !== null
      ? `Queue: [${step.queue.join(', ')}]`
      : step && step.stack !== null
      ? `Stack: [${step.stack.join(', ')}]`
      : '';

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: '#111827' }}>
        Graph Search Visualizer
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        BFS &amp; DFS step-by-step on an <strong>undirected</strong> graph
      </p>

      {/* ---- Algorithm selector ---- */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['BFS', 'DFS'].map((a) => (
          <button
            key={a}
            onClick={() => setAlgo(a)}
            style={{
              padding: '6px 20px',
              borderRadius: 6,
              border: '2px solid',
              borderColor: algo === a ? '#6366f1' : '#d1d5db',
              background: algo === a ? '#6366f1' : '#fff',
              color: algo === a ? '#fff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* ---- Edge inputs ---- */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>
            Undirected Edges
          </span>
          <button
            onClick={addEdge}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              border: '1px solid #6366f1', background: '#ede9fe',
              color: '#4f46e5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Edge
          </button>
        </div>
        {edges.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>No edges. Add edges above.</p>
        )}
        {edges.map((edge, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input
              value={edge.from}
              onChange={(e) => updateEdge(i, 'from', e.target.value)}
              placeholder="FROM"
              style={inputStyle}
            />
            <span style={{ color: '#6b7280', fontWeight: 700 }}>—</span>
            <input
              value={edge.to}
              onChange={(e) => updateEdge(i, 'to', e.target.value)}
              placeholder="TO"
              style={inputStyle}
            />
            <button
              onClick={() => removeEdge(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* ---- Start node + Apply ---- */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={startNode}
          onChange={(e) => setStartNode(e.target.value)}
          placeholder="Start node"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={handleApply}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 6,
            background: '#6366f1', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          <Play size={15} /> Apply
        </button>
      </div>

      {/* ---- Error / warning ---- */}
      {error && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fef3c7', border: '1px solid #fbbf24',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            color: '#92400e', fontSize: 14,
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ---- Graph display ---- */}
      {!error && <GraphSVG nodes={nodes} adj={adj} step={step} />}

      {/* ---- Step info ---- */}
      {!error && (
        <div
          style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '12px 16px', marginTop: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>
              {/* Bug fix: show Step 0 / 0 when steps is empty */}
              Step {steps.length === 0 ? 0 : idx + 1} / {steps.length}
            </span>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{queueOrStack}</span>
          </div>
          <p style={{ fontSize: 13, color: '#374151', minHeight: 20 }}>
            {step ? step.message : 'Press Apply to run the algorithm.'}
          </p>
          {step && step.visited.size > 0 && (
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Visited: {[...step.visited].join(' → ')}
            </p>
          )}
        </div>
      )}

      {/* ---- Navigation controls ---- */}
      {!error && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <NavButton onClick={goReset} disabled={idx === 0} title="Reset">
            <RotateCcw size={16} />
          </NavButton>
          <NavButton onClick={goPrev} disabled={idx === 0} title="Previous step">
            <SkipBack size={16} />
          </NavButton>
          <NavButton onClick={goNext} disabled={steps.length === 0 || idx >= maxIdx} title="Next step">
            <SkipForward size={16} />
          </NavButton>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const inputStyle = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 13,
  outline: 'none',
  width: 80,
};

function NavButton({ onClick, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 8,
        border: '1px solid #d1d5db',
        background: disabled ? '#f3f4f6' : '#fff',
        color: disabled ? '#9ca3af' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

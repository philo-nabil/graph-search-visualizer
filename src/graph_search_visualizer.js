import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Plus, Trash2, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SVG_W = 680;
const SVG_H = 340;
const NODE_R = 22;
const PLAY_INTERVAL_MS = 900;

// ---------------------------------------------------------------------------
// Pseudocode definitions
// ---------------------------------------------------------------------------

const BFS_CODE = [
  'BFS(G, start):',
  '  enqueue start; mark start visited',
  '  while queue not empty:',
  '    node ← dequeue()',
  '    for each neighbor of node:',
  '      if neighbor not visited:',
  '        mark neighbor visited',
  '        enqueue neighbor',
  '  ── done ──',
];

const DFS_CODE = [
  'DFS(G, start):',
  '  push start onto stack',
  '  while stack not empty:',
  '    node ← pop()',
  '    if node not visited:',
  '      mark node visited',
  '      for each neighbor of node:',
  '        if neighbor not visited:',
  '          push neighbor onto stack',
  '  ── done ──',
];

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

/**
 * Build an undirected adjacency list from fromArr/toArr arrays.
 * `nodes` is the authoritative node list — only edges whose both endpoints
 * appear in `nodes` are added.
 */
function buildAdj(fromArr, toArr, nodes) {
  const nodeSet = new Set(nodes);
  const adj = {};
  for (const n of nodes) adj[n] = [];

  for (let i = 0; i < fromArr.length; i++) {
    const f = (fromArr[i] || '').trim();
    const t = (toArr[i] || '').trim();
    if (!f || !t) continue;
    if (!nodeSet.has(f) || !nodeSet.has(t)) continue;
    if (!adj[f].includes(t)) adj[f].push(t);
    if (!adj[t].includes(f)) adj[t].push(f);
  }
  for (const n of nodes) adj[n].sort();
  return adj;
}

/**
 * Derive the node list and adjacency map from editor arrays.
 * Returns { nodes, adj }.
 */
function compileGraph(fromArr, toArr) {
  const nodeSet = new Set();
  for (let i = 0; i < fromArr.length; i++) {
    const f = (fromArr[i] || '').trim();
    const t = (toArr[i] || '').trim();
    if (f) nodeSet.add(f);
    if (t) nodeSet.add(t);
  }
  const nodes = [...nodeSet].sort();
  const adj = buildAdj(fromArr, toArr, nodes);
  return { nodes, adj };
}

/**
 * BFS-layered auto-layout.
 * Starts from `startNode`, assigns each discovered node to a horizontal layer.
 * Disconnected nodes are appended as the last layer.
 */
function autoLayout(nodes, adjMap, startNode, W, H) {
  if (nodes.length === 0) return {};

  const layers = [];
  const placed = new Set();

  const bfsStart = nodes.includes(startNode) ? startNode : nodes[0];
  let frontier = [bfsStart];
  placed.add(bfsStart);

  while (frontier.length > 0) {
    layers.push(frontier);
    const next = [];
    for (const n of frontier) {
      for (const nb of (adjMap[n] || [])) {
        if (!placed.has(nb)) {
          placed.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }

  const disconnected = nodes.filter((n) => !placed.has(n));
  if (disconnected.length > 0) layers.push(disconnected);

  const positions = {};
  const layerCount = layers.length;
  layers.forEach((layer, li) => {
    const y = (H / (layerCount + 1)) * (li + 1);
    layer.forEach((n, ni) => {
      const x = (W / (layer.length + 1)) * (ni + 1);
      positions[n] = { x, y };
    });
  });
  return positions;
}

// ---------------------------------------------------------------------------
// Node state helpers
// ---------------------------------------------------------------------------

/**
 * Compute a color-state string for each node in the current step snapshot.
 * States: 'unvisited' | 'current' | 'visited' | 'queued' | 'instack'
 */
function buildNodeStates(nodes, visited, current, queue, stack) {
  const states = {};
  for (const n of nodes) {
    if (n === current) {
      states[n] = 'current';
    } else if (visited.has(n)) {
      states[n] = 'visited';
    } else if (queue && queue.includes(n)) {
      states[n] = 'queued';
    } else if (stack && stack.includes(n)) {
      states[n] = 'instack';
    } else {
      states[n] = 'unvisited';
    }
  }
  return states;
}

// ---------------------------------------------------------------------------
// BFS step builder
// ---------------------------------------------------------------------------

function buildBFS(startNode, adj, nodes) {
  const steps = [];
  const visited = new Set();
  const queue = [startNode];
  visited.add(startNode);

  const snap = (override) => ({
    visited: new Set(visited),
    current: null,
    queue: [...queue],
    nodeStates: buildNodeStates(nodes, visited, null, queue, null),
    checks: [],
    ...override,
  });

  steps.push(
    snap({
      title: 'Initialize BFS',
      description: `Enqueue "${startNode}" and mark it visited.`,
      lines: [0, 1],
    })
  );

  while (queue.length > 0) {
    steps.push(
      snap({
        title: 'Check Queue',
        description: `Queue [${queue.join(', ')}] is not empty — continue.`,
        lines: [2],
        checks: [{ label: 'queue not empty?', result: true }],
      })
    );

    const node = queue.shift();
    steps.push(
      snap({
        title: 'Dequeue',
        description: `Dequeue "${node}" from front of queue.`,
        lines: [3],
        current: node,
        nodeStates: buildNodeStates(nodes, visited, node, queue, null),
      })
    );

    const neighbors = adj[node] || [];
    for (const nb of neighbors) {
      const alreadyVisited = visited.has(nb);
      steps.push(
        snap({
          title: 'Check Neighbor',
          description: `Neighbor "${nb}" of "${node}" — ${alreadyVisited ? 'already visited, skip.' : 'not yet visited.'}`,
          lines: [4, 5],
          current: node,
          checks: [{ label: `"${nb}" not visited?`, result: !alreadyVisited }],
          nodeStates: buildNodeStates(nodes, visited, node, queue, null),
        })
      );

      if (!alreadyVisited) {
        visited.add(nb);
        queue.push(nb);
        steps.push(
          snap({
            title: 'Enqueue Neighbor',
            description: `Mark "${nb}" visited and enqueue it.`,
            lines: [6, 7],
            current: node,
            nodeStates: buildNodeStates(nodes, visited, node, queue, null),
          })
        );
      }
    }
  }

  steps.push(
    snap({
      title: 'Queue Empty',
      description: 'Queue is empty — exit loop.',
      lines: [2],
      checks: [{ label: 'queue not empty?', result: false }],
    })
  );

  steps.push(
    snap({
      title: 'BFS Complete ✓',
      description: `Traversal done. Visited: ${[...visited].join(' → ')}.`,
      lines: [8],
      done: true,
    })
  );

  return steps;
}

// ---------------------------------------------------------------------------
// DFS step builder
// ---------------------------------------------------------------------------

function buildDFS(startNode, adj, nodes) {
  const steps = [];
  const visited = new Set();
  const stack = [startNode];

  const snap = (override) => ({
    visited: new Set(visited),
    current: null,
    stack: [...stack],
    nodeStates: buildNodeStates(nodes, visited, null, null, stack),
    checks: [],
    ...override,
  });

  steps.push(
    snap({
      title: 'Initialize DFS',
      description: `Push "${startNode}" onto stack.`,
      lines: [0, 1],
    })
  );

  while (stack.length > 0) {
    steps.push(
      snap({
        title: 'Check Stack',
        description: `Stack [${stack.join(', ')}] is not empty — continue.`,
        lines: [2],
        checks: [{ label: 'stack not empty?', result: true }],
      })
    );

    const node = stack.pop();
    steps.push(
      snap({
        title: 'Pop',
        description: `Pop "${node}" from top of stack.`,
        lines: [3],
        current: node,
        nodeStates: buildNodeStates(nodes, visited, node, null, stack),
      })
    );

    const alreadyVisited = visited.has(node);
    steps.push(
      snap({
        title: 'Check Visited',
        description: `Is "${node}" already visited? ${alreadyVisited ? 'Yes — skip.' : 'No — process.'}`,
        lines: [4],
        current: node,
        checks: [{ label: `"${node}" not visited?`, result: !alreadyVisited }],
        nodeStates: buildNodeStates(nodes, visited, node, null, stack),
      })
    );

    if (alreadyVisited) continue;

    visited.add(node);
    steps.push(
      snap({
        title: 'Visit Node',
        description: `Mark "${node}" as visited.`,
        lines: [5],
        current: node,
        nodeStates: buildNodeStates(nodes, visited, node, null, stack),
      })
    );

    const neighbors = adj[node] || [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const nb = neighbors[i];
      const nbVisited = visited.has(nb);
      steps.push(
        snap({
          title: 'Check Neighbor',
          description: `Neighbor "${nb}" of "${node}" — ${nbVisited ? 'already visited, skip.' : 'not yet visited.'}`,
          lines: [6, 7],
          current: node,
          checks: [{ label: `"${nb}" not visited?`, result: !nbVisited }],
          nodeStates: buildNodeStates(nodes, visited, node, null, stack),
        })
      );

      if (!nbVisited) {
        stack.push(nb);
        steps.push(
          snap({
            title: 'Push Neighbor',
            description: `Push "${nb}" onto stack.`,
            lines: [8],
            current: node,
            nodeStates: buildNodeStates(nodes, visited, node, null, stack),
          })
        );
      }
    }
  }

  steps.push(
    snap({
      title: 'Stack Empty',
      description: 'Stack is empty — exit loop.',
      lines: [2],
      checks: [{ label: 'stack not empty?', result: false }],
    })
  );

  steps.push(
    snap({
      title: 'DFS Complete ✓',
      description: `Traversal done. Visited: ${[...visited].join(' → ')}.`,
      lines: [9],
      done: true,
    })
  );

  return steps;
}

// ---------------------------------------------------------------------------
// Traversal dispatcher
// ---------------------------------------------------------------------------

function buildTraversal(compiled, startNode, algo) {
  const start = (startNode || '').trim();
  if (!compiled || compiled.nodes.length === 0) {
    return { steps: [], warning: 'Graph is empty. Add edges and click Apply.' };
  }
  if (!start) {
    return { steps: [], warning: 'Please enter a start node.' };
  }
  if (!compiled.nodes.includes(start)) {
    return {
      steps: [],
      warning: `Start node "${start}" not found in graph. Check your edges or start node.`,
    };
  }
  const steps =
    algo === 'BFS'
      ? buildBFS(start, compiled.adj, compiled.nodes)
      : buildDFS(start, compiled.adj, compiled.nodes);
  return { steps, warning: null };
}

// ---------------------------------------------------------------------------
// Graph SVG renderer
// ---------------------------------------------------------------------------

const NODE_COLOR = {
  current:   { fill: '#f59e0b', stroke: '#d97706', text: '#fff'    },
  visited:   { fill: '#6366f1', stroke: '#4f46e5', text: '#fff'    },
  queued:    { fill: '#bbf7d0', stroke: '#4ade80', text: '#065f46' },
  instack:   { fill: '#e9d5ff', stroke: '#a855f7', text: '#4c1d95' },
  unvisited: { fill: '#ffffff', stroke: '#9ca3af', text: '#374151' },
};

function GraphSVG({ nodes, adj, positions, step }) {
  const visited   = step ? step.visited    : new Set();
  const nodeStates = step ? step.nodeStates : {};

  // Deduplicate edges for undirected display
  const drawnEdges = new Set();
  const edgeList = [];
  for (const from of nodes) {
    for (const to of (adj[from] || [])) {
      const key = [from, to].sort().join('||');
      if (!drawnEdges.has(key)) {
        drawnEdges.add(key);
        edgeList.push({ from, to });
      }
    }
  }

  if (nodes.length === 0) {
    return (
      <svg
        width="100%"
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}
      >
        <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fill="#9ca3af" fontSize={14}>
          No graph — add edges above and click Apply
        </text>
      </svg>
    );
  }

  return (
    <svg
      width="100%"
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}
    >
      {edgeList.map(({ from, to }) => {
        const p1 = positions[from];
        const p2 = positions[to];
        if (!p1 || !p2) return null;
        const bothVisited = visited.has(from) && visited.has(to);
        return (
          <line
            key={`${from}-${to}`}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke={bothVisited ? '#6366f1' : '#d1d5db'}
            strokeWidth={bothVisited ? 2.5 : 1.5}
          />
        );
      })}

      {nodes.map((node) => {
        const pos = positions[node];
        if (!pos) return null;
        const state = nodeStates[node] || 'unvisited';
        const c = NODE_COLOR[state] || NODE_COLOR.unvisited;
        return (
          <g key={node}>
            <circle
              cx={pos.x} cy={pos.y} r={NODE_R}
              fill={c.fill} stroke={c.stroke} strokeWidth={2}
            />
            <text
              x={pos.x} y={pos.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight="bold" fill={c.text}
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
// Default graph data
// ---------------------------------------------------------------------------

const DEFAULT_FROM  = ['A', 'A', 'B', 'C', 'D'];
const DEFAULT_TO    = ['B', 'C', 'D', 'D', 'E'];
const DEFAULT_START = 'A';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BFSDFSViz() {
  const [fromArr, setFromArr]     = useState(DEFAULT_FROM);
  const [toArr, setToArr]         = useState(DEFAULT_TO);
  const [startNode, setStartNode] = useState(DEFAULT_START);
  const [algo, setAlgo]           = useState('BFS');

  const [compiled, setCompiled]     = useState(null);
  const [positions, setPositions]   = useState({});
  const [steps, setSteps]           = useState([]);
  const [idx, setIdx]               = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [warning, setWarning]       = useState(null);

  // Ref holds the latest compiled graph so algo-toggle callbacks never close
  // over a stale value.
  const compiledRef = useRef(null);

  // Compute positions whenever compiled graph or startNode changes
  const rebuildPositions = (cg, start) => {
    if (!cg) return {};
    return autoLayout(cg.nodes, cg.adj, start.trim(), SVG_W, SVG_H);
  };

  // On mount: run default graph
  useEffect(() => {
    const cg  = compileGraph(DEFAULT_FROM, DEFAULT_TO);
    const pos = autoLayout(cg.nodes, cg.adj, DEFAULT_START, SVG_W, SVG_H);
    compiledRef.current = cg;
    setCompiled(cg);
    setPositions(pos);
    const { steps: s, warning: w } = buildTraversal(cg, DEFAULT_START, 'BFS');
    setSteps(s);
    setWarning(w);
  }, []);

  // ---------------------------------------------------------------------------
  // Apply button
  // ---------------------------------------------------------------------------

  const handleApply = () => {
    const cg  = compileGraph(fromArr, toArr);
    const pos = rebuildPositions(cg, startNode);
    compiledRef.current = cg;
    setCompiled(cg);
    setPositions(pos);
    const { steps: s, warning: w } = buildTraversal(cg, startNode, algo);
    setSteps(s);
    setIdx(0);
    setIsPlaying(false);
    setWarning(w);
  };

  // ---------------------------------------------------------------------------
  // Algorithm toggle — rebuilds from the stored ref to avoid stale closure
  // ---------------------------------------------------------------------------

  const handleAlgoChange = (newAlgo) => {
    setAlgo(newAlgo);
    const cg = compiledRef.current;
    const { steps: s, warning: w } = buildTraversal(cg, startNode, newAlgo);
    setSteps(s);
    setIdx(0);
    setIsPlaying(false);
    setWarning(w);
  };

  // ---------------------------------------------------------------------------
  // Auto-play
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isPlaying) return;
    if (steps.length === 0) {
      setIsPlaying(false);
      return;
    }
    const maxI = steps.length - 1;
    const timer = setInterval(() => {
      setIdx((prev) => {
        if (prev >= maxI) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPlaying, steps]);

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const maxIdx = Math.max(steps.length - 1, 0);
  const safeIdx = Math.min(idx, maxIdx);
  const step    = steps.length > 0 ? steps[safeIdx] : null;

  const goPrev  = () => setIdx((i) => Math.max(0, i - 1));
  const goNext  = () => setIdx((i) => Math.min(maxIdx, i + 1));
  const goReset = () => { setIdx(0); setIsPlaying(false); };

  // ---------------------------------------------------------------------------
  // Edge list management
  // ---------------------------------------------------------------------------

  const addEdge = () => {
    setFromArr((a) => [...a, '']);
    setToArr((a) => [...a, '']);
  };

  const removeEdge = (i) => {
    setFromArr((a) => a.filter((_, j) => j !== i));
    setToArr((a)   => a.filter((_, j) => j !== i));
  };

  const updateFrom = (i, val) =>
    setFromArr((a) => a.map((x, j) => (j === i ? val : x)));

  const updateTo = (i, val) =>
    setToArr((a) => a.map((x, j) => (j === i ? val : x)));

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const nodes        = compiled ? compiled.nodes : [];
  const adj          = compiled ? compiled.adj   : {};
  const pseudoLines  = algo === 'BFS' ? BFS_CODE : DFS_CODE;
  const activeLines  = step ? step.lines : [];
  const isDone       = Boolean(step && step.done);

  const queueOrStack = step
    ? (algo === 'BFS' ? step.queue || [] : step.stack || [])
    : [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        Graph Search Visualizer
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Customize the undirected graph, pick a start node, then step through BFS or DFS.
      </p>

      {/* ── Algorithm toggle ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'BFS', label: 'Breadth-First Search' },
          { id: 'DFS', label: 'Depth-First Search'   },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleAlgoChange(id)}
            style={{
              padding: '6px 20px', borderRadius: 6, border: '2px solid',
              borderColor: algo === id ? '#6366f1' : '#d1d5db',
              background:  algo === id ? '#6366f1' : '#fff',
              color:       algo === id ? '#fff'    : '#374151',
              fontWeight: 600, cursor: 'pointer', fontSize: 14,
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Graph Editor ── */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>Graph Editor</span>
          <button
            onClick={addEdge}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 6,
              border: '1px solid #6366f1', background: '#ede9fe',
              color: '#4f46e5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Edge
          </button>
        </div>

        {fromArr.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4 }}>
            <span style={{ width: 80, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>FROM</span>
            <span style={{ width: 24 }} />
            <span style={{ width: 80, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>TO</span>
          </div>
        )}

        {fromArr.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>No edges yet. Click "Add Edge" to begin.</p>
        )}

        {fromArr.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input
              value={f}
              onChange={(e) => updateFrom(i, e.target.value)}
              placeholder="FROM"
              style={inputStyle}
            />
            <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: 16, userSelect: 'none' }}>—</span>
            <input
              value={toArr[i] || ''}
              onChange={(e) => updateTo(i, e.target.value)}
              placeholder="TO"
              style={inputStyle}
            />
            <button
              onClick={() => removeEdge(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 4 }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Start node + Apply ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={startNode}
          onChange={(e) => setStartNode(e.target.value)}
          placeholder="Start node (e.g. A)"
          style={{ ...inputStyle, flex: 1, width: 'auto' }}
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
          Apply Graph
        </button>
      </div>

      {/* ── Warning ── */}
      {warning && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fef3c7', border: '1px solid #fbbf24',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            color: '#92400e', fontSize: 13,
          }}
        >
          <AlertTriangle size={16} />
          {warning}
        </div>
      )}

      {/* ── Step banner ── */}
      {step ? (
        <div
          style={{
            background: isDone ? '#d1fae5' : '#eff6ff',
            border: `1px solid ${isDone ? '#6ee7b7' : '#bfdbfe'}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: isDone ? '#065f46' : '#1e40af', marginBottom: 4 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 13, color: isDone ? '#047857' : '#1d4ed8' }}>
                {step.description}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', marginLeft: 16, paddingTop: 2 }}>
              Step {safeIdx + 1}&nbsp;/&nbsp;{steps.length}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 10, padding: '14px 16px', marginBottom: 14,
            color: '#9ca3af', fontSize: 13,
          }}
        >
          Step 0&nbsp;/&nbsp;0 — click &ldquo;Apply Graph&rdquo; to build the traversal.
        </div>
      )}

      {/* ── Condition check cards ── */}
      {step && step.checks && step.checks.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {step.checks.map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 8,
                background: c.result ? '#d1fae5' : '#fee2e2',
                border: `1px solid ${c.result ? '#6ee7b7' : '#fca5a5'}`,
                fontSize: 12, fontWeight: 600,
                color: c.result ? '#065f46' : '#991b1b',
              }}
            >
              <span>{c.result ? '✓' : '✗'}</span>
              {c.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Graph + Pseudocode ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>

        {/* Graph SVG */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <GraphSVG nodes={nodes} adj={adj} positions={positions} step={step} />

          {/* Legend */}
          {nodes.length > 0 && (
            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { color: '#fff',    stroke: '#9ca3af', label: 'Unvisited'  },
                { color: '#f59e0b', stroke: '#d97706', label: 'Current'    },
                { color: '#6366f1', stroke: '#4f46e5', label: 'Visited'    },
                algo === 'BFS'
                  ? { color: '#bbf7d0', stroke: '#4ade80', label: 'In Queue' }
                  : { color: '#e9d5ff', stroke: '#a855f7', label: 'In Stack' },
              ].map(({ color, stroke, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <svg width={14} height={14}>
                    <circle cx={7} cy={7} r={6} fill={color} stroke={stroke} strokeWidth={1.5} />
                  </svg>
                  <span style={{ color: '#6b7280' }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pseudocode panel */}
        <div
          style={{
            width: 248, flexShrink: 0,
            background: '#1e1e2e', borderRadius: 10,
            padding: '12px 0', fontSize: 12,
            fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0 12px 8px',
              fontSize: 11, fontWeight: 600,
              color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1,
            }}
          >
            Pseudocode
          </div>
          {pseudoLines.map((line, i) => {
            const active = activeLines.includes(i);
            return (
              <div
                key={i}
                style={{
                  padding: '3px 12px',
                  background: active ? 'rgba(99,102,241,0.30)' : 'transparent',
                  color:      active ? '#c7d2fe' : '#64748b',
                  borderLeft: `3px solid ${active ? '#6366f1' : 'transparent'}`,
                  transition: 'background 0.2s',
                  whiteSpace: 'pre',
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Queue / Stack bar ── */}
      {step && (
        <div
          style={{
            background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', minWidth: 46, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {algo === 'BFS' ? 'Queue' : 'Stack'}
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {queueOrStack.length === 0 ? (
              <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>empty</span>
            ) : (
              queueOrStack.map((n, i) => (
                <span
                  key={i}
                  style={{
                    padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: algo === 'BFS' ? '#d1fae5' : '#ede9fe',
                    color:      algo === 'BFS' ? '#065f46' : '#4c1d95',
                    border: `1px solid ${algo === 'BFS' ? '#6ee7b7' : '#c4b5fd'}`,
                  }}
                >
                  {n}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <CtrlBtn onClick={goReset} disabled={idx === 0 && !isPlaying} title="Reset to start">
          <RotateCcw size={16} />
        </CtrlBtn>
        <CtrlBtn onClick={goPrev} disabled={idx === 0} title="Previous step">
          <SkipBack size={16} />
        </CtrlBtn>
        <CtrlBtn
          onClick={() => setIsPlaying((p) => !p)}
          disabled={steps.length === 0}
          title={isPlaying ? 'Pause' : 'Play'}
          primary
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </CtrlBtn>
        <CtrlBtn onClick={goNext} disabled={steps.length === 0 || safeIdx >= maxIdx} title="Next step">
          <SkipForward size={16} />
        </CtrlBtn>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------

const inputStyle = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid #d1d5db', fontSize: 13,
  outline: 'none', width: 80,
};

function CtrlBtn({ onClick, disabled, title, children, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: primary ? 48 : 40, height: primary ? 48 : 40,
        borderRadius: primary ? 10 : 8,
        border: primary ? 'none' : '1px solid #d1d5db',
        background: disabled ? '#f3f4f6' : primary ? '#6366f1' : '#fff',
        color:      disabled ? '#9ca3af' : primary ? '#fff'    : '#374151',
        cursor:     disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

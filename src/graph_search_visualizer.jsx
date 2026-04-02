import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';

// ── Default graph ─────────────────────────────────────────────────────────────
const DEFAULT_FROM = ['A','A','B','B','C','C','D','E'];
const DEFAULT_TO   = ['B','C','D','E','F','G','H','H'];

// ── Pseudocode ────────────────────────────────────────────────────────────────
const BFS_CODE = [
  { n:  1, text: 'procedure BFS(Graph G, Source s):',   indent: 0 },
  { n:  2, text: 'let Q be a queue',                     indent: 1, comment: '// FIFO data structure' },
  { n:  3, text: 'let visited be a set',                 indent: 1, comment: '// tracks explored nodes' },
  { n:  4, text: 'Q.enqueue(s)',                         indent: 1, comment: '// add source to queue' },
  { n:  5, text: 'mark s as visited',                    indent: 1, comment: '// label source so it is not revisited' },
  { n:  6, text: 'while Q is not empty:',                indent: 1 },
  { n:  7, text: 'v = Q.dequeue()',                      indent: 2, comment: '// remove the front node' },
  { n:  8, text: 'process(v)',                           indent: 2, comment: '// e.g. print the node value' },
  { n:  9, text: 'for each neighbor w of v in G:',       indent: 2 },
  { n: 10, text: 'if w is not visited:',                 indent: 3 },
  { n: 11, text: 'Q.enqueue(w)',                         indent: 4, comment: '// add unvisited neighbor to queue' },
  { n: 12, text: 'mark w as visited',                    indent: 4, comment: '// label so not revisited' },
];

const DFS_CODE = [
  { n:  1, text: 'procedure DFS(Graph G, Source s):',   indent: 0 },
  { n:  2, text: 'let S be a stack',                     indent: 1, comment: '// LIFO data structure' },
  { n:  3, text: 'let visited be a set',                 indent: 1, comment: '// tracks explored nodes' },
  { n:  4, text: 'S.push(s)',                            indent: 1, comment: '// push source onto stack' },
  { n:  5, text: 'while S is not empty:',                indent: 1 },
  { n:  6, text: 'v = S.pop()',                          indent: 2, comment: '// take top of stack' },
  { n:  7, text: 'if v is not visited:',                 indent: 2 },
  { n:  8, text: 'mark v as visited',                    indent: 3, comment: '// label node v' },
  { n:  9, text: 'process(v)',                           indent: 3, comment: '// e.g. print the node value' },
  { n: 10, text: 'for each neighbor w of v in G:',       indent: 3 },
  { n: 11, text: 'S.push(w)',                            indent: 4, comment: '// explore deeper' },
];

// ── BFS step builder ──────────────────────────────────────────────────────────
// Line mapping:
//   1-3 = init declarations
//   4   = Q.enqueue(s)
//   5   = mark s visited
//   6   = while Q not empty  (also: while false → done)
//   7   = v = Q.dequeue()
//   8   = process(v)
//   9   = for each neighbor
//  10   = if w not visited
//  11   = Q.enqueue(w)
//  12   = mark w visited
function buildBFS(startNode, adj, nodes) {
  const steps = [];
  if (!nodes.includes(startNode)) return steps;
  const visited = new Set();
  const queue   = [];

  const snap = () => ({ queue: [...queue], visited: new Set(visited) });

  steps.push({ lines: [1,2,3], title: 'Declare procedure', desc: `Initialize BFS. Declare queue Q and visited set.`, current: null, exploring: null, checks: null, ...snap() });

  queue.push(startNode);
  steps.push({ lines: [4], title: `Q.enqueue(${startNode})`, desc: `Add source node "${startNode}" to the back of queue Q.`, current: null, exploring: startNode, checks: null, ...snap() });

  visited.add(startNode);
  steps.push({ lines: [5], title: `Mark "${startNode}" as visited`, desc: `Label "${startNode}" visited so it is not enqueued again.`, current: null, exploring: startNode, checks: null, ...snap() });

  for (let guard = 0; queue.length > 0 && guard < 500; guard++) {

    steps.push({ lines: [6], title: 'while Q is not empty → true', desc: `Queue: [${queue.join(', ')}]  (${queue.length} node${queue.length !== 1 ? 's' : ''}). Enter loop body.`, current: null, exploring: null, checks: null, ...snap() });

    const v = queue[0];
    queue.shift();
    steps.push({ lines: [7], title: `v = Q.dequeue() → "${v}"`, desc: `Remove front node "${v}" from queue.`, current: v, exploring: null, checks: null, ...snap() });

    steps.push({ lines: [8], title: `process("${v}")`, desc: `Visit node "${v}" — record, print, or act on it.`, current: v, exploring: null, checks: null, ...snap() });

    const neighbors = (adj[v] || []).slice().sort();
    steps.push({ lines: [9], title: `for each neighbor of "${v}": [${neighbors.join(', ') || 'none'}]`, desc: `Iterate over neighbors of "${v}" in the graph.`, current: v, exploring: null, checks: null, ...snap() });

    for (const w of neighbors) {
      const already = visited.has(w);
      steps.push({
        lines: [10],
        title: `if "${w}" not visited? → ${already ? 'false — skip' : 'true — enqueue'}`,
        desc: already ? `"${w}" is already in visited set. Skip.` : `"${w}" has not been visited yet. Will enqueue.`,
        current: v, exploring: w,
        checks: [{ to: w, chosen: !already, reason: already ? 'Already visited — skip' : 'Not visited — enqueue' }],
        ...snap(),
      });

      if (!already) {
        queue.push(w);
        steps.push({ lines: [11], title: `Q.enqueue("${w}")`, desc: `Add "${w}" to back of queue. Queue: [${queue.join(', ')}]`, current: v, exploring: w, checks: null, ...snap() });

        visited.add(w);
        steps.push({ lines: [12], title: `Mark "${w}" as visited`, desc: `Label "${w}" visited so it is not enqueued again.`, current: v, exploring: w, checks: null, ...snap() });
      }
    }
  }

  steps.push({ lines: [6], title: 'while Q is not empty → false', desc: 'Queue is empty. Exit loop. BFS complete — all reachable nodes visited.', current: null, exploring: null, checks: null, done: true, ...snap() });
  return steps;
}

// ── DFS step builder ──────────────────────────────────────────────────────────
// Line mapping:
//   1-3 = init declarations
//   4   = S.push(s)
//   5   = while S not empty  (also: false → done)
//   6   = v = S.pop()
//   7   = if v not visited
//   8   = mark v visited
//   9   = process(v)
//  10   = for each neighbor
//  11   = S.push(w)
function buildDFS(startNode, adj, nodes) {
  const steps = [];
  if (!nodes.includes(startNode)) return steps;
  const visited = new Set();
  const stack   = [];

  const snap = () => ({ stack: [...stack], visited: new Set(visited) });

  steps.push({ lines: [1,2,3], title: 'Declare procedure', desc: `Initialize DFS. Declare stack S and visited set.`, current: null, exploring: null, checks: null, ...snap() });

  stack.push(startNode);
  steps.push({ lines: [4], title: `S.push(${startNode})`, desc: `Push source node "${startNode}" onto stack S.`, current: null, exploring: startNode, checks: null, ...snap() });

  for (let guard = 0; stack.length > 0 && guard < 500; guard++) {

    steps.push({ lines: [5], title: 'while S is not empty → true', desc: `Stack: [${stack.join(', ')}]  (top = "${stack[stack.length-1]}"). Enter loop body.`, current: null, exploring: null, checks: null, ...snap() });

    const v = stack[stack.length - 1];
    stack.pop();
    steps.push({ lines: [6], title: `v = S.pop() → "${v}"`, desc: `Pop top node "${v}" from stack.`, current: v, exploring: null, checks: null, ...snap() });

    const already = visited.has(v);
    steps.push({
      lines: [7],
      title: `if "${v}" not visited? → ${already ? 'false — skip' : 'true — visit'}`,
      desc: already ? `"${v}" was already visited. Skip this iteration.` : `"${v}" has not been visited. Proceed.`,
      current: v, exploring: null,
      checks: [{ to: v, chosen: !already, reason: already ? 'Already visited — skip' : 'Not visited — continue' }],
      ...snap(),
    });

    if (already) continue;

    visited.add(v);
    steps.push({ lines: [8], title: `Mark "${v}" as visited`, desc: `Add "${v}" to visited set.`, current: v, exploring: null, checks: null, ...snap() });

    steps.push({ lines: [9], title: `process("${v}")`, desc: `Visit node "${v}" — record, print, or act on it.`, current: v, exploring: null, checks: null, ...snap() });

    // Only push unvisited neighbors — avoids redundant stack entries and wasted steps
    const neighbors = (adj[v] || []).slice().sort().reverse().filter(w => !visited.has(w));
    const display   = [...neighbors].reverse();
    steps.push({ lines: [10], title: `for each unvisited neighbor of "${v}": [${display.join(', ') || 'none'}]`, desc: `Push unvisited neighbors in reverse order so they are explored in sorted order.`, current: v, exploring: null, checks: null, ...snap() });

    for (const w of neighbors) {
      stack.push(w);
      steps.push({
        lines: [11],
        title: `S.push("${w}")`,
        desc: `Push "${w}" onto stack. Stack top = "${w}".`,
        current: v, exploring: w, checks: null,
        ...snap(),
      });
    }
  }

  steps.push({ lines: [5], title: 'while S is not empty → false', desc: 'Stack is empty. Exit loop. DFS complete — all reachable nodes visited.', current: null, exploring: null, checks: null, done: true, ...snap() });
  return steps;
}

// ── Graph layout helpers ──────────────────────────────────────────────────────
function autoLayout(nodes, adjMap, startNode, W = 560, H = 360) {
  if (!nodes.length) return {};
  const layers = {}, seen = new Set(), q = [startNode || nodes[0]];
  seen.add(q[0]); layers[q[0]] = 0;
  while (q.length) {
    const cur = q.shift();
    (adjMap[cur] || []).forEach(nb => { if (!seen.has(nb)) { seen.add(nb); layers[nb] = (layers[cur]||0)+1; q.push(nb); } });
  }
  nodes.forEach(n => { if (layers[n] === undefined) layers[n] = 0; });
  const maxL = Math.max(...Object.values(layers));
  const byL  = {};
  Object.entries(layers).forEach(([n,l]) => { if (!byL[l]) byL[l]=[]; byL[l].push(n); });
  const pos = {};
  Object.entries(byL).forEach(([layer,ns]) => {
    const l = Number(layer);
    ns.forEach((n,i) => {
      pos[n] = {
        x: 50 + (l / Math.max(maxL,1)) * (W-100),
        y: 40 + (i+0.5) * (H-80) / ns.length,
      };
    });
  });
  return pos;
}

function buildAdj(fa, ta, nodes) {
  const adj = {};
  nodes.forEach(n => (adj[n] = []));
  fa.forEach((f,i) => {
    const t = ta[i];
    if (f && t && adj[f] !== undefined && adj[t] !== undefined) {
      if (!adj[f].includes(t)) adj[f].push(t);
      if (!adj[t].includes(f)) adj[t].push(f);
    }
  });
  return adj;
}

// ── Graph SVG ─────────────────────────────────────────────────────────────────
function GraphViz({ step, nodes, edges, pos, startNode, algo }) {
  const visited      = step?.visited      || new Set();
  const queueOrStack = algo === 'BFS' ? (step?.queue||[]) : (step?.stack||[]);
  const current      = step?.current;
  const exploring    = step?.exploring;

  const nodeColor = n => {
    if (n === startNode && !visited.has(n)) return '#E8593C';
    if (n === current)   return '#EF9F27';
    if (n === exploring) return '#A78BFA';
    if (visited.has(n))  return '#3B8BD4';
    if (queueOrStack.includes(n)) return '#5DCAA5';
    return '#B4B2A9';
  };

  return (
    <svg viewBox="0 0 560 360" style={{ width:'100%', height:'100%' }}>
      <defs>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {edges.map(([a,b],i) => {
        const p1=pos[a], p2=pos[b]; if (!p1||!p2) return null;
        const dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.sqrt(dx*dx+dy*dy)||1, r=20;
        const onPath  = visited.has(a) && visited.has(b);
        const active  = (a===current&&b===exploring)||(b===current&&a===exploring);
        return (
          <line key={i}
            x1={p1.x+dx/len*r} y1={p1.y+dy/len*r}
            x2={p2.x-dx/len*r} y2={p2.y-dy/len*r}
            stroke={active?'#A78BFA':onPath?'#3B8BD4':'#D3D1C7'}
            strokeWidth={active?2.5:onPath?2:1.2}
            opacity={(!active&&!onPath)?0.55:1}
            style={{transition:'stroke 0.3s'}}
          />
        );
      })}
      {nodes.map(n => {
        if (!pos[n]) return null;
        const {x,y} = pos[n];
        const big = n===current || n===exploring;
        return (
          <g key={n} filter={big?'url(#glow2)':undefined}>
            <circle cx={x} cy={y} r={big?23:19}
              fill={nodeColor(n)} stroke={big?'#fff':'rgba(0,0,0,0.1)'} strokeWidth={big?2.5:1.2}
              style={{transition:'all 0.3s'}}/>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
              fontSize={13} fontWeight={700} fill="#fff" fontFamily="system-ui">{n}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Pseudocode panel ──────────────────────────────────────────────────────────
function Pseudocode({ lines, activeLines = [] }) {
  const activeSet = new Set(activeLines);
  return (
    <div style={{ background:'#fff', border:'1px solid #E8E6DF', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#F8F7F4', padding:'10px 16px', fontSize:11, fontWeight:600, color:'#888', borderBottom:'1px solid #E8E6DF', letterSpacing:1 }}>
        PSEUDOCODE
      </div>
      <div style={{ padding:'8px 0', flex:1, overflowY:'auto' }}>
        {lines.map(({n, text, indent, comment}) => {
          const active = activeSet.has(n);
          const pad = indent * 16;
          return (
            <div key={n} style={{
              display:'flex', alignItems:'flex-start',
              background: active ? '#EBF4FD' : 'transparent',
              borderLeft: `3px solid ${active ? '#3B8BD4' : 'transparent'}`,
              padding: '4px 14px 4px 0',
              transition: 'background 0.2s',
            }}>
              {/* line number */}
              <span style={{ fontSize:10, color:'#CCC', fontFamily:'monospace', margin:'0 10px 0 14px', minWidth:16, textAlign:'right', flexShrink:0, paddingTop:1 }}>{n}</span>
              {/* indent spacer */}
              <span style={{ display:'inline-block', minWidth:pad, flexShrink:0 }}/>
              {/* code text */}
              <span style={{
                fontFamily:"'Fira Code','Cascadia Code','Courier New',monospace",
                fontSize:12,
                color: active ? '#185FA5' : n===1 ? '#7C3AED' : '#444',
                fontWeight: active ? 700 : 400,
                flex:1,
                paddingTop:1,
              }}>{text}</span>
              {/* comment */}
              {comment && (
                <span style={{ fontFamily:"'Fira Code',monospace", fontSize:11, color:'#B4B2A9', fontStyle:'italic', paddingRight:14, paddingTop:1, whiteSpace:'nowrap' }}>
                  &nbsp;{comment}
                </span>
              )}
              {/* active marker */}
              {active && (
                <span style={{ fontSize:9, background:'#3B8BD4', color:'#fff', padding:'1px 7px', borderRadius:4, fontFamily:'monospace', flexShrink:0, marginTop:2, marginRight:8 }}>◄</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Queue / Stack bar ─────────────────────────────────────────────────────────
function DataStructureBar({ step, algo }) {
  const items   = algo === 'BFS' ? (step?.queue||[]) : (step?.stack||[]);
  const label   = algo === 'BFS' ? 'QUEUE' : 'STACK';
  const headIdx = algo === 'BFS' ? 0 : items.length-1;
  const hint    = algo === 'BFS' ? 'front (next to dequeue)' : 'top (next to pop)';

  return (
    <div style={{ background:'#fff', border:'1px solid #E8E6DF', borderRadius:16, padding:'12px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#3B8BD4', letterSpacing:2, fontFamily:'monospace' }}>{label}</span>
        <span style={{ fontSize:10, color:'#B4B2A9', fontFamily:'monospace' }}>
          {items.length === 0 ? 'empty' : hint}
        </span>
      </div>
      <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap', minHeight:42 }}>
        {items.length === 0
          ? <span style={{ fontSize:14, color:'#D3D1C7', fontFamily:'monospace' }}>∅</span>
          : items.map((n,i) => {
            const isHead = i === headIdx;
            return (
              <React.Fragment key={`${n}-${i}`}>
                <div style={{
                  width:40, height:40, borderRadius:10,
                  background: isHead ? '#EF9F27' : '#F8F7F4',
                  border: `1.5px solid ${isHead ? '#EF9F27' : '#E8E6DF'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700,
                  color: isHead ? '#fff' : '#555',
                  fontFamily:'system-ui',
                  transition:'all 0.3s',
                  boxShadow: isHead ? '0 2px 10px rgba(239,159,39,0.4)' : 'none',
                }}>{n}</div>
                {i < items.length-1 && <span style={{ fontSize:12, color:'#D3D1C7' }}>→</span>}
              </React.Fragment>
            );
          })
        }
      </div>
    </div>
  );
}

// ── Graph editor ──────────────────────────────────────────────────────────────
function GraphEditor({ fromArr, toArr, startNode, onFromChange, onToChange, onStartChange, onAddEdge, onRemoveEdge, onApply }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E8E6DF', borderRadius:16, padding:'16px 20px', marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', marginBottom:12, gap:12, flexWrap:'wrap' }}>
        <div>
          <span style={{ fontSize:13, fontWeight:700, color:'#1a1a18' }}>Graph Builder</span>
          <span style={{ marginLeft:8, fontSize:10, color:'#888', background:'#F1EFE8', padding:'2px 8px', borderRadius:6 }}>undirected edges</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
          <span style={{ fontSize:11, color:'#888' }}>Start node</span>
          <input value={startNode} onChange={e => onStartChange(e.target.value.toUpperCase())} maxLength={3}
            style={{ width:48, padding:'5px 6px', borderRadius:7, border:'1.5px solid #E8593C', fontSize:13, fontWeight:700, fontFamily:'monospace', textAlign:'center', color:'#E8593C', outline:'none' }}
          />
          <button onClick={onApply}
            style={{ padding:'6px 18px', borderRadius:8, border:'none', background:'#3B8BD4', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Apply Graph
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 22px 1fr 34px', gap:'0 8px', marginBottom:6 }}>
        <div style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#3B8BD4', letterSpacing:1, fontFamily:'monospace' }}>FROM[]</div>
        <div/>
        <div style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#3B8BD4', letterSpacing:1, fontFamily:'monospace' }}>TO[]</div>
        <div/>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:190, overflowY:'auto' }}>
        {fromArr.map((f,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 22px 1fr 34px', gap:'0 8px', alignItems:'center' }}>
            <input value={f} onChange={e => onFromChange(i, e.target.value.toUpperCase())} maxLength={3} placeholder="—"
              style={{ padding:'5px 8px', borderRadius:7, border:'1px solid #E8E6DF', fontSize:13, fontFamily:'monospace', fontWeight:600, textAlign:'center', color:'#185FA5', outline:'none' }}
            />
            <span style={{ textAlign:'center', fontSize:12, color:'#D3D1C7' }}>↔</span>
            <input value={toArr[i]} onChange={e => onToChange(i, e.target.value.toUpperCase())} maxLength={3} placeholder="—"
              style={{ padding:'5px 8px', borderRadius:7, border:'1px solid #E8E6DF', fontSize:13, fontFamily:'monospace', fontWeight:600, textAlign:'center', color:'#185FA5', outline:'none' }}
            />
            <button onClick={() => onRemoveEdge(i)}
              style={{ width:28, height:28, borderRadius:7, border:'1px solid #E8E6DF', background:'#FAFAF8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#B4B2A9' }}>
              <Trash2 size={12}/>
            </button>
          </div>
        ))}
      </div>

      <button onClick={onAddEdge}
        style={{ marginTop:9, display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:'1px dashed #D3D1C7', background:'transparent', color:'#888', fontSize:11, cursor:'pointer' }}>
        <Plus size={12}/> Add edge
      </button>
    </div>
  );
}

// ── Validate start node against compiled node set ─────────────────────────────
function validateStartNode(sn, ns) {
  if (!sn) return 'Start node is empty.';
  // Must appear in at least one edge (i.e., be a real graph node), not just injected
  if (!ns.includes(sn)) return `"${sn}" is not connected to any edge — it won't produce a useful traversal.`;
  return null; // valid
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function BFSDFSViz() {
  const [fromArr,   setFromArr]   = useState([...DEFAULT_FROM]);
  const [toArr,     setToArr]     = useState([...DEFAULT_TO]);
  const [startNode, setStartNode] = useState('A');

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [adj,   setAdj]   = useState({});
  const [pos,   setPos]   = useState({});

  // Fix 4: validation warning surfaced to UI
  const [startWarn, setStartWarn] = useState(null);

  const [algo,    setAlgo]    = useState('BFS');
  const [steps,   setSteps]   = useState([]);
  const [idx,     setIdx]     = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);

  // Fix 1: graphRef always holds the latest compiled graph so algo toggle
  // never reads stale state from a closure.
  const graphRef = useRef({ ns: [], am: {}, sn: 'A' });

  const compileGraph = useCallback((fa, ta, sn) => {
    // Build node set from edges only — don't inject startNode here.
    // That way ns reflects only real connected nodes and validation is honest.
    const nodeSet = new Set();
    fa.forEach((f,i) => { if (f && ta[i]) { nodeSet.add(f); nodeSet.add(ta[i]); } });
    const ns = [...nodeSet].sort();
    const el = fa.map((f,i) => [f,ta[i]]).filter(([f,t]) => f&&t);
    const am = buildAdj(fa, ta, ns);
    const pm = autoLayout(ns, am, sn||ns[0]);
    setNodes(ns); setEdges(el); setAdj(am); setPos(pm);
    graphRef.current = { ns, am, sn };
    return { ns, am };
  }, []);

  const rebuildSteps = useCallback((algoName, ns, am, sn) => {
    // Fix 3: safe clamp — if steps end up empty, idx stays at 0 (not -1)
    const s = algoName === 'BFS'
      ? buildBFS(sn, am, ns)
      : buildDFS(sn, am, ns);
    setSteps(s);
    setIdx(0);
    setPlaying(false);
  }, []);

  // Initial compile + build — runs once on mount only
  useEffect(() => {
    const { ns, am } = compileGraph(fromArr, toArr, startNode);
    const warn = validateStartNode(startNode, ns);
    setStartWarn(warn);
    if (!warn) rebuildSteps(algo, ns, am, startNode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix 1: algo toggle reads from graphRef — no stale closure risk
  const handleAlgoChange = (newAlgo) => {
    setAlgo(newAlgo);
    const { ns, am, sn } = graphRef.current;
    if (ns.length > 0 && !validateStartNode(sn, ns)) {
      rebuildSteps(newAlgo, ns, am, sn);
    }
  };

  useEffect(() => {
    clearTimeout(timer.current);
    // Fix 3: guard playing against empty steps
    if (steps.length === 0) { setPlaying(false); return; }
    if (playing && idx < steps.length-1) {
      timer.current = setTimeout(() => setIdx(i => i+1), 900);
    } else if (idx >= steps.length-1) {
      setPlaying(false);
    }
    return () => clearTimeout(timer.current);
  }, [playing, idx, steps.length]);

  const handleApply = () => {
    const { ns, am } = compileGraph(fromArr, toArr, startNode);
    const warn = validateStartNode(startNode, ns);
    setStartWarn(warn);
    if (!warn) rebuildSteps(algo, ns, am, startNode);
  };

  // Fix 3: safe helpers — clamp to [0, max(len-1, 0)]
  const maxIdx  = Math.max(steps.length - 1, 0);
  const goNext  = () => setIdx(i => Math.min(maxIdx, i + 1));
  const goPrev  = () => setIdx(i => Math.max(0, i - 1));
  const goReset = () => { setIdx(0); setPlaying(false); };

  const step   = steps.length > 0 ? (steps[idx] ?? null) : null;
  // Fix 2: safe display — show "0 / 0" instead of "1 / 0" when empty
  const stepDisplay = steps.length === 0 ? '0 / 0' : `${idx + 1} / ${steps.length}`;
  const pct    = steps.length > 0 ? ((idx + 1) / steps.length) * 100 : 0;
  const code   = algo === 'BFS' ? BFS_CODE : DFS_CODE;
  const isDone = step?.done;

  const hBg = isDone ? '#EAF3DE' : '#fff';
  const hBd = isDone ? '#C0DD97' : '#E8E6DF';
  const hTx = isDone ? '#27500A' : '#1a1a18';

  return (
    <div style={{ minHeight:'100vh', background:'#F8F7F4', padding:'20px', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E8E6DF', padding:'20px 24px', marginBottom:14 }}>
          <h1 style={{ fontSize:21, fontWeight:700, color:'#1a1a18', marginBottom:3 }}>Graph Search Visualizer</h1>
          <p style={{ fontSize:12, color:'#888', marginBottom:14 }}>Define your graph, pick an algorithm, then step through the pseudocode line by line.</p>

          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[['BFS','Breadth-First Search'],['DFS','Depth-First Search']].map(([a,label]) => (
              <button key={a} onClick={() => handleAlgoChange(a)} style={{
                padding:'7px 18px', borderRadius:8, border:'1px solid',
                borderColor: algo===a ? '#3B8BD4' : '#E8E6DF',
                background: algo===a ? '#EBF4FD' : '#fff',
                color: algo===a ? '#185FA5' : '#666',
                fontWeight: algo===a ? 700 : 400, fontSize:13, cursor:'pointer',
              }}>{label}</button>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={goReset}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, border:'1px solid #E8E6DF', background:'#fff', cursor:'pointer', fontSize:13 }}>
              <RotateCcw size={13}/> Reset
            </button>
            <button onClick={goPrev} disabled={idx === 0 || steps.length === 0}
              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #E8E6DF', background:'#fff', cursor:'pointer', fontSize:13, opacity:(idx===0||steps.length===0)?0.35:1 }}>
              ← Prev
            </button>
            <button onClick={() => setPlaying(p => !p)} disabled={steps.length === 0}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, border:'none',
                background: playing ? '#E24B4A' : '#2E9E6B', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500,
                opacity: steps.length === 0 ? 0.4 : 1 }}>
              {playing ? <><Pause size={15}/> Pause</> : <><Play size={15}/> Play</>}
            </button>
            <button onClick={goNext} disabled={steps.length === 0 || idx >= maxIdx}
              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #E8E6DF', background:'#fff', cursor:'pointer', fontSize:13, opacity:(steps.length===0||idx>=maxIdx)?0.35:1 }}>
              Next →
            </button>
            <span style={{ marginLeft:'auto', fontSize:12, color:'#888', background:'#F1EFE8', padding:'5px 12px', borderRadius:8 }}>
              Step {stepDisplay}
            </span>
          </div>

          <div style={{ marginTop:12, height:3, background:'#F1EFE8', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'#3B8BD4', borderRadius:4, transition:'width .3s' }}/>
          </div>
        </div>

        {/* Graph editor */}
        <GraphEditor
          fromArr={fromArr} toArr={toArr} startNode={startNode}
          onFromChange={(i,v) => setFromArr(a => { const c=[...a]; c[i]=v; return c; })}
          onToChange={(i,v)   => setToArr(a => { const c=[...a]; c[i]=v; return c; })}
          onStartChange={setStartNode}
          onAddEdge={() => { setFromArr(a => [...a,'']); setToArr(a => [...a,'']); }}
          onRemoveEdge={i => { setFromArr(a => a.filter((_,j)=>j!==i)); setToArr(a => a.filter((_,j)=>j!==i)); }}
          onApply={handleApply}
        />

        {/* Fix 4: start node validation warning */}
        {startWarn && (
          <div style={{ background:'#FEF3C7', border:'1px solid #F59E0B', borderRadius:12, padding:'10px 16px', marginBottom:14, fontSize:12, color:'#92400E', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:15 }}>⚠️</span>
            <span>{startWarn} Edit the start node above and click <strong>Apply Graph</strong>.</span>
          </div>
        )}

        {/* Step banner */}
        {step && (
          <div style={{ background:hBg, border:`1px solid ${hBd}`, borderRadius:16, padding:'14px 20px', marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:700, color:hTx, marginBottom:4 }}>{step.title}</div>
            <div style={{ fontSize:12, color:'#555' }}>{step.desc}</div>
          </div>
        )}

        {/* Neighbor checks */}
        {step?.checks && step.checks.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #E8E6DF', borderRadius:16, padding:'12px 20px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#1a1a18', marginBottom:8 }}>Condition check</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {step.checks.map((c,i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9,
                  border:`1px solid ${c.chosen?'#C0DD97':'#E8E6DF'}`,
                  background: c.chosen ? '#EAF3DE' : '#FAFAF8',
                }}>
                  {c.chosen
                    ? <CheckCircle size={15} style={{ color:'#3B6D11', flexShrink:0 }}/>
                    : <XCircle    size={15} style={{ color:'#B4B2A9', flexShrink:0 }}/>}
                  <span style={{ fontSize:13, fontWeight:600, color:c.chosen?'#27500A':'#888', fontFamily:'monospace' }}>{c.to}</span>
                  <span style={{ fontSize:11, color:'#999' }}>{c.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graph + Pseudocode */}
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:14, marginBottom:14 }}>
          <div style={{ background:'#fff', border:'1px solid #E8E6DF', borderRadius:16, padding:16 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'#888', marginBottom:8 }}>State graph</div>
            <div style={{ height:340 }}>
              <GraphViz step={step} nodes={nodes} edges={edges} pos={pos} startNode={startNode} algo={algo}/>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8 }}>
              {[
                ['#E8593C','Start (s)'],
                ['#EF9F27','Current (v)'],
                ['#A78BFA','Examining (w)'],
                ['#3B8BD4','Visited'],
                ['#5DCAA5', algo==='BFS'?'In Queue':'In Stack'],
                ['#B4B2A9','Unvisited'],
              ].map(([col,label]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#888' }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:col }}/>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <Pseudocode lines={code} activeLines={step?.lines||[]}/>
        </div>

        {/* Queue / Stack */}
        <DataStructureBar step={step} algo={algo}/>
      </div>
    </div>
  );
}

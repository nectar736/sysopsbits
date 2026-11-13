// Pure helpers for the homepage hero network (used by js/home-scene.js). No DOM, no three.js.

// Turn line-segment endpoints (x,y,z pairs, as EdgesGeometry produces) into a graph of unique nodes.
export function graphFromSegments(positions) {
    const nodes = [];
    const index = new Map();
    const key = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    const nodeAt = (i) => {
        const x = positions[i], y = positions[i + 1], z = positions[i + 2];
        const k = key(x, y, z);
        if (!index.has(k)) {
            index.set(k, nodes.length);
            nodes.push([x, y, z]);
        }
        return index.get(k);
    };

    const edges = [];
    const seen = new Set();
    for (let i = 0; i + 5 < positions.length; i += 6) {
        const a = nodeAt(i);
        const b = nodeAt(i + 3);
        if (a === b) continue;
        const k = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (seen.has(k)) continue;
        seen.add(k);
        edges.push([a, b]);
    }

    const neighbors = nodes.map(() => []);
    for (const [a, b] of edges) {
        neighbors[a].push(b);
        neighbors[b].push(a);
    }
    return { nodes, edges, neighbors };
}

// Breadth-first hop count from start to every node; -1 where unreachable.
export function hopDistances(neighbors, start) {
    const hops = neighbors.map(() => -1);
    hops[start] = 0;
    const queue = [start];
    for (let q = 0; q < queue.length; q++) {
        const n = queue[q];
        for (const m of neighbors[n]) {
            if (hops[m] === -1) {
                hops[m] = hops[n] + 1;
                queue.push(m);
            }
        }
    }
    return hops;
}

// Index of the projected point closest to (x, y) within maxDist pixels, or -1.
// skip[i] true leaves point i out (back-facing nodes).
export function nearestNode(points, x, y, maxDist, skip) {
    let best = -1;
    let bestDist = maxDist;
    for (let i = 0; i < points.length; i++) {
        if (skip && skip[i]) continue;
        const d = Math.hypot(points[i].x - x, points[i].y - y);
        if (d <= bestDist) {
            best = i;
            bestDist = d;
        }
    }
    return best;
}

// Brightness 0..1 of a node `hop` steps from the ping origin, `elapsed` seconds after the click.
export function pingLevel(hop, elapsed, { hopDelay = 0.11, flash = 0.42 } = {}) {
    if (hop < 0) return 0;
    const t = elapsed - hop * hopDelay;
    if (t <= 0 || t >= flash) return 0;
    return Math.sin((t / flash) * Math.PI);
}

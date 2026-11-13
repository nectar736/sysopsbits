import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphFromSegments, hopDistances, nearestNode, pingLevel } from '../../../../js/hero-graph.js';

// A square A-B-C-D-A drawn as four segments, with each corner repeated as two endpoints
const A = [0, 0, 0], B = [1, 0, 0], C = [1, 1, 0], D = [0, 1, 0];
const SQUARE = [...A, ...B, ...B, ...C, ...C, ...D, ...D, ...A];

test('graphFromSegments merges repeated endpoints into unique nodes', () => {
  const g = graphFromSegments(SQUARE);
  assert.equal(g.nodes.length, 4);
  assert.equal(g.edges.length, 4);
  assert.deepEqual(g.nodes[0], A);
  assert.deepEqual(g.neighbors.map((n) => [...n].sort()), [[1, 3], [0, 2], [1, 3], [0, 2]]);
});

test('graphFromSegments treats near-identical floats as the same node', () => {
  const g = graphFromSegments([0, 0, 0, 1, 0, 0, 1.000001, 0, 0, 1, 1, 0]);
  assert.equal(g.nodes.length, 3);
});

test('graphFromSegments ignores duplicate and zero-length segments', () => {
  const g = graphFromSegments([...A, ...B, ...B, ...A, ...C, ...C]);
  assert.equal(g.edges.length, 1);
  assert.equal(g.nodes.length, 3);
});

test('hopDistances counts hops from the start node', () => {
  const g = graphFromSegments(SQUARE);
  assert.deepEqual(hopDistances(g.neighbors, 0), [0, 1, 2, 1]);
});

test('hopDistances marks unreachable nodes as -1', () => {
  const g = graphFromSegments([...A, ...B, ...C, ...D]);
  assert.deepEqual(hopDistances(g.neighbors, 0), [0, 1, -1, -1]);
});

test('nearestNode returns the closest index within range, else -1', () => {
  const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 30, y: 40 }];
  assert.equal(nearestNode(pts, 28, 35, 40), 2);
  assert.equal(nearestNode(pts, 95, 3, 40), 1);
  assert.equal(nearestNode(pts, 300, 300, 40), -1);
  assert.equal(nearestNode(pts, 300, 300, Infinity), 1);
  assert.equal(nearestNode([], 0, 0, 40), -1);
});

test('pingLevel flashes each node one hop after the previous', () => {
  const opts = { hopDelay: 0.1, flash: 0.3 };
  assert.equal(pingLevel(0, 0, opts), 0);                       // the flash starts at zero
  assert.ok(pingLevel(0, 0.15, opts) > 0.9);                    // start node at its peak
  assert.equal(pingLevel(2, 0.15, opts), 0);                    // two hops away: not reached yet
  assert.ok(pingLevel(2, 0.35, opts) > 0.9);                    // reached 0.2 s later
  assert.equal(pingLevel(0, 0.31, opts), 0);                    // start node has faded
  assert.equal(pingLevel(-1, 0.2, opts), 0);                    // unreachable nodes never flash
});

test('nearestNode skips masked points', () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
  assert.equal(nearestNode(pts, 1, 0, 40, [true, false]), 1);
  assert.equal(nearestNode(pts, 1, 0, 40, [true, true]), -1);
});

test('the real icosphere graphs are one connected network', async () => {
  const { IcosahedronGeometry, EdgesGeometry } = await import('three');
  for (const detail of [1, 2]) {
    const g = graphFromSegments(new EdgesGeometry(new IcosahedronGeometry(1, detail)).getAttribute('position').array);
    assert.equal(g.nodes.length, 10 * (detail + 1) ** 2 + 2); // 42 and 92: no split or merged vertices
    assert.ok(!hopDistances(g.neighbors, 0).includes(-1));
  }
});

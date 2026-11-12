// Prints the static hero fallback: the same wireframe icosphere the WebGL scene draws,
// projected once with a fixed rotation. Paste the output into index.html inside .hero-scene.
// Usage: node scripts/vendor/make_hero_svg.mjs
import { IcosahedronGeometry, EdgesGeometry, Euler, Vector3 } from 'three';

const SIZE = 400;
const RADIUS = 150; // px radius of the sphere on the 400px canvas
const CAMERA_Z = 4.2; // matches the scene's camera distance for the same perspective
const rotation = new Euler(0.42, 0.62, 0.08);

const edges = new EdgesGeometry(new IcosahedronGeometry(1, 1));
const pos = edges.getAttribute('position');

function project(i) {
  const v = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyEuler(rotation);
  const scale = CAMERA_Z / (CAMERA_Z - v.z);
  return {
    x: +(SIZE / 2 + v.x * RADIUS * scale).toFixed(1),
    y: +(SIZE / 2 - v.y * RADIUS * scale).toFixed(1),
    z: v.z,
  };
}

const back = [];
const front = [];
const nodes = new Map();
for (let i = 0; i < pos.count; i += 2) {
  const a = project(i);
  const b = project(i + 1);
  const segment = `M${a.x} ${a.y}L${b.x} ${b.y}`;
  ((a.z + b.z) / 2 < 0 ? back : front).push(segment);
  for (const p of [a, b]) nodes.set(`${p.x},${p.y}`, p);
}

const circles = [...nodes.values()]
  .sort((p, q) => p.z - q.z)
  .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.z < 0 ? 1.6 : 2.4}" opacity="${p.z < 0 ? 0.45 : 1}"/>`)
  .join('');

console.log(
  `<svg class="hero-fallback" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" fill="none" focusable="false">` +
  `<path d="${back.join('')}" stroke="currentColor" stroke-width="1" opacity="0.28"/>` +
  `<path d="${front.join('')}" stroke="currentColor" stroke-width="1" opacity="0.8"/>` +
  `<g fill="currentColor">${circles}</g>` +
  `</svg>`
);

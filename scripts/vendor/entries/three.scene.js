// Only what js/home-scene.js uses. esbuild tree-shakes the rest of three.js away.
export {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  IcosahedronGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  Group,
  Color,
  Vector2,
} from 'three';

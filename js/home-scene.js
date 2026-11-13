// The homepage 3D hero: a wireframe node graph that turns slowly, leans toward the cursor and
// dissolves into the background grid as the reader scrolls. Loaded on demand by js/home.js.
// Interaction: hovering lights the nearest node and its links, a click or tap sends a ping out
// through the network, and dragging (mouse or pen) spins the object.
import {
    WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, IcosahedronGeometry,
    EdgesGeometry, LineSegments, LineBasicMaterial, Points, PointsMaterial, Group, Color, Vector2, Vector3,
} from './vendor/three.scene.min.js';
import { graphFromSegments, hopDistances, nearestNode, pingLevel } from './hero-graph.js';

const TURN_SECONDS = 90;
const MAX_TILT = 6 * Math.PI / 180;
const CAMERA_Z = 4.2;
const ENTRANCE_SELECTOR = '.posts-grid > .post-card, .guide-card, .topic-card, .log-row, .why-item';
const HOVER_RADIUS = 40;      // px from a node that counts as hovering it
const CLICK_SLOP = 6;         // px of movement before a press becomes a drag
const MAX_PINGS = 3;
const PING_SECONDS = 2.2;     // long enough for a ping to cross the sphere
const DRAG_RATE = 0.008;      // radians per px dragged
const SPIN_KICK = 0.9;        // rad/s added by a ping
const SPIN_DAMPING = 2.5;     // how fast extra spin and drag inertia die away
// Anything in the hero text column, plus any control, keeps its normal behaviour and never pings
const NO_PING_SELECTOR = '.hero-content, a, button, input, select, textarea, label, summary';
const PING_REACH = 0.15;      // a click pings only within this fraction of the box width from a node
const FLING_IDLE_MS = 80;     // a drag held still this long before release does not fling

function readColours() {
    const css = getComputedStyle(document.documentElement);
    const light = document.documentElement.classList.contains('light-mode');
    return {
        light,
        accent: new Color(css.getPropertyValue('--accent-text').trim() || '#f5a524'),
        grid: new Color(css.getPropertyValue('--border-hover').trim() || '#3a414b'),
        text: new Color(css.getPropertyValue('--text-primary').trim() || '#e6e8eb'),
    };
}

function gridPoints(count) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 2] = -2 - Math.random() * 3;
    }
    return positions;
}

export async function start({ canvas, mode }) {
    const lite = mode === 'lite';
    const hero = canvas.closest('.hero');
    const box = hero.querySelector('.hero-scene');

    const renderer = new WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'low-power' });
    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.z = CAMERA_Z;

    // The object, built as a graph so hover and pings can light individual nodes and links
    const group = new Group();
    const shape = new IcosahedronGeometry(1, lite ? 1 : 2);
    const graph = graphFromSegments(new EdgesGeometry(shape).getAttribute('position').array);
    const nodeCount = graph.nodes.length;

    const edgeGeometry = new BufferGeometry();
    const edgePos = new Float32Array(graph.edges.length * 6);
    graph.edges.forEach(([a, b], i) => {
        edgePos.set(graph.nodes[a], i * 6);
        edgePos.set(graph.nodes[b], i * 6 + 3);
    });
    edgeGeometry.setAttribute('position', new BufferAttribute(edgePos, 3));
    edgeGeometry.setAttribute('color', new BufferAttribute(new Float32Array(edgePos.length), 3));
    const edges = new LineSegments(edgeGeometry, new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }));

    const nodeGeometry = new BufferGeometry();
    nodeGeometry.setAttribute('position', new BufferAttribute(new Float32Array(graph.nodes.flat()), 3));
    nodeGeometry.setAttribute('color', new BufferAttribute(new Float32Array(nodeCount * 3), 3));
    const nodes = new Points(nodeGeometry, new PointsMaterial({ vertexColors: true, size: lite ? 0.045 : 0.04, transparent: true, opacity: 0.95 }));

    // Lit nodes (hover, pings) also show as larger dots whose alpha follows their level
    const glowGeometry = new BufferGeometry();
    glowGeometry.setAttribute('position', nodeGeometry.getAttribute('position'));
    glowGeometry.setAttribute('color', new BufferAttribute(new Float32Array(nodeCount * 4), 4));
    const glow = new Points(glowGeometry, new PointsMaterial({ vertexColors: true, size: 0.085, transparent: true, depthWrite: false }));

    // A larger marker on the hovered node
    const markerGeometry = new BufferGeometry();
    markerGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
    const marker = new Points(markerGeometry, new PointsMaterial({ size: 0.13, transparent: true, opacity: 0 }));

    group.add(edges, nodes, glow, marker);
    group.rotation.set(0.42, 0.62, 0.08);
    scene.add(group);

    // A pulse travelling along one edge at a time (full scene only)
    const edgePositions = edgeGeometry.getAttribute('position');
    const pulseGeometry = new BufferGeometry();
    pulseGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
    const pulse = new Points(pulseGeometry, new PointsMaterial({ size: 0.09, transparent: true, opacity: 0 }));
    if (!lite) group.add(pulse);

    // The faint grid behind it
    const backdropGeometry = new BufferGeometry();
    const backdropBase = gridPoints(lite ? 60 : 240);
    backdropGeometry.setAttribute('position', new BufferAttribute(backdropBase.slice(), 3));
    const backdrop = new Points(backdropGeometry, new PointsMaterial({ size: 0.03, transparent: true, opacity: 0.6 }));
    scene.add(backdrop);

    // Colours. Each node and link has a level 0..1 (hover, pings) mixed from its resting colour
    // toward a "hot" colour with more contrast against the page in either theme.
    const edgeRest = new Color();
    const nodeRest = new Color();
    const hot = new Color();
    const nodeLevel = new Float32Array(nodeCount);
    const mixed = new Color();
    let coloursDirty = true;

    function applyColours() {
        const c = readColours();
        // Resting links sit closer to the grid colour so a lit link stands out in both themes
        edgeRest.copy(c.grid).lerp(c.accent, 0.45);
        nodeRest.copy(c.grid).lerp(c.accent, 0.8);
        hot.copy(c.accent).lerp(c.text, c.light ? 0.15 : 0.3);
        marker.material.color.copy(hot);
        pulse.material.color.copy(c.accent);
        backdrop.material.color.copy(c.grid);
        canvas.dataset.theme = c.light ? 'light' : 'dark';
        coloursDirty = true;
    }
    applyColours();
    const onTheme = () => {
        applyColours();
        writeColours(); // refresh even while the loop is paused
        if (!running) renderer.render(scene, camera);
    };

    function writeColours() {
        const nc = nodeGeometry.getAttribute('color');
        const gc = glowGeometry.getAttribute('color');
        for (let i = 0; i < nodeCount; i++) {
            mixed.copy(nodeRest).lerp(hot, nodeLevel[i]);
            nc.setXYZ(i, mixed.r, mixed.g, mixed.b);
            gc.setXYZW(i, hot.r, hot.g, hot.b, nodeLevel[i] * (1 - progress));
        }
        nc.needsUpdate = true;
        gc.needsUpdate = true;
        const ec = edgeGeometry.getAttribute('color');
        for (let i = 0; i < graph.edges.length; i++) {
            const a = graph.edges[i][0];
            const b = graph.edges[i][1];
            const level = Math.max(Math.min(nodeLevel[a], nodeLevel[b]), (nodeLevel[a] + nodeLevel[b]) * 0.45);
            mixed.copy(edgeRest).lerp(hot, Math.min(1, level));
            ec.setXYZ(i * 2, mixed.r, mixed.g, mixed.b);
            ec.setXYZ(i * 2 + 1, mixed.r, mixed.g, mixed.b);
        }
        ec.needsUpdate = true;
    }

    // Size: the canvas covers the hero; the object sits over the reserved .hero-scene box
    const maxRatio = lite ? 1.5 : 2;
    let objectScale = 1;
    let baseY = 0;
    function resize() {
        const w = hero.clientWidth;
        const h = hero.clientHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        // Place the object at the centre of the reserved box, in world units at z = 0
        const heroRect = hero.getBoundingClientRect();
        const r = box.getBoundingClientRect();
        const viewH = 2 * CAMERA_Z * Math.tan((camera.fov * Math.PI) / 360);
        const unit = viewH / h;
        group.position.x = ((r.left + r.width / 2) - (heroRect.left + w / 2)) * unit;
        baseY = -((r.top + r.height / 2) - (heroRect.top + h / 2)) * unit;
        group.position.y = baseY;
        objectScale = (r.width * 0.75 * unit) / 2;
        group.scale.setScalar(objectScale * (1 - 0.4 * progress));
        canvas.dataset.size = w + 'x' + h;
    }

    // Scroll progress through the hero, 0..1. GSAP ScrollTrigger drives it when available.
    let progress = 0;
    function applyProgress() {
        group.scale.setScalar(objectScale * (1 - 0.4 * progress));
        edges.material.opacity = 0.75 * (1 - progress);
        group.userData.scrollTurn = progress * Math.PI;
        group.userData.lift = progress * 0.8;
    }

    const pointer = new Vector2(0, 0);
    const tilt = new Vector2(0, 0);
    if (!lite) {
        window.addEventListener('pointermove', (e) => {
            pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        }, { passive: true });
    }

    // ---- Interaction: hover, ping, drag ----
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const listen = new AbortController();
    const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal: listen.signal });
    const world = new Vector3();
    const projected = Array.from({ length: nodeCount }, () => ({ x: 0, y: 0 }));
    const backFacing = new Array(nodeCount).fill(false);
    let boxRect = box.getBoundingClientRect();
    const refreshBox = () => { boxRect = box.getBoundingClientRect(); };
    let litCount = 0;
    let hoverAt = null;          // client {x, y} while a fine pointer is over the object
    let hovered = -1;
    let hoverLevel = 0;          // eases the highlight in and out
    let lastHovered = -1;
    const pings = [];            // { hops, t }
    let pingCount = 0;
    let dragYaw = 0;
    let dragPitch = 0;
    let yawVelocity = 0;
    let press = null;            // { id, x, y, lastX, lastY, lastT, dragging, touch }

    canvas.dataset.hover = '';
    canvas.dataset.pings = '0';
    canvas.dataset.dragYaw = '0';
    canvas.dataset.lit = '0';

    function inBox(x, y) {
        const r = boxRect;
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    function eligible(e) {
        return inBox(e.clientX, e.clientY) && !(e.target.closest && e.target.closest(NO_PING_SELECTOR));
    }

    // Screen position of every node; back-facing nodes are marked so hover picks what you can see
    function projectNodes() {
        const r = canvas.getBoundingClientRect();
        group.updateMatrixWorld();
        const centreZ = group.position.z;
        for (let i = 0; i < nodeCount; i++) {
            const n = graph.nodes[i];
            world.set(n[0], n[1], n[2]).applyMatrix4(group.matrixWorld);
            backFacing[i] = world.z < centreZ;
            world.project(camera);
            projected[i].x = r.left + ((world.x + 1) / 2) * r.width;
            projected[i].y = r.top + ((1 - world.y) / 2) * r.height;
        }
    }

    function startPing(x, y) {
        projectNodes();
        const origin = nearestNode(projected, x, y, boxRect.width * PING_REACH, backFacing);
        if (origin < 0) return;
        pings.push({ hops: hopDistances(graph.neighbors, origin), t: 0 });
        if (pings.length > MAX_PINGS) pings.shift();
        yawVelocity += SPIN_KICK;
        pingCount += 1;
        canvas.dataset.pings = String(pingCount);
        if (!running) renderer.render(scene, camera);
    }

    function endPress(e, cancelled) {
        if (!press || press.id !== e.pointerId) return;
        const p = press;
        press = null;
        hero.classList.remove('is-dragging');
        if (cancelled) return;
        if (p.dragging) {
            if (performance.now() - p.lastT > FLING_IDLE_MS) yawVelocity = 0;
            canvas.dataset.dragYaw = dragYaw.toFixed(2);
        } else if (Math.hypot(e.clientX - p.x, e.clientY - p.y) <= CLICK_SLOP) {
            startPing(e.clientX, e.clientY);
        }
    }

    on(hero, 'pointerdown', (e) => {
        if (press || e.button !== 0 || !eligible(e)) return; // one press at a time
        const touch = e.pointerType === 'touch';
        const now = performance.now();
        press = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, lastT: now,
            vYaw: dragYaw, vT: now, dragging: false, touch };
        if (!touch) {
            // The target is the empty object area (text is excluded above): stop a drag from selecting text
            e.preventDefault();
            hero.setPointerCapture(e.pointerId);
        }
    });

    on(hero, 'pointermove', (e) => {
        if (press && press.id === e.pointerId && !press.touch) {
            if (!press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > CLICK_SLOP) {
                press.dragging = true;
                hero.classList.add('is-dragging');
            }
            if (press.dragging) {
                const now = performance.now();
                dragYaw += (e.clientX - press.lastX) * DRAG_RATE;
                dragPitch = Math.max(-0.8, Math.min(0.8, dragPitch + (e.clientY - press.lastY) * DRAG_RATE));
                press.lastX = e.clientX;
                press.lastY = e.clientY;
                press.lastT = now;
                // Velocity over ~30ms windows, so fast mice are not under-measured
                if (now - press.vT >= 30) {
                    yawVelocity = (dragYaw - press.vYaw) / ((now - press.vT) / 1000);
                    press.vYaw = dragYaw;
                    press.vT = now;
                }
            }
        }
        if (finePointer && e.pointerType !== 'touch') {
            hoverAt = eligible(e) ? { x: e.clientX, y: e.clientY } : null;
        }
    });

    on(hero, 'pointerup', (e) => endPress(e, false));
    on(hero, 'pointercancel', (e) => endPress(e, true));
    on(hero, 'lostpointercapture', (e) => endPress(e, true));
    on(hero, 'pointerleave', () => { hoverAt = null; });
    on(window, 'scroll', refreshBox, { passive: true });

    if (finePointer) hero.classList.add('is-interactive');
    canvas.dataset.interactive = '1';

    // Render loop, paused when the hero is off screen or the tab is hidden
    let visible = true;
    let running = false;
    let frame = 0;
    let last = performance.now();
    let spin = 0;
    let pulseEdge = 0;
    let pulseT = 1;
    let firstFrame = true;

    function setRunning(next) {
        if (next === running) return;
        running = next;
        canvas.dataset.running = next ? '1' : '0';
        if (next) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
        } else {
            cancelAnimationFrame(frame);
        }
    }

    function update() {
        setRunning(visible && !document.hidden);
    }

    function updateHighlights(dt) {
        // Hover: nearest visible node within reach of the cursor
        let next = -1;
        if (hoverAt && !inBox(hoverAt.x, hoverAt.y)) hoverAt = null; // scrolled away under a still cursor
        if (hoverAt && !(press && press.dragging)) {
            projectNodes();
            next = nearestNode(projected, hoverAt.x, hoverAt.y, HOVER_RADIUS, backFacing);
        }
        if (next !== hovered) {
            hovered = next;
            canvas.dataset.hover = next < 0 ? '' : String(next);
        }
        if (hovered >= 0) lastHovered = hovered;
        hoverLevel += ((hovered >= 0 ? 1 : 0) - hoverLevel) * Math.min(1, dt / 0.08);
        if (hoverLevel < 0.01) hoverLevel = 0;

        for (let i = pings.length - 1; i >= 0; i--) {
            pings[i].t += dt;
            if (pings[i].t > PING_SECONDS) pings.splice(i, 1);
        }
        if (!pings.length && hoverLevel === 0 && !coloursDirty) return;

        nodeLevel.fill(0);
        if (hoverLevel > 0 && lastHovered >= 0) {
            nodeLevel[lastHovered] = hoverLevel;
            const around = graph.neighbors[lastHovered];
            for (let k = 0; k < around.length; k++) nodeLevel[around[k]] = Math.max(nodeLevel[around[k]], 0.6 * hoverLevel);
            const n = graph.nodes[lastHovered];
            markerGeometry.getAttribute('position').setXYZ(0, n[0], n[1], n[2]);
            markerGeometry.getAttribute('position').needsUpdate = true;
        }
        marker.material.opacity = hoverLevel * (1 - progress);
        for (const ping of pings) {
            for (let i = 0; i < nodeCount; i++) {
                const level = pingLevel(ping.hops[i], ping.t);
                if (level > nodeLevel[i]) nodeLevel[i] = level;
            }
        }
        writeColours();
        coloursDirty = pings.length > 0 || hoverLevel > 0;
        let lit = 0;
        for (let i = 0; i < nodeCount; i++) if (nodeLevel[i] > 0.05) lit++;
        if (lit !== litCount) {
            litCount = lit;
            canvas.dataset.lit = String(lit);
        }
    }

    function tick(now) {
        frame = requestAnimationFrame(tick);
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        spin += (dt / TURN_SECONDS) * Math.PI * 2;

        // Drag inertia and ping kicks die away; a released drag tilt eases back to level
        if (!(press && press.dragging)) {
            dragYaw += yawVelocity * dt;
            yawVelocity *= Math.exp(-SPIN_DAMPING * dt);
            dragPitch *= Math.exp(-2 * dt);
        }

        tilt.lerp(pointer, 0.05);
        group.rotation.y = 0.62 + spin + (group.userData.scrollTurn || 0) + tilt.x * MAX_TILT + dragYaw;
        group.rotation.x = 0.42 + tilt.y * MAX_TILT + dragPitch;
        backdrop.position.y = (group.userData.lift || 0) * 0.3;
        group.position.y = baseY + (group.userData.lift || 0);
        updateHighlights(dt);

        if (!lite) {
            pulseT += dt * 0.8;
            if (pulseT >= 1) {
                pulseT = 0;
                pulseEdge = Math.floor(Math.random() * (edgePositions.count / 2)) * 2;
            }
            const p = pulse.geometry.getAttribute('position');
            const a = pulseEdge;
            const b = pulseEdge + 1;
            p.setXYZ(0,
                edgePositions.getX(a) + (edgePositions.getX(b) - edgePositions.getX(a)) * pulseT,
                edgePositions.getY(a) + (edgePositions.getY(b) - edgePositions.getY(a)) * pulseT,
                edgePositions.getZ(a) + (edgePositions.getZ(b) - edgePositions.getZ(a)) * pulseT);
            p.needsUpdate = true;
            pulse.material.opacity = Math.sin(pulseT * Math.PI) * (1 - progress);

            // Grid points within ~120px of the pointer drift a little toward it
            const pos = backdrop.geometry.getAttribute('position');
            const px = pointer.x * 7;
            const py = -pointer.y * 4;
            for (let i = 0; i < pos.count; i++) {
                const bx = backdropBase[i * 3];
                const by = backdropBase[i * 3 + 1];
                const d = Math.hypot(px - bx, py - by);
                const pull = d < 1.6 ? (1.6 - d) * 0.06 : 0;
                pos.setXY(i, bx + (px - bx) * pull, by + (py - by) * pull);
            }
            pos.needsUpdate = true;
        }

        renderer.render(scene, camera);
        if (firstFrame) {
            firstFrame = false;
            hero.classList.add('scene-ready');
        }
    }

    resize();
    applyProgress();
    writeColours();
    on(document, 'themechange', onTheme);
    on(window, 'resize', () => { resize(); refreshBox(); if (!running) renderer.render(scene, camera); });
    on(document, 'visibilitychange', update);
    const io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        update();
    });
    io.observe(hero);
    update();

    // Scroll choreography and staggered card entrances
    try {
        const { gsap, ScrollTrigger } = await import('./vendor/gsap.scroll.min.js');
        ScrollTrigger.create({
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
            onUpdate: (self) => { progress = self.progress; applyProgress(); },
        });
        // Claim cards still waiting for js/motion.js to reveal them, and animate them here instead
        const claimed = Array.from(document.querySelectorAll(ENTRANCE_SELECTOR))
            .filter((el) => el.getAttribute('data-reveal') === 'pending');
        claimed.forEach((el) => el.setAttribute('data-reveal', 'gsap'));
        gsap.set(claimed, { opacity: 0, y: 16, rotationX: 4, transformPerspective: 900 });
        ScrollTrigger.batch(claimed, {
            start: 'top 94%',
            once: true,
            onEnter: (batch) => gsap.to(batch, {
                opacity: 1, y: 0, rotationX: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06,
                clearProps: 'opacity,transform', overwrite: true,
                onComplete: () => batch.forEach((el) => el.setAttribute('data-reveal', 'in')),
            }),
        });
        // Never leave a claimed card hidden (print, bfcache restore)
        const showClaimed = () => claimed.forEach((el) => {
            gsap.set(el, { clearProps: 'opacity,transform' });
            el.setAttribute('data-reveal', 'in');
        });
        window.addEventListener('beforeprint', showClaimed);
        window.addEventListener('pageshow', (e) => { if (e.persisted) showClaimed(); });
        document.documentElement.classList.add('gsap-ready');
    } catch (e) {
        // Without GSAP the scene still runs; js/motion.js keeps handling reveals
    }

    return {
        stop() {
            setRunning(false);
            io.disconnect();
            listen.abort();
            renderer.dispose();
        },
    };
}

// The homepage 3D hero: a wireframe node graph that turns slowly, leans toward the cursor and
// dissolves into the background grid as the reader scrolls. Loaded on demand by js/home.js.
import {
    WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, IcosahedronGeometry,
    EdgesGeometry, LineSegments, LineBasicMaterial, Points, PointsMaterial, Group, Color, Vector2,
} from './vendor/three.scene.min.js';

const TURN_SECONDS = 90;
const MAX_TILT = 6 * Math.PI / 180;
const CAMERA_Z = 4.2;
const ENTRANCE_SELECTOR = '.posts-grid > .post-card, .guide-card, .topic-card, .log-row, .why-item';

function readColours() {
    const css = getComputedStyle(document.documentElement);
    const light = document.documentElement.classList.contains('light-mode');
    return {
        light,
        accent: new Color(css.getPropertyValue('--accent-text').trim() || '#f5a524'),
        grid: new Color(css.getPropertyValue('--border-hover').trim() || '#3a414b'),
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

    // The object
    const group = new Group();
    const shape = new IcosahedronGeometry(1, lite ? 1 : 2);
    const edges = new LineSegments(new EdgesGeometry(shape), new LineBasicMaterial({ transparent: true, opacity: 0.75 }));
    const nodes = new Points(shape, new PointsMaterial({ size: lite ? 0.045 : 0.04, transparent: true, opacity: 0.95 }));
    group.add(edges, nodes);
    group.rotation.set(0.42, 0.62, 0.08);
    scene.add(group);

    // A pulse travelling along one edge at a time (full scene only)
    const edgePositions = edges.geometry.getAttribute('position');
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

    function applyColours() {
        const c = readColours();
        edges.material.color.copy(c.accent);
        nodes.material.color.copy(c.accent);
        pulse.material.color.copy(c.accent);
        backdrop.material.color.copy(c.grid);
        canvas.dataset.theme = c.light ? 'light' : 'dark';
    }
    applyColours();
    document.addEventListener('themechange', applyColours);

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

    function tick(now) {
        frame = requestAnimationFrame(tick);
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        spin += (dt / TURN_SECONDS) * Math.PI * 2;

        tilt.lerp(pointer, 0.05);
        group.rotation.y = 0.62 + spin + (group.userData.scrollTurn || 0) + tilt.x * MAX_TILT;
        group.rotation.x = 0.42 + tilt.y * MAX_TILT;
        backdrop.position.y = (group.userData.lift || 0) * 0.3;
        group.position.y = baseY + (group.userData.lift || 0);

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
    window.addEventListener('resize', () => { resize(); if (!running) renderer.render(scene, camera); });
    document.addEventListener('visibilitychange', update);
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
            renderer.dispose();
        },
    };
}

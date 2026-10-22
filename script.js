// ═══ PRELOADER ══════════════════════════════════════════════════
(function () {
    const preloader   = document.getElementById('preloader');
    const counterEl   = document.getElementById('preloader-counter');
    const barEl       = document.getElementById('preloader-bar');

    if (!preloader) return;

    // Prevent scroll while loading
    document.body.style.overflow = 'hidden';

    let current   = 0;
    let target    = 0;
    let nameShown = false;
    let rafId;

    // Pad counter to always be 3 digits
    function pad(n) { return String(Math.floor(n)).padStart(3, '0'); }

    // Smoothly animate counter toward target. Time-based, so a slow device
    // takes the same ~1.3s as a fast one instead of crawling frame by frame.
    let lastTime = performance.now();
    function tick(now) {
        const dt = Math.min((now || performance.now()) - lastTime, 250);
        lastTime = now || performance.now();
        if (current < target) {
            current = Math.min(current + dt * 0.075, target);
            counterEl.textContent = pad(current);
            barEl.style.width     = current + '%';

            // Reveal name at 60%
            if (current >= 60 && !nameShown) {
                nameShown = true;
                preloader.classList.add('name-in');
            }
        }

        if (current < 100) {
            rafId = requestAnimationFrame(tick);
        } else {
            // Small pause so user can see "100", then exit
            setTimeout(dismissPreloader, 400);
        }
    }

    function dismissPreloader() {
        preloader.classList.add('done');
        // REMOVED: document.body.style.overflow = ''; 
        // We keep it locked to prevent browser-level bounce/jitter

        // Remove from DOM after transition completes
        preloader.addEventListener('transitionend', () => {
            preloader.remove();
        }, { once: true });

        // Trigger hero GSAP animations now that content is visible
        if (typeof triggerHeroAnimations === 'function') {
            triggerHeroAnimations();
        }
    }

    // Finish once the page and scripts are ready. Images keep loading in the
    // background, so a slow connection no longer holds the loader on screen.
    function updateProgress() {
        if (document.readyState !== 'loading') {
            target = 100;
        } else {
            target = Math.min(target + (Math.random() * 8 + 3), 90);
            setTimeout(updateProgress, 180);
        }
    }

    updateProgress();
    rafId = requestAnimationFrame(tick);
    document.addEventListener('DOMContentLoaded', () => { target = 100; });
})();

// Only honour the system "reduce motion" setting on touch devices (phones/tablets)
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce) and (pointer: coarse)').matches;

// Fade the hero photo in once it has arrived
(function () {
    const heroImg = document.querySelector('.hero-bg-img');
    if (!heroImg) return;
    const show = () => heroImg.classList.add('is-loaded');
    if (heroImg.complete && heroImg.naturalWidth) show();
    else heroImg.addEventListener('load', show, { once: true });
})();
// ════════════════════════════════════════════════════════════════

gsap.registerPlugin(ScrollTrigger);

// --- 1. Three.js Neural Network (Brain-like with Gyro) ---
const canvas = document.getElementById('neural-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.0015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
const isMobile = window.innerWidth <= 900;
camera.position.z = isMobile ? 120 : 200; // Zoom in more on mobile (120 vs 200)

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// ── Particle Setup ──────────────────────────────────────────────
const PARTICLE_COUNT = 180;
const NEURON_RATIO   = 0.28;  // 28% are hub neurons
const NEURON_RANGE   = 130;   // neurons link to each other this far
const DENDRITE_RANGE = 60;    // neurons link to satellites this far

const positions  = new Float32Array(PARTICLE_COUNT * 3);
const velocities = [];
const types      = []; // 'neuron' | 'satellite'
const sizes      = new Float32Array(PARTICLE_COUNT);
const colors     = new Float32Array(PARTICLE_COUNT * 3);

for (let i = 0; i < PARTICLE_COUNT; i++) {
    const spreadScale = isMobile ? 0.6 : 1.0;
    positions[i * 3]     = (Math.random() - 0.5) * (700 * spreadScale);
    positions[i * 3 + 1] = (Math.random() - 0.5) * (700 * spreadScale);
    positions[i * 3 + 2] = (Math.random() - 0.5) * (500 * spreadScale);

    const isNeuron = Math.random() < NEURON_RATIO;
    types.push(isNeuron ? 'neuron' : 'satellite');

    // Neurons: slower movement, satellites: slightly faster / more random
    const speed = isNeuron ? 0.2 : 0.35;
    velocities.push({
        x: (Math.random() - 0.5) * speed,
        y: (Math.random() - 0.5) * speed,
        z: (Math.random() - 0.5) * speed
    });

    // Sizes
    const sizeBaseScale = isMobile ? 1.8 : 1.0;
    sizes[i] = (isNeuron ? 3.5 : 1.2) * sizeBaseScale;

    // Colors: neurons = off-white bright, satellites = dim grey
    const brightness = isNeuron ? 0.9 + Math.random() * 0.1 : 0.25 + Math.random() * 0.2;
    colors[i * 3]     = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
}

// ── Point Cloud ─────────────────────────────────────────────────
const pointGeo = new THREE.BufferGeometry();
pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
pointGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

const pointMat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 2.5,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true
});
const pointCloud = new THREE.Points(pointGeo, pointMat);
scene.add(pointCloud);

// ── Line segments (neuron-to-neuron) ────────────────────────────
const neuronLineMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22
});
// Line buffers are allocated once and reused every frame (no per-frame garbage).
const MAX_SEG_FLOATS = PARTICLE_COUNT * PARTICLE_COUNT * 3;
function makeLineGeo() {
    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(new Float32Array(MAX_SEG_FLOATS), 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    geo.setDrawRange(0, 0);
    return geo;
}
const neuronLineGeo = makeLineGeo();
const neuronLines   = new THREE.LineSegments(neuronLineGeo, neuronLineMat);
scene.add(neuronLines);

// ── Line segments (neuron-to-satellite dendrites) ───────────────
const dendriteLineMat = new THREE.LineBasicMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.09
});
const dendriteLineGeo = makeLineGeo();
const dendriteLines   = new THREE.LineSegments(dendriteLineGeo, dendriteLineMat);
scene.add(dendriteLines);

// ── Input (mouse + gyro) ────────────────────────────────────────
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let gyroEnabled = false;

function gyroHandler(e) {
    if (e.gamma !== null && e.gamma !== undefined && e.beta !== null && e.beta !== undefined) {
        gyroEnabled = true;
        // Sensitivity scaling
        mouseX = e.gamma * 12;
        mouseY = (e.beta - 45) * 12;
    }
}

function enableGyro() {
    console.log("Gyro initialization requested...");
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ — must request permission
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                console.log("Gyro Permission State:", state);
                if (state === 'granted') {
                    window.addEventListener('deviceorientation', gyroHandler);
                    console.log("Motion sensors enabled!");
                } else {
                    console.log("Motion permission denied.");
                }
            })
            .catch((err) => {
                console.error("Gyro Permission Error:", err);
            });
    } else {
        // Android / non-iOS / Older iOS — no permission needed
        console.log("Gyro: Permission not required (likely Android or Desktop)");
        window.addEventListener('deviceorientation', gyroHandler);
    }
}

// Trigger on first click/touch — required for permission dialog
document.addEventListener('click', enableGyro, { once: true });
document.addEventListener('touchstart', enableGyro, { once: true });

// Mouse follows cursor on non-touch
document.addEventListener('mousemove', (e) => {
    if (gyroEnabled) return; // don't override gyro
    mouseX = (e.clientX - windowHalfX) * 0.5;
    mouseY = (e.clientY - windowHalfY) * 0.5;
});

window.addEventListener('resize', () => {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (prefersReducedMotion) renderFrame();
});

// ── Animation Loop ──────────────────────────────────────────────
const NEURON_RANGE_SQ   = NEURON_RANGE * NEURON_RANGE;
const DENDRITE_RANGE_SQ = DENDRITE_RANGE * DENDRITE_RANGE;
const neuronBuf   = neuronLineGeo.attributes.position;
const dendriteBuf = dendriteLineGeo.attributes.position;

function pushSeg(arr, n, pos, i, j) {
    arr[n]     = pos[i*3]; arr[n + 1] = pos[i*3+1]; arr[n + 2] = pos[i*3+2];
    arr[n + 3] = pos[j*3]; arr[n + 4] = pos[j*3+1]; arr[n + 5] = pos[j*3+2];
    return n + 6;
}

function animateMesh() {
    requestAnimationFrame(animateMesh);
    renderFrame(true);
}

function renderFrame(move) {

    // Gentle drift rotation
    pointCloud.rotation.y += 0.0005;
    neuronLines.rotation.y  += 0.0005;
    dendriteLines.rotation.y += 0.0005;

    // ── Interaction Modes ─────────────────────────────────────
    if (gyroEnabled) {
        // MOBILE / GYRO: Use stable rotation to prevent "zoom"
        const targetRotX = -mouseY * 0.0003;
        const targetRotY = mouseX * 0.0003;
        
        scene.rotation.x += (targetRotX - scene.rotation.x) * 0.05;
        scene.rotation.y += (targetRotY - scene.rotation.y) * 0.05;

        // Ensure camera position is centered for rotation mode
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.y += (0 - camera.position.y) * 0.05;
    } else {
        // DESKTOP / MOUSE: Use deep position parallax
        camera.position.x += (mouseX - camera.position.x) * 0.015;
        camera.position.y += (-mouseY - camera.position.y) * 0.015;
        
        // Ensure scene rotation is reset for position mode
        scene.rotation.x += (0 - scene.rotation.x) * 0.05;
        scene.rotation.y += (0 - scene.rotation.y) * 0.05;
    }

    camera.lookAt(scene.position);

    // Move particles
    const pos = pointCloud.geometry.attributes.position.array;
    const nArr = neuronBuf.array;
    const dArr = dendriteBuf.array;
    let nLen = 0, dLen = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (move) {
            pos[i*3]   += velocities[i].x;
            pos[i*3+1] += velocities[i].y;
            pos[i*3+2] += velocities[i].z;

            if (Math.abs(pos[i*3])   > 350) velocities[i].x *= -1;
            if (Math.abs(pos[i*3+1]) > 350) velocities[i].y *= -1;
            if (Math.abs(pos[i*3+2]) > 250) velocities[i].z *= -1;
        }
    }

    // Build connections - only from neurons outward
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (types[i] !== 'neuron') continue;

        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
            const dx = pos[i*3]   - pos[j*3];
            const dy = pos[i*3+1] - pos[j*3+1];
            const dz = pos[i*3+2] - pos[j*3+2];
            const distSq = dx*dx + dy*dy + dz*dz;

            if (types[j] === 'neuron') {
                if (distSq < NEURON_RANGE_SQ) nLen = pushSeg(nArr, nLen, pos, i, j);   // bright axon
            } else if (distSq < DENDRITE_RANGE_SQ) {
                dLen = pushSeg(dArr, dLen, pos, i, j);                                  // faint dendrite
            }
        }
    }

    pointCloud.geometry.attributes.position.needsUpdate = true;
    // Only upload the part of each buffer that is in use this frame
    neuronBuf.updateRange.offset = 0;
    neuronBuf.updateRange.count = nLen;
    neuronBuf.needsUpdate = nLen > 0;
    dendriteBuf.updateRange.offset = 0;
    dendriteBuf.updateRange.count = dLen;
    dendriteBuf.needsUpdate = dLen > 0;
    neuronLineGeo.setDrawRange(0, nLen / 3);
    dendriteLineGeo.setDrawRange(0, dLen / 3);

    renderer.render(scene, camera);
}

if (prefersReducedMotion) renderFrame(false); // one still frame, no drift
else animateMesh();

// --- 2. Interface Interactions ---
document.addEventListener('DOMContentLoaded', function () {
    // RAGAB Spotlight Glow — tracks mouse inside the wrapper
    const spotlightWrapper = document.querySelector('.hero-spotlight-wrapper');
    const glowLayer = document.querySelector('.hero-glow-layer');
    if (spotlightWrapper && glowLayer) {
        spotlightWrapper.addEventListener('mousemove', (e) => {
            const rect = spotlightWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            glowLayer.style.setProperty('--spotlight-x', `${x}px`);
            glowLayer.style.setProperty('--spotlight-y', `${y}px`);
        });
        // Reset when mouse leaves so glow fades cleanly
        spotlightWrapper.addEventListener('mouseleave', () => {
            glowLayer.style.setProperty('--spotlight-x', '-200px');
            glowLayer.style.setProperty('--spotlight-y', '-200px');
        });
    }



    // Modal Logic
    const openBtn = document.getElementById('open-contact-btn');
    const modal = document.getElementById('contact-modal');
    const closeBtn = document.querySelector('.close-modal');
    let lastFocused = null;

    function openModal() {
        if (!modal) return;
        lastFocused = document.activeElement;
        modal.classList.add('active');
        const first = modal.querySelector('input');
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
    }

    function closeModal() {
        if (!modal || !modal.classList.contains('active')) return;
        modal.classList.remove('active');
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus({ preventScroll: true });
    }
    window.closeContactModal = closeModal;

    if (openBtn) openBtn.addEventListener('click', openModal);

    // Email icons in the sidebar/footer open the same form
    document.querySelectorAll('.contact-trigger').forEach(trigger => {
        trigger.addEventListener('click', openModal);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Escape closes whichever popup is open
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const success = document.getElementById('success-modal');
        if (success && success.classList.contains('active')) {
            success.classList.remove('active');
        }
        closeModal();
    });

    // Custom Cursor Logic
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorImgContainer = document.querySelector('.cursor-img-container');
    const cursorImg = document.querySelector('.cursor-img');
    
    // Strengthened Precision Pointer Detection
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    
    if (isDesktop && !isTouch && cursorDot) {
        let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        let posDot = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        let posImg = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        let hasMoved = false;
        let cursorRunning = false;

        // The cursor loop only runs while something is still moving
        function startCursor() {
            if (cursorRunning) return;
            cursorRunning = true;
            requestAnimationFrame(renderCursor);
        }

        window.addEventListener('mousemove', (e) => {
            if (!hasMoved) {
                hasMoved = true;
                gsap.to(cursorDot, { opacity: 1, duration: 0.4, ease: "power2.out" });
            }
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            startCursor();
        });

        // If a preview image is missing, hide the preview instead of showing a broken image
        cursorImg.addEventListener('error', () => {
            gsap.to(cursorImgContainer, { opacity: 0, duration: 0.2, overwrite: true });
        });

        // Warm the cache so previews appear instantly on first hover
        window.addEventListener('load', () => {
            document.querySelectorAll('.project-row[data-cursor-img]').forEach(row => {
                const img = new Image();
                img.decoding = 'async';
                img.src = row.getAttribute('data-cursor-img');
            });
        }, { once: true });

        // Hide cursor if it leaves the window
        document.addEventListener('mouseleave', () => {
            gsap.to([cursorDot, cursorImgContainer], { opacity: 0, scale: 0, duration: 0.4 });
        });
        document.addEventListener('mouseenter', () => {
            if (hasMoved) {
                gsap.to(cursorDot, { opacity: 1, scale: 1, duration: 0.4 });
            }
        });

        // Project Hover Image Effect (Optimized)
        let activeProjectSrc = null;

        const setProjectPreview = (newSrc) => {
            startCursor();
            if (!newSrc) {
                activeProjectSrc = null;
                gsap.to(cursorImgContainer, { opacity: 0, scale: 0.3, duration: 0.4, ease: "power2.in", overwrite: true });
                if (cursorDot) cursorDot.classList.remove('img-active');
                return;
            }

            if (activeProjectSrc === newSrc) return;

            if (activeProjectSrc) {
                // DIP: Already showing another image
                gsap.to(cursorImgContainer, { 
                    opacity: 0, 
                    scale: 0.8, 
                    duration: 0.12, 
                    ease: "power1.inOut",
                    overwrite: true,
                    onComplete: () => {
                        cursorImg.src = newSrc;
                        activeProjectSrc = newSrc;
                        gsap.to(cursorImgContainer, { 
                            opacity: 0.9, 
                            scale: 1, 
                            duration: 0.3, 
                            ease: "power2.out"
                        });
                    }
                });
            } else {
                // FIRST REVEAL
                cursorImg.src = newSrc;
                activeProjectSrc = newSrc;
                gsap.to(cursorImgContainer, { 
                    opacity: 0.9, 
                    scale: 1, 
                    duration: 0.45, 
                    ease: "power2.out",
                    overwrite: true 
                });
                if (cursorDot) cursorDot.classList.add('img-active');
            }
        };

        window.setProjectPreview = setProjectPreview;

        const projectRows = document.querySelectorAll('.project-row');
        projectRows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                setProjectPreview(row.getAttribute('data-cursor-img'));
            });
            row.addEventListener('mouseleave', () => {
                setProjectPreview(null);
            });
        });

        // Interactive Hover States (Coordinated)
        const interactiveElements = document.querySelectorAll('a, button, .magnetic-btn, .magnetic-skill, .magnetic-link, .nav-link, .close-modal, .scroll-indicator, .social-link');
        interactiveElements.forEach(el => {
            // Skip if it's a project row OR inside a project row to avoid flickering
            if (el.classList.contains('project-row') || el.closest('.project-row')) return;

            el.addEventListener('mouseenter', () => {
                if (cursorDot) cursorDot.classList.add('active');
            });
            el.addEventListener('mouseleave', () => {
                if (cursorDot) cursorDot.classList.remove('active');
            });
        });

        // Expose a globally callable function to forcibly refresh the cursor state
        window.refreshCursor = () => {
            if (!hasMoved) return;
            const el = document.elementFromPoint(mouse.x, mouse.y);
            if (!el) return;
            
            const isInteractive = el.closest('a, button, .magnetic-btn, .magnetic-skill, .magnetic-link, .nav-link, .close-modal, .scroll-indicator, .social-link');
            if (isInteractive && !el.closest('.project-row')) {
                if (cursorDot) cursorDot.classList.add('active');
            } else {
                if (cursorDot) cursorDot.classList.remove('active');
            }
            
            const projectRow = el.closest('.project-row');
            if (!projectRow) {
                setProjectPreview(null);
            }
        };

        function renderCursor() {
            // Speed factor for dot
            posDot.x += (mouse.x - posDot.x) * 0.25;
            posDot.y += (mouse.y - posDot.y) * 0.25;
            
            // Offset logic: Move preview image away from the dot if active
            const isImgActive = cursorDot ? cursorDot.classList.contains('img-active') : false;
            
            // Targets for the offset
            let targetX = mouse.x;
            let targetY = mouse.y;
            
            if (isImgActive) {
                // Offset to top-right: clear the actual click point
                targetX += 150; 
                targetY -= 120;
            }
            
            // Lag factor for image (creates the "kinetic" feel)
            posImg.x += (targetX - posImg.x) * 0.1;
            posImg.y += (targetY - posImg.y) * 0.1;

            if (cursorDot) {
                cursorDot.style.transform = `translate3d(${posDot.x}px, ${posDot.y}px, 0) translate3d(-50%, -50%, 0)`;
            }
            if (cursorImgContainer) {
                cursorImgContainer.style.transform = `translate3d(${posImg.x}px, ${posImg.y}px, 0) translate3d(-50%, -50%, 0)`;
            }

            const settled = Math.abs(mouse.x - posDot.x) < 0.1 && Math.abs(mouse.y - posDot.y) < 0.1 &&
                            Math.abs(targetX - posImg.x) < 0.1 && Math.abs(targetY - posImg.y) < 0.1;
            if (settled) {
                cursorRunning = false;
                return;
            }
            requestAnimationFrame(renderCursor);
        }
        startCursor();
    } else {
        // Explicitly hide cursor elements on touch devices
        if (cursorDot) cursorDot.style.display = 'none';
        if (cursorImgContainer) cursorImgContainer.style.display = 'none';
    }
    // Terminal Typing Animation
    const terminalLines = [
        "> initializing_second_brain.sh...",
        "> connecting_uos_comp_eng_network... [OK]",
        "> digital_reach = 500000+; [VERIFIED]",
        "> deploying_elementa_and_bc101...",
        "> executing_flawlessly.exe",
        "> creativity_bounds = null;"
    ];

    const typewriterEl = document.getElementById("typewriter-text");
    if (typewriterEl) {
        let lineIdx = 0;
        let charIdx = 0;
        let isDeleting = false;
        let typeSpeed = 50;

        function typeLine() {
            const currentLine = terminalLines[lineIdx];
            
            if (isDeleting) {
                typewriterEl.textContent = currentLine.substring(0, charIdx - 1);
                charIdx--;
                typeSpeed = 20; // delete faster
            } else {
                typewriterEl.textContent = currentLine.substring(0, charIdx + 1);
                charIdx++;
                typeSpeed = 40 + Math.random() * 40; // some randomness
            }

            if (!isDeleting && charIdx === currentLine.length) {
                isDeleting = true;
                typeSpeed = 2500; // pause at end of line
            } else if (isDeleting && charIdx === 0) {
                isDeleting = false;
                lineIdx = (lineIdx + 1) % terminalLines.length;
                typeSpeed = 400; // pause before typing next
            }

            setTimeout(typeLine, typeSpeed);
        }
        
        setTimeout(typeLine, 1500); // Wait after load
    }
});


// --- 3. GSAP Advanced Scroll Animations ---

// Hero entrance fires AFTER preloader exits
function triggerHeroAnimations() {
    gsap.from(".role-badge", {
        opacity: 0,
        y: 15,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.3
    });

    gsap.from(".scroll-indicator", {
        opacity: 0,
        y: 20,
        duration: 1.5,
        ease: "power3.out",
        delay: 0.5
    });
}

// Also call immediately in case preloader was already removed (e.g. fast reload)
if (!document.getElementById('preloader')) {
    triggerHeroAnimations();
}

// Text Split Mask Reveals
const masks = gsap.utils.toArray('.reveal-mask');
masks.forEach(mask => {
    const el = mask.children[0];
    gsap.fromTo(el, 
        { y: '110%' },
        {
            y: '0%',
            duration: 1.2,
            ease: "power4.out",
            scrollTrigger: {
                trigger: mask,
                start: "top 90%",
                toggleActions: "play none none reverse"
            }
        });
});

// Staggered Timeline Rows & Fade-ups
gsap.from(".timeline-row, .fade-up", {
    scrollTrigger: {
        trigger: ".timeline-list",
        start: "top 80%"
    },
    y: 50,
    opacity: 0,
    duration: 1,
    stagger: 0.2,
    ease: "power3.out"
});

// Magnetic Buttons/Skills Hover Effect
const magnetics = prefersReducedMotion ? [] : document.querySelectorAll('.magnetic-skill, .magnetic-btn, .social-link');
magnetics.forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
        const rect = btn.getBoundingClientRect();
        const h = rect.width / 2;
        const v = rect.height / 2;
        const x = e.clientX - rect.left - h;
        const y = e.clientY - rect.top - v;
        
        gsap.to(btn, {
            x: x * 0.4,
            y: y * 0.4,
            duration: 0.4,
            ease: "power2.out"
        });
    });
    
    btn.addEventListener('mouseleave', function() {
        gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.7,
            ease: "elastic.out(1, 0.3)"
        });
    });
});

// Hero Parallax Scrubbing
if (!prefersReducedMotion) gsap.to(".hero-bg-img", {
    scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
    },
    y: 150,
    scale: 1.0
});

// --- 4. GSAP Observer & Panel Snapping (Revil Sketch Effect) ---
gsap.registerPlugin(Observer, ScrollToPlugin);

const panels = gsap.utils.toArray('.panel');
const curtain = document.querySelector('.transition-curtain');
const curtainText = document.getElementById('curtain-text');
const upBtn = document.getElementById('mobile-up');
const downBtn = document.getElementById('mobile-down');

const sectionTitles = ["HOME", "PROFILE", "EXPERIENCE", "PROJECTS", "CAPABILITIES", "EDUCATION"];
let currentIndex = 0;
let isAnimating = false;
let navigationCooldownUntil = 0;

const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(link.getAttribute('data-index'));
        if (targetIndex !== currentIndex && !isNaN(targetIndex) && !isAnimating) {
            const direction = targetIndex > currentIndex ? 1 : -1;
            gotoPanel(targetIndex, direction);
        }
    });
});

const scrollDownBtn = document.getElementById('scroll-down-btn');
if (scrollDownBtn) {
    scrollDownBtn.addEventListener('click', () => {
        if (!isAnimating && currentIndex === 0) {
            gotoPanel(1, 1);
        }
    });
}

// Ensure only the active panel is visible on load to isolate native scroll bounds
panels.forEach((p, i) => {
    if (i === currentIndex) p.classList.add('active');
    else p.classList.remove('active');
});

// Highlight initial nav link on load
const initialLink = document.querySelector(`.nav-link[data-index="${currentIndex}"]`);
if (initialLink) initialLink.classList.add('active');

function gotoPanel(index, direction) {
    const now = Date.now();
    if (isAnimating || now < navigationCooldownUntil) return;

    // Reset project preview state immediately to avoid "stuck" states after navigation
    if (typeof window.setProjectPreview === 'function') {
        window.setProjectPreview(null);
    }

    if (index < 0 || index >= panels.length) return;
    
    isAnimating = true;
    navigationCooldownUntil = now + 950; // Adjusted for 1.6x speed
    document.body.classList.add('is-transitioning');
    
    const title = sectionTitles[index] || "LOADING";
    curtainText.textContent = title;
    
    // Dynamic scaling for mobile portrait to ensure long words don't overflow
    if (window.innerHeight > window.innerWidth) {
        const baseSize = 220; // Matches CSS base
        const maxChars = 6;   // Max chars before we start scaling down
        const dynamicSize = title.length > maxChars 
            ? Math.floor(baseSize * (maxChars / title.length)) 
            : baseSize;
        curtainText.style.fontSize = dynamicSize + "px";
    } else {
        curtainText.style.fontSize = ""; // Reset to CSS default for landscape
    }
    
    gsap.set(curtainText, { strokeDashoffset: 2000, strokeDasharray: 2000, fill: "transparent" });
    gsap.set(curtain, { display: "flex", y: direction === 1 ? "100%" : "-100%", opacity: 1 });
    
    const tl = gsap.timeline({
        onComplete: () => {
            isAnimating = false;
            currentIndex = index;
            document.body.classList.remove('is-transitioning');
            panels[index].scrollTop = 0; // Reset internal scroll to top
            updateMobileControls();
        }
    });

    tl.to(curtain, { y: "0%", duration: 0.38, ease: "power4.inOut" })
      .to(curtainText, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" })
      .to(curtainText, { fill: "var(--secondary)", duration: 0.25, ease: "power2.out" }, "-=0.15")
      .add(() => {
          panels.forEach((p, i) => {
              if (i === index) p.classList.add('active');
              else p.classList.remove('active');
          });
          
          navLinks.forEach(l => l.classList.remove('active'));
          const currentLink = document.querySelector(`.nav-link[data-index="${index}"]`);
          if (currentLink) {
              currentLink.classList.add('active');
              // Auto-scroll mobile nav horizontally if present
              if (window.innerWidth <= 900) {
                  const stickyNav = document.getElementById('sticky-nav');
                  if (stickyNav) {
                      const linkLeft = currentLink.offsetLeft;
                      const navCenter = stickyNav.clientWidth / 2;
                      const linkCenter = currentLink.clientWidth / 2;
                      stickyNav.scrollTo({
                          left: linkLeft - navCenter + linkCenter,
                          behavior: 'smooth'
                      });
                  }
              }
          }

          window.scrollTo(0, 0); 
          ScrollTrigger.refresh(); 
      })
      .to({}, { duration: 0.12 })
      .to(curtain, { y: direction === 1 ? "-100%" : "100%", duration: 0.38, ease: "power4.inOut" })
      .set(curtain, { display: "none" })
      .add(() => {
          // Fix cursor state falling backward on transitions
          setTimeout(() => {
              if (typeof window.refreshCursor === 'function') {
                  window.refreshCursor();
              }
          }, 50);
      });
}

function updateMobileControls() {
    if(!upBtn || !downBtn) return;
    upBtn.disabled = currentIndex === 0;
    downBtn.disabled = currentIndex === panels.length - 1;
}

if(upBtn && downBtn) {
    upBtn.addEventListener('click', () => {
        if(currentIndex > 0) gotoPanel(currentIndex - 1, -1);
    });
    downBtn.addEventListener('click', () => {
        if(currentIndex < panels.length - 1) gotoPanel(currentIndex + 1, 1);
    });
    updateMobileControls();
}

// Mobile Instruction Nudge Logic
let nudgeTimeout;
function showNavNudge() {
    const nudge = document.getElementById('nav-nudge');
    if (!nudge || window.innerWidth > 900) return;
    
    nudge.classList.add('visible');
    clearTimeout(nudgeTimeout);
    nudgeTimeout = setTimeout(() => {
        nudge.classList.remove('visible');
    }, 3000);
}



/* --- 5. Scroll Mode Toggle (DISABLED) ---
const scrollToggle = document.getElementById('scroll-mode-toggle');
const btnText = scrollToggle.querySelector('.btn-text');
const btnIcon = scrollToggle.querySelector('.btn-icon');

scrollToggle.addEventListener('click', () => {
    const isClassic = document.body.classList.toggle('classic-scroll');
    
    if (isClassic) {
        scrollObserver.disable();
        btnText.textContent = "CLASSIC";
        btnIcon.textContent = "☵";
        window.scrollTo(0, 0); 
    } else {
        scrollObserver.enable();
        btnText.textContent = "DYNAMIC";
        btnIcon.textContent = "◈";
        panels.forEach((p, i) => {
            if (i === currentIndex) p.classList.add('active');
            else p.classList.remove('active');
        });
        window.scrollTo(0, 0);
    }
});
*/

// 1. Mouse Wheel Observer (Desktop)
const scrollObserver = Observer.create({
    type: "wheel",
    onDown: () => { 
        if (isAnimating || Date.now() < navigationCooldownUntil) return;
        const p = panels[currentIndex];
        const isAtBottom = Math.ceil(p.scrollTop + p.clientHeight) >= p.scrollHeight - 5;
        if (isAtBottom) {
            gotoPanel(currentIndex + 1, 1);
        }
    },
    onUp: () => { 
        if (isAnimating || Date.now() < navigationCooldownUntil) return;
        const p = panels[currentIndex];
        const isAtTop = p.scrollTop <= 5;
        if (isAtTop) {
            gotoPanel(currentIndex - 1, -1);
        }
    },
    tolerance: 60,
    preventDefault: false
});

// 2. High-Precision Manual Swipe (Kinetic Strategy)
// We use a multi-threshold approach to ensure internal scrolling feels fluid
let touchStartY = 0;
let touchStartX = 0;

window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e) => {
    if (isAnimating || Date.now() < navigationCooldownUntil) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    
    // deltaY > 0 means Swipe UP (content moves UP, view goes to next section)
    const deltaY = touchStartY - touchEndY; 
    const deltaX = touchStartX - touchEndX;
    
    const SWIPE_THRESHOLD = 150; // Higher threshold for intentional page swaps
    const p = panels[currentIndex];

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > SWIPE_THRESHOLD) {
        const isAtBottom = Math.ceil(p.scrollTop + p.clientHeight) >= p.scrollHeight - 5;
        const isAtTop = p.scrollTop <= 5;

        // MAPPING: Bottom-to-Top (deltaY > 0) -> NEXT
        if (deltaY > 0 && isAtBottom) {
            if (window.innerWidth > 900) {
                gotoPanel(currentIndex + 1, 1);
            } else {
                showNavNudge();
            }
        } else if (deltaY < 0 && isAtTop) {
            if (window.innerWidth > 900) {
                gotoPanel(currentIndex - 1, -1);
            } else {
                showNavNudge();
            }
        }
    }
}, { passive: true });

// --- AJAX Contact Form & Success Modal Logic ---
const contactForm = document.getElementById('contact-form');
const successModal = document.getElementById('success-modal');
const closeSuccessBtn = document.getElementById('close-success-btn');
const contactModal = document.getElementById('contact-modal');

if (contactForm) {
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Visual Feedback: Transmitting State
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = "TRANSMITTING...";
        submitBtn.classList.add('submitting-btn');
        
        const formData = new FormData(contactForm);
        
        try {
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // Success Flow
                contactForm.reset();
                successModal.classList.add('active');
            } else {
                alert("Transmission failed. Please try again or direct email.");
            }
        } catch (error) {
            console.error("Form Error:", error);
            alert("Connection error. Secure channel interrupted.");
        } finally {
            // Restore Button
            submitBtn.textContent = originalBtnText;
            submitBtn.classList.remove('submitting-btn');
        }
    });
}

// Dual-Closing Logic: Both modals close when success is dismissed
if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
        successModal.classList.remove('active');
        if (typeof window.closeContactModal === 'function') window.closeContactModal();
        else if (contactModal) contactModal.classList.remove('active');
    });
}

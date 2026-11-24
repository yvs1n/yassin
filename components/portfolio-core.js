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
            current = Math.min(current + dt * 0.14, target);
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
            // Brief pause at 100 so interactive UI unlocks quickly
            setTimeout(dismissPreloader, 180);
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

gsap.registerPlugin(ScrollTrigger);

// --- 1. Interface Interactions ---
document.addEventListener('DOMContentLoaded', function () {
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

        // Preview sits up and to the right of the pointer so it never covers it
        const IMG_OFFSET_X = 150;
        const IMG_OFFSET_Y = -120;

        // GSAP owns the whole transform (position + scale) of both elements.
        // Writing style.transform by hand here used to fight GSAP's scale tweens,
        // which made the preview flash at the corner of the screen.
        gsap.set(cursorDot, { xPercent: -50, yPercent: -50, x: posDot.x, y: posDot.y });
        gsap.set(cursorImgContainer, { xPercent: -50, yPercent: -50, x: posImg.x, y: posImg.y, scale: 0.3 });
        const setDotX = gsap.quickSetter(cursorDot, 'x', 'px');
        const setDotY = gsap.quickSetter(cursorDot, 'y', 'px');
        const setImgX = gsap.quickSetter(cursorImgContainer, 'x', 'px');
        const setImgY = gsap.quickSetter(cursorImgContainer, 'y', 'px');

        // Put the preview exactly where it belongs before it fades in
        function snapPreviewToCursor() {
            posImg.x = mouse.x + IMG_OFFSET_X;
            posImg.y = mouse.y + IMG_OFFSET_Y;
            setImgX(posImg.x);
            setImgY(posImg.y);
        }

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
            document.querySelectorAll('[data-cursor-img]').forEach(row => {
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
                            opacity: 1, 
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
                if (cursorDot) cursorDot.classList.add('img-active');
                snapPreviewToCursor();
                gsap.fromTo(cursorImgContainer, { opacity: 0, scale: 0.3 }, {
                    opacity: 1, 
                    scale: 1, 
                    duration: 0.45, 
                    ease: "power2.out",
                    overwrite: true
                });
            }
        };

        window.setProjectPreview = setProjectPreview;

        const previewTargets = document.querySelectorAll('.project-row, .flagship-card');
        previewTargets.forEach(target => {
            target.addEventListener('mouseenter', () => {
                const src = target.getAttribute('data-cursor-img');
                if (src) setProjectPreview(src);
            });
            target.addEventListener('mouseleave', (e) => {
                if (e.relatedTarget && e.relatedTarget.closest && (e.relatedTarget.closest('.project-row') || e.relatedTarget.closest('.flagship-card'))) {
                    return;
                }
                setProjectPreview(null);
            });
        });

        // Interactive Hover States (Coordinated)
        const interactiveElements = document.querySelectorAll('a, button, .magnetic-btn, .magnetic-skill, .magnetic-link, .nav-link, .close-modal, .scroll-indicator, .social-link');
        interactiveElements.forEach(el => {
            // Skip if it's inside a preview item to avoid cursor state flickering
            if (el.classList.contains('project-row') || el.closest('.project-row') || el.classList.contains('flagship-card') || el.closest('.flagship-card')) return;

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
                targetX += IMG_OFFSET_X;
                targetY += IMG_OFFSET_Y;
            }

            // Lag factor for image (creates the "kinetic" feel)
            posImg.x += (targetX - posImg.x) * 0.1;
            posImg.y += (targetY - posImg.y) * 0.1;

            setDotX(posDot.x);
            setDotY(posDot.y);
            setImgX(posImg.x);
            setImgY(posImg.y);

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
    const aboutPanel = document.getElementById("about");
    if (typewriterEl) {
        let lineIdx = 0;
        let charIdx = 0;
        let isDeleting = false;
        let typeSpeed = 50;

        function typeLine() {
            // Skip work while tab is hidden or Profile panel is off-screen
            if (document.hidden || (aboutPanel && !aboutPanel.classList.contains('active'))) {
                setTimeout(typeLine, 400);
                return;
            }
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
    gsap.from(".scroll-indicator", {
        opacity: 0,
        y: 20,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.3
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

// Magnetic Buttons/Skills Hover Effect (cached rect avoids per-frame reflow)
const magnetics = prefersReducedMotion ? [] : document.querySelectorAll('.magnetic-skill, .magnetic-btn, .social-link');
magnetics.forEach(btn => {
    let cachedRect = null;
    btn.addEventListener('mouseenter', () => {
        cachedRect = btn.getBoundingClientRect();
    }, { passive: true });

    btn.addEventListener('mousemove', (e) => {
        if (!cachedRect) cachedRect = btn.getBoundingClientRect();
        const x = e.clientX - cachedRect.left - cachedRect.width * 0.5;
        const y = e.clientY - cachedRect.top - cachedRect.height * 0.5;
        gsap.to(btn, { x: x * 0.4, y: y * 0.4, duration: 0.35, ease: "power2.out", overwrite: 'auto' });
    }, { passive: true });
    
    btn.addEventListener('mouseleave', () => {
        cachedRect = null;
        gsap.to(btn, { x: 0, y: 0, duration: 0.65, ease: "elastic.out(1, 0.3)", overwrite: 'auto' });
    }, { passive: true });
});

// --- 3. GSAP Observer & Panel Snapping (Revil Sketch Effect) ---
gsap.registerPlugin(Observer);

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

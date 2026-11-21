/**
 * Hero Layout & Interactive Typography Controller
 * Handles flank entrance, scoped RAGAB spotlight glow, dynamic mobile
 * vertical centering between the navbar and avatar head, and nav state sync.
 */

export function updateMobileHeroLayout() {
  if (window.innerWidth > 1140) return;
  const nav = document.getElementById('sticky-nav');
  const canvas = document.getElementById('ascii-avatar-canvas');
  const flank = document.querySelector('.hero-sidebar-flank');
  if (!nav || !canvas || !flank) return;

  const navBottom = nav.getBoundingClientRect().bottom;
  const canvasTop = canvas.getBoundingClientRect().top;
  const flankHeight = flank.getBoundingClientRect().height;
  const availableSpace = canvasTop - navBottom;

  if (availableSpace > flankHeight) {
    const targetTop = navBottom + (availableSpace - flankHeight) / 2;
    document.documentElement.style.setProperty('--mobile-flank-top', `${Math.round(targetTop)}px`);
  }
}

export function initHeroLayout() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion && typeof window.gsap !== 'undefined') {
    window.gsap.fromTo(
      '.hero-meta-line',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power2.out', delay: 0.35 }
    );
  }

  // Scoped spotlight glow on RAGAB (rAF-throttled, zero forced reflows)
  const spotlightWrapper = document.querySelector('.hero-spotlight-wrapper');
  if (spotlightWrapper) {
    let rafPending = false;
    let nextX = -200;
    let nextY = -200;

    spotlightWrapper.addEventListener('pointermove', (e) => {
      nextX = e.offsetX;
      nextY = e.offsetY;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        spotlightWrapper.style.setProperty('--spotlight-x', `${nextX}px`);
        spotlightWrapper.style.setProperty('--spotlight-y', `${nextY}px`);
      });
    }, { passive: true });
  }

  // Sync body state for mobile navigation controls
  const homePanel = document.getElementById('home');
  if (homePanel) {
    const updateHomeState = () => {
      document.body.classList.toggle('not-on-home', !homePanel.classList.contains('active'));
    };
    new MutationObserver(updateHomeState).observe(homePanel, {
      attributes: true,
      attributeFilter: ['class']
    });
    updateHomeState();
  }

  window.addEventListener('resize', updateMobileHeroLayout, { passive: true });
  updateMobileHeroLayout();
}

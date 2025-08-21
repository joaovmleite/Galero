// All functions are no-ops if gsap is unavailable.

const _gsap = typeof window !== 'undefined' ? window.gsap : undefined;

export const setDocInitial = () => {
  if (!_gsap) return;
  _gsap.set(document.documentElement, { scrollBehavior: 'auto' });
  _gsap.set(document.body, { autoAlpha: 0 });
};

export const pageIntro = () => {
  if (!_gsap) return;
  const tl = _gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.6 } });
  tl.to(document.body, { autoAlpha: 1, duration: 0.4 })
    .from('.header-title', { y: -12, autoAlpha: 0 })
    .from('.galero-search', { y: -12, autoAlpha: 0 }, '-=0.3')
    .from(
      '.images-first-row .component-image-main, .images-second-row .component-image-main',
      { y: 12, autoAlpha: 0, stagger: 0.08 },
      '-=0.2'
    )
    .from(
      '.section-divider',
      { scaleX: 0, transformOrigin: 'left center', autoAlpha: 0, duration: 0.35 },
      '-=0.1'
    )
    .from('.component-footer-main > *', { y: 8, autoAlpha: 0, stagger: 0.06 }, '-=0.2');
};

export const modalOpen = (dialogEl, backdropEl, onShown) => {
  if (!_gsap || !dialogEl || !backdropEl) return;
  _gsap.set([dialogEl, backdropEl], { opacity: 0 });
  _gsap.to(backdropEl, { opacity: 1, duration: 0.2 });
  _gsap.to(dialogEl, { opacity: 1, duration: 0.25, delay: 0.05, onComplete: onShown || null });
};

export const modalClose = (dialogEl, backdropEl, onHidden) => {
  if (!_gsap || !dialogEl || !backdropEl) {
    if (onHidden) onHidden();
    return;
  }
  _gsap.to([dialogEl, backdropEl], { opacity: 0, duration: 0.25, onComplete: onHidden || null });
};

export const toastPulse = (toastEl) => {
  if (!_gsap || !toastEl) return;
  _gsap.killTweensOf(toastEl);
  _gsap.fromTo(toastEl, { opacity: 0 }, { opacity: 1, duration: 0.15, yoyo: true, repeat: 1, repeatDelay: 0.9 });
};

export const slotInitial = (el) => {
  if (!_gsap || !el) return;
  _gsap.set(el, { autoAlpha: 0, y: 10, scale: 0.98 });
};

export const slotsReveal = (elements, opts = {}) => {
  if (!_gsap || !elements?.length) return;
  _gsap.killTweensOf(elements);
  _gsap.to(elements, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: opts.duration ?? 0.5,
    ease: opts.ease ?? 'power2.out',
    stagger: opts.stagger ?? 0.06,
  });
};

export const setSlotsOpacity = (elements, opacity, duration = 0.2) => {
  if (!_gsap || !elements) return;
  _gsap.to(elements, { autoAlpha: opacity, duration });
};
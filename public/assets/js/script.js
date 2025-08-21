import {
  setDocInitial,
  pageIntro,
  modalOpen,
  modalClose,
  toastPulse,
  slotInitial,
  slotsReveal,
  setSlotsOpacity,
} from './animations.js';
import { SELECTORS, API_ENDPOINTS, PALETTE } from './constants.js';

// Exit early if GSAP is not available (helpers are no-ops too, but intro uses GSAP)
if (typeof window.gsap === 'undefined') {
  // Nothing to initialise without GSAP
}

setDocInitial();

const onReady = () => {
  pageIntro();

  const searchInput = document.querySelector(SELECTORS.searchInput);
  const slots = Array.from(document.querySelectorAll(SELECTORS.imageSlots));

  // Palette modal elements
  const modal = document.querySelector(SELECTORS.palette.modal);
  const backdrop = modal?.querySelector(SELECTORS.palette.backdrop);
  const dialog = modal?.querySelector(SELECTORS.palette.dialog);
  const grid = modal?.querySelector(SELECTORS.palette.grid);
  const preview = modal?.querySelector(SELECTORS.palette.preview);
  const toast = modal?.querySelector(SELECTORS.palette.toast);
  let lastFocusedElement = null;

  const closeModal = () => {
    if (!modal) return;
    modalClose(dialog, backdrop, () => {
      modal.setAttribute('aria-hidden', 'true');
      if (grid) grid.innerHTML = '';
      if (lastFocusedElement) lastFocusedElement.focus();
    });
  };

  const openModal = (colors = [], previewColor = null) => {
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');

    if (grid) {
      grid.innerHTML = '';
      const total = Math.max(colors.length, PALETTE.maxColors);
      for (let i = 0; i < total; i++) {
        const rgb = colors[i] || `hsl(0,0%,${72 + i * 2}%)`;
        const sw = document.createElement('button');
        sw.className = 'palette-swatch';
        sw.style.background = rgb;
        sw.dataset.rgb = rgb;
        sw.setAttribute('aria-label', `Color ${i + 1}: ${rgb}`);
        sw.setAttribute('tabindex', '0');

        const copyToClipboard = async (color) => {
          try {
            await navigator.clipboard.writeText(color);
            if (toast) {
              toast.textContent = `${color} copied`;
              toastPulse(toast);
            }
          } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = color;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            if (toast) {
              toast.textContent = `${color} copied`;
              toastPulse(toast);
            }
          }
        };

        sw.addEventListener('click', () => copyToClipboard(rgb));
        sw.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            copyToClipboard(rgb);
          }
        });

        grid.appendChild(sw);
      }
    }

    if (preview && (previewColor || colors[0])) {
      preview.style.background = previewColor || colors[0];
    }

    modalOpen(dialog, backdrop, () => {
      const firstSwatch = grid?.querySelector('.palette-swatch');
      if (firstSwatch) firstSwatch.focus();
    });
  };

  modal?.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement && e.target.dataset.close === '1') closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.getAttribute('aria-hidden') === 'false') closeModal();
  });

  // Palette helpers
  const getColorDistance = (c1, c2) => {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const isSimilarColor = (color, palette, threshold = PALETTE.similarThreshold) =>
    palette.some((existing) => getColorDistance(color, existing) < threshold);

  const extractPaletteFromImage = (imgEl, maxColors = PALETTE.maxColors) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const w = imgEl.naturalWidth || imgEl.width;
      const h = imgEl.naturalHeight || imgEl.height;
      if (!w || !h) return [];
      const targetW = PALETTE.targetWidth;
      const scale = Math.min(1, targetW / w);
      canvas.width = Math.max(1, Math.floor(w * scale));
      canvas.height = Math.max(1, Math.floor(h * scale));
      ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const palette = [];
      const step = PALETTE.sampleStep;
      for (let i = 0; i < data.length; i += step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue;
        if (r + g + b > PALETTE.maxBrightnessSum) continue;
        const color = [r, g, b];
        if (!isSimilarColor(color, palette)) {
          palette.push(color);
          if (palette.length >= maxColors) break;
        }
      }
      return palette.map((c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
    } catch (e) {
      console.warn('Palette extraction failed:', e);
      return [];
    }
  };

  // UI builders
  const prepareSlot = (slot, photo) => {
    slot.innerHTML = '';
    slot.setAttribute('role', 'button');
    slot.setAttribute(
      'aria-label',
      photo.alt_description || photo.description || 'Photo from Unsplash'
    );
    slot.setAttribute('tabindex', '0');

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = photo.urls?.small || photo.urls?.regular || photo.urls?.thumb || '';
    img.alt = photo.alt_description || photo.description || 'Photo from Unsplash';
    img.loading = 'eager';
    img.decoding = 'async';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    img.setAttribute('aria-hidden', 'true');

    slot.appendChild(img);

    const ensurePalette = async () => {
      try {
        if ('decode' in img && typeof img.decode === 'function') {
          await img.decode();
        }
      } catch (_) {}
      const colors = extractPaletteFromImage(img, PALETTE.maxColors);
      if (colors.length) {
        slot.__palette = colors;
        slot.__preview = colors[0];
      }
    };
    if (img.complete) ensurePalette();
    else img.addEventListener('load', ensurePalette, { once: true });

    const openPaletteModal = () => {
      const colors = Array.isArray(slot.__palette) ? slot.__palette : [];
      openModal(colors, slot.__preview || null);
      if (!colors.length) {
        ensurePalette().then(() => {
          if (Array.isArray(slot.__palette) && slot.__palette.length && modal?.getAttribute('aria-hidden') === 'false') {
            openModal(slot.__palette, slot.__preview || null);
          }
        });
      }
    };

    slot.addEventListener('click', openPaletteModal);
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPaletteModal();
      }
    });

    slotInitial(slot);
    return slot;
  };

  const renderImages = (photos) => {
    const items = photos.slice(0, 6);

    slots.forEach((slot, i) => {
      slot.style.backgroundImage = '';
      if (items[i]) {
        prepareSlot(slot, items[i]);
      } else {
        slot.innerHTML = '';
        // Reset visual state for empty slots
        slot.style.opacity = 0.6;
        slot.style.transform = 'translateY(0) scale(1)';
      }
    });

    const filled = slots.filter((s) => s.children.length > 0);
    if (filled.length) {
      slotsReveal(filled, { duration: 0.5, ease: 'power2.out', stagger: 0.06 });
    }
  };

  const searchAndRender = async (query) => {
    if (!query || !query.trim()) return;
    const q = encodeURIComponent(query.trim());
    const urls = API_ENDPOINTS.search(q);

    try {
      setSlotsOpacity(slots, 0.4, 0.2);

      let data = null;
      let lastErr = null;
      for (const u of urls) {
        try {
          const res = await fetch(u);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          data = await res.json();
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!data) throw lastErr || new Error('Request failed');
      const photos = Array.isArray(data?.results) ? data.results : [];

      renderImages(photos);
    } catch (err) {
      console.error('Search failed:', err);
      slots.forEach((slot) => (slot.innerHTML = ''));
    } finally {
      setSlotsOpacity(slots, 1, 0.2);
    }
  };

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        last = searchInput.value;
        searchAndRender(searchInput.value);
      }
    });

    let last = '';
    searchInput.addEventListener('blur', () => {
      if (searchInput.value.trim() && searchInput.value !== last) {
        last = searchInput.value;
        searchAndRender(searchInput.value);
      }
    });
  }

  // Terms modal
  const termsModal = document.querySelector(SELECTORS.terms.modal);
  const termsBackdrop = termsModal?.querySelector(SELECTORS.terms.backdrop);
  const termsDialog = termsModal?.querySelector(SELECTORS.terms.dialog);

  const openTerms = () => {
    if (!termsModal) return;
    termsModal.setAttribute('aria-hidden', 'false');
    modalOpen(termsDialog, termsBackdrop);
  };

  const closeTerms = () => {
    if (!termsModal) return;
    modalClose(termsDialog, termsBackdrop, () => termsModal.setAttribute('aria-hidden', 'true'));
  };

  const termsTrigger = document.querySelector(SELECTORS.terms.trigger);
  termsTrigger?.addEventListener('click', (e) => {
    e.preventDefault();
    openTerms();
  });

  termsModal?.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement && e.target.dataset.close === '1') closeTerms();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal?.getAttribute('aria-hidden') === 'false') {
        closeModal();
      } else if (termsModal?.getAttribute('aria-hidden') === 'false') {
        closeTerms();
      }
    }
  });

  // Focus trap for modals
  const trapFocus = (element) => {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusableElement = element.querySelectorAll(focusableElements)[0];
    const focusableContent = element.querySelectorAll(focusableElements);
    const lastFocusableElement = focusableContent[focusableContent.length - 1];

    element.addEventListener('keydown', function (e) {
      const isTabPressed = e.key === 'Tab';
      if (!isTabPressed) return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    });
  };

  if (modal) trapFocus(modal);
  if (termsModal) trapFocus(termsModal);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}

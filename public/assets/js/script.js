(function () {
  if (typeof window.gsap === "undefined") return;

  gsap.set(document.documentElement, { scrollBehavior: "auto" });
  gsap.set(document.body, { autoAlpha: 0 });

  const onReady = () => {
    const searchInput = document.querySelector(".galero-search");
    const slots = Array.from(document.querySelectorAll(".component-image-main"));
    const paletteModalEl = document.getElementById("palette-modal");
    const termsModalEl = document.getElementById("terms-modal");
    const termsTrigger = document.getElementById("terms-of-usage");

    const paletteGrid = paletteModalEl?.querySelector(".palette-grid");
    const palettePreview = paletteModalEl?.querySelector(".palette-preview");
    const paletteToast = paletteModalEl?.querySelector(".palette-toast");

    const tl = gsap.timeline({
      defaults: { ease: "power2.out", duration: 0.6 },
    });

    tl.to(document.body, { autoAlpha: 1, duration: 0.4 })
      .from(".header-title", { y: -12, autoAlpha: 0 })
      .from(".galero-search", { y: -12, autoAlpha: 0 }, "-=0.3")
      .from(".images-first-row .component-image-main, .images-second-row .component-image-main", { y: 12, autoAlpha: 0, stagger: 0.08 }, "-=0.2")
      .from(".section-divider", { scaleX: 0, transformOrigin: "left center", autoAlpha: 0, duration: 0.35 }, "-=0.1")
      .from(".component-footer-main > *", { y: 8, autoAlpha: 0, stagger: 0.06 }, "-=0.2");

    const createModalController = (modalEl) => {
      if (!modalEl) return { open: () => {}, close: () => {} };
      const backdrop = modalEl.querySelector("[data-modal-backdrop]");
      const dialog = modalEl.querySelector("[data-modal-dialog]");

      const open = () => {
        modalEl.setAttribute("aria-hidden", "false");
        gsap.set([dialog, backdrop], { opacity: 0 });
        gsap.to(backdrop, { opacity: 1, duration: 0.2 });
        gsap.to(dialog, { opacity: 1, duration: 0.25, delay: 0.05 });
      };

      const close = (onComplete) => {
        gsap.to([dialog, backdrop], {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            modalEl.setAttribute("aria-hidden", "true");
            if (onComplete) onComplete();
          },
        });
      };
      
      modalEl.addEventListener("click", (e) => {
        if (e.target instanceof HTMLElement && e.target.dataset.close === "1") {
          close();
        }
      });

      return { open, close };
    };
    
    // As an elegant alternative, you should adapt your HTML.
    // Instead of `.palette-backdrop` and `.terms-dialog` you may use:
    // <div class="palette-backdrop" data-modal-backdrop></div>
    // <div class="terms-dialog" data-modal-dialog></div>
    const paletteModal = createModalController(paletteModalEl);
    const termsModal = createModalController(termsModalEl);

    const showToast = (message) => {
      if (!paletteToast) return;
      paletteToast.textContent = message;
      gsap.killTweensOf(paletteToast);
      gsap.fromTo(
        paletteToast,
        { opacity: 0 },
        { opacity: 1, duration: 0.15, yoyo: true, repeat: 1, repeatDelay: 0.9 }
      );
    };

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(`${text} copied`);
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast(`${text} copied`);
      }
    };

    const openPaletteModal = (colors = [], previewColor = null) => {
      if (!paletteModalEl || !paletteGrid) return;

      paletteGrid.innerHTML = "";
      const total = Math.max(colors.length, 8);
      for (let i = 0; i < total; i++) {
        const rgb = colors[i] || `hsl(0,0%,${72 + i * 2}%)`;
        const swatch = document.createElement("div");
        swatch.className = "palette-swatch";
        swatch.style.background = rgb;
        swatch.dataset.rgb = rgb;
        swatch.title = `Click to copy ${rgb}`;
        swatch.addEventListener("click", () => copyToClipboard(rgb));
        paletteGrid.appendChild(swatch);
      }

      if (palettePreview && (previewColor || colors[0])) {
        palettePreview.style.background = previewColor || colors[0];
      }
      
      paletteModal.open();
    };

    const getColorDistance = (c1, c2) => {
      const dr = c1[0] - c2[0];
      const dg = c1[1] - c2[1];
      const db = c1[2] - c2[2];
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const isSimilarColor = (color, palette, threshold = 40) =>
      palette.some((existing) => getColorDistance(color, existing) < threshold);

    const extractPaletteFromImage = (imgEl, maxColors = 8) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const { naturalWidth: w, naturalHeight: h } = imgEl;
        if (!w || !h) return [];
        
        const scale = Math.min(1, 220 / w);
        canvas.width = Math.max(1, Math.floor(w * scale));
        canvas.height = Math.max(1, Math.floor(h * scale));
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const palette = [];
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a < 128 || r + g + b > 740) continue;
          
          const color = [r, g, b];
          if (!isSimilarColor(color, palette)) {
            palette.push(color);
            if (palette.length >= maxColors) break;
          }
        }
        return palette.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
      } catch (e) {
        console.warn("Palette extraction failed:", e);
        return [];
      }
    };

    const prepareSlot = (slot, photo) => {
      slot.innerHTML = "";
      const img = document.createElement("img");
      Object.assign(img, {
        crossOrigin: "anonymous",
        src: photo.urls?.small || photo.urls?.regular || photo.urls?.thumb || "",
        alt: photo.alt_description || photo.description || "Photo from Unsplash",
        loading: "eager",
        decoding: "async",
      });
      Object.assign(img.style, {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      });
      slot.appendChild(img);

      const ensurePalette = async () => {
        try {
          if (img.decode) await img.decode();
        } catch (_) {}
        const colors = extractPaletteFromImage(img, 8);
        if (colors.length) {
          slot.__palette = colors;
          slot.__preview = colors[0];
        }
      };

      if (img.complete) ensurePalette();
      else img.addEventListener("load", ensurePalette, { once: true });

      slot.addEventListener("click", () => {
        const colors = Array.isArray(slot.__palette) ? slot.__palette : [];
        openPaletteModal(colors, slot.__preview || null);
        if (!colors.length) {
          ensurePalette().then(() => {
            if (Array.isArray(slot.__palette) && slot.__palette.length && paletteModalEl?.getAttribute("aria-hidden") === "false") {
              openPaletteModal(slot.__palette, slot.__preview || null);
            }
          });
        }
      });

      gsap.set(slot, { autoAlpha: 0, y: 10, scale: 0.98 });
      return slot;
    };

    const renderImages = (photos) => {
      const items = photos.slice(0, 6);
      slots.forEach((slot, i) => {
        slot.style.backgroundImage = "";
        if (items[i]) {
          prepareSlot(slot, items[i]);
        } else {
          slot.innerHTML = "";
          gsap.set(slot, { autoAlpha: 0.6, y: 0, scale: 1 });
        }
      });

      const filledSlots = slots.filter((s) => s.children.length > 0);
      if (filledSlots.length) {
        gsap.killTweensOf(filledSlots);
        gsap.to(filledSlots, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.06,
        });
      }
    };

    const searchAndRender = async (query) => {
      if (!query?.trim()) return;
      const q = encodeURIComponent(query.trim());
      const urls = [`/.netlify/functions/photos?query=${q}`, `/api/photos?query=${q}`];
      
      try {
        gsap.to(slots, { autoAlpha: 0.4, duration: 0.2 });
        let data = null;
        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data = await res.json();
            if (data) break;
          } catch (e) {
            console.warn(`Request to ${url} failed:`, e);
          }
        }
        if (!data) throw new Error("All API requests failed");
        renderImages(Array.isArray(data?.results) ? data.results : []);
      } catch (err) {
        console.error("Search failed:", err);
        slots.forEach((slot) => (slot.innerHTML = ""));
      } finally {
        gsap.to(slots, { autoAlpha: 1, duration: 0.2 });
      }
    };
    
    if (searchInput) {
      let lastSubmittedQuery = "";
      const handleSearch = () => {
        const query = searchInput.value;
        if (query.trim() && query !== lastSubmittedQuery) {
          lastSubmittedQuery = query;
          searchAndRender(query);
        }
      };
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSearch();
      });
      searchInput.addEventListener("blur", handleSearch);
    }
    
    termsTrigger?.addEventListener("click", (e) => {
      e.preventDefault();
      termsModal.open();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (paletteModalEl?.getAttribute("aria-hidden") === "false") {
          paletteModal.close(() => {
            if (paletteGrid) paletteGrid.innerHTML = "";
          });
        }
        if (termsModalEl?.getAttribute("aria-hidden") === "false") {
          termsModal.close();
        }
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
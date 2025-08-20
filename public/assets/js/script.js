(function () {
  // Ensure GSAP is available
  if (typeof window.gsap === "undefined") return;

  // Set initial state to avoid jumpy transitions
  gsap.set(document.documentElement, { scrollBehavior: "auto" }); // smoother control if needed
  gsap.set(document.body, { autoAlpha: 0 });

  const onReady = () => {
    const tl = gsap.timeline({
      defaults: { ease: "power2.out", duration: 0.6 },
    });

    tl.to(document.body, { autoAlpha: 1, duration: 0.4 })
      .from(".header-title", { y: -12, autoAlpha: 0 })
      .from(".galero-search", { y: -12, autoAlpha: 0 }, "-=0.3")
      .from(
        ".images-first-row .component-image-main, .images-second-row .component-image-main",
        {
          y: 12,
          autoAlpha: 0,
          stagger: 0.08,
        },
        "-=0.2"
      )
      .from(
        ".section-divider",
        {
          scaleX: 0,
          transformOrigin: "left center",
          autoAlpha: 0,
          duration: 0.35,
        },
        "-=0.1"
      )
      .from(
        ".component-footer-main > *",
        {
          y: 8,
          autoAlpha: 0,
          stagger: 0.06,
        },
        "-=0.2"
      );

    // ----- API integration for search -----
    const searchInput = document.querySelector(".galero-search");
    const slots = Array.from(
      document.querySelectorAll(".component-image-main")
    );

    // ===== Modal elements and helpers =====
    const modal = document.getElementById("palette-modal");
    const backdrop = modal?.querySelector(".palette-backdrop");
    const dialog = modal?.querySelector(".palette-dialog");
    const grid = modal?.querySelector(".palette-grid");
    const preview = modal?.querySelector(".palette-preview");
    const toast = modal?.querySelector(".palette-toast");

    const closeModal = () => {
      if (!modal) return;
      gsap.to([dialog, backdrop], {
        opacity: 0,
        duration: 0.25,
        onComplete: () => {
          modal.setAttribute("aria-hidden", "true");
          grid.innerHTML = "";
        },
      });
    };

    const openModal = (colors = [], previewColor = null) => {
      if (!modal) return;
      modal.setAttribute("aria-hidden", "false");
      // Build grid
      grid.innerHTML = "";
      const total = Math.max(colors.length, 8);
      for (let i = 0; i < total; i++) {
        const rgb = colors[i] || `hsl(0,0%,${72 + i * 2}%)`;
        const sw = document.createElement("div");
        sw.className = "palette-swatch";
        sw.style.background = rgb;
        sw.dataset.rgb = rgb;
        sw.title = `Click to copy ${rgb}`;
        sw.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(rgb);
            if (toast) {
              toast.textContent = `${rgb} copied`;
              gsap.killTweensOf(toast);
              gsap.fromTo(
                toast,
                { opacity: 0 },
                { opacity: 1, duration: 0.15, yoyo: true, repeat: 1, repeatDelay: 0.9 }
              );
            }
          } catch (_) {
            // Fallback copy
            const ta = document.createElement("textarea");
            ta.value = rgb;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
          }
        });
        grid.appendChild(sw);
      }
      // Preview color
      if (preview && (previewColor || colors[0])) {
        preview.style.background = previewColor || colors[0];
      }
      // Animate in
      gsap.set([dialog, backdrop], { opacity: 0 });
      gsap.to(backdrop, { opacity: 1, duration: 0.2 });
      gsap.to(dialog, { opacity: 1, duration: 0.25, delay: 0.05 });
    };

    modal?.addEventListener("click", (e) => {
      if (e.target instanceof HTMLElement && e.target.dataset.close === "1") {
        closeModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal?.getAttribute("aria-hidden") === "false") closeModal();
    });

    // ===== Palette helpers =====
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
        const w = imgEl.naturalWidth || imgEl.width;
        const h = imgEl.naturalHeight || imgEl.height;
        if (!w || !h) return [];
        const targetW = 220;
        const scale = Math.min(1, targetW / w);
        canvas.width = Math.max(1, Math.floor(w * scale));
        canvas.height = Math.max(1, Math.floor(h * scale));
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const palette = [];
        const step = 4 * 4;
        for (let i = 0; i < data.length; i += step) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          if (r + g + b > 740) continue;
          const color = [r, g, b];
          if (!isSimilarColor(color, palette)) {
            palette.push(color);
            if (palette.length >= maxColors) break;
          }
        }
        return palette.map((c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
      } catch (e) {
        console.warn("Palette extraction failed:", e);
        return [];
      }
    };

    // ===== UI builders =====
    const prepareSlot = (slot, photo) => {
      // Clear slot and place image
      slot.innerHTML = "";

      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.src = photo.urls?.small || photo.urls?.regular || photo.urls?.thumb || "";
      img.alt = photo.alt_description || photo.description || "Photo from Unsplash";
      img.loading = "eager";
      img.decoding = "async";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";

      slot.appendChild(img);

      // Pre-extract palette and cache on the slot
      const ensurePalette = async () => {
        try {
          if ("decode" in img && typeof img.decode === "function") {
            await img.decode();
          }
        } catch (_) {}
        const colors = extractPaletteFromImage(img, 8);
        if (colors.length) {
          slot.__palette = colors; // cache
          slot.__preview = colors[0];
        }
      };
      if (img.complete) ensurePalette();
      else img.addEventListener("load", ensurePalette, { once: true });

      // Click to open modal with cached palette (or placeholders)
      slot.addEventListener("click", () => {
        const colors = Array.isArray(slot.__palette) ? slot.__palette : [];
        openModal(colors, slot.__preview || null);
        // If not ready, try to compute now and update grid when ready
        if (!colors.length) {
          ensurePalette().then(() => {
            if (Array.isArray(slot.__palette) && slot.__palette.length && modal?.getAttribute("aria-hidden") === "false") {
              openModal(slot.__palette, slot.__preview || null);
            }
          });
        }
      });

      // Initial appear animation for the slot
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

      const filled = slots.filter((s) => s.children.length > 0);
      if (filled.length) {
        gsap.killTweensOf(filled);
        gsap.to(filled, {
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
      if (!query || !query.trim()) return;
      const q = encodeURIComponent(query.trim());
      const urls = [
        `/.netlify/functions/photos?query=${q}`,
        `/api/photos?query=${q}`,
      ];

      try {
        gsap.to(slots, { autoAlpha: 0.4, duration: 0.2 });

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
        if (!data) throw lastErr || new Error("Request failed");
        const photos = Array.isArray(data?.results) ? data.results : [];

        renderImages(photos);
      } catch (err) {
        console.error("Search failed:", err);
        slots.forEach((slot) => (slot.innerHTML = ""));
      } finally {
        gsap.to(slots, { autoAlpha: 1, duration: 0.2 });
      }
    };

    // Handle Enter key on the search input
    if (searchInput) {
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          last = searchInput.value;
          searchAndRender(searchInput.value);
        }
      });

      let last = "";
      searchInput.addEventListener("blur", () => {
        if (searchInput.value.trim() && searchInput.value !== last) {
          last = searchInput.value;
          searchAndRender(searchInput.value);
        }
      });
    }

    const termsModal = document.getElementById("terms-modal");
    const termsBackdrop = termsModal?.querySelector(".terms-backdrop");
    const termsDialog = termsModal?.querySelector(".terms-dialog");

    const openTerms = () => {
      if (!termsModal) return;
      termsModal.setAttribute("aria-hidden", "false");
      gsap.set([termsBackdrop, termsDialog], { opacity: 0 });
      gsap.to(termsBackdrop, { opacity: 1, duration: 0.2 });
      gsap.to(termsDialog, { opacity: 1, duration: 0.25, delay: 0.05 });
    };

    const closeTerms = () => {
      if (!termsModal) return;
      gsap.to([termsBackdrop, termsDialog], {
        opacity: 0,
        duration: 0.25,
        onComplete: () => termsModal.setAttribute("aria-hidden", "true"),
      });
    };

    // Trigger: click on footer tag with id "terms-of-usage"
    const termsTrigger = document.getElementById("terms-of-usage");
    termsTrigger?.addEventListener("click", (e) => {
      e.preventDefault();
      openTerms();
    });

    // Close by clicking outside (backdrop)
    termsModal?.addEventListener("click", (e) => {
      if (e.target instanceof HTMLElement && e.target.dataset.close === "1") {
        closeTerms();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();

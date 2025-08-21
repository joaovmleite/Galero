export const SELECTORS = {
  headerTitle: ".header-title",
  searchInput: ".galero-search",
  imageSlots: ".component-image-main",
  firstRow: ".images-first-row",
  secondRow: ".images-second-row",
  sectionDivider: ".section-divider",
  footerItems: ".component-footer-main > *",
  palette: {
    modal: "#palette-modal",
    backdrop: ".palette-backdrop",
    dialog: ".palette-dialog",
    grid: ".palette-grid",
    preview: ".palette-preview",
    toast: ".palette-toast",
  },
  terms: {
    modal: "#terms-modal",
    backdrop: ".terms-backdrop",
    dialog: ".terms-dialog",
    trigger: "#terms-of-usage",
  },
};

export const API_ENDPOINTS = {
  // Ordered fallbacks
  search: (q) => [
    `/.netlify/functions/photos?query=${q}`,
    `/api/photos?query=${q}`,
  ],
};

export const PALETTE = {
  maxColors: 8,
  similarThreshold: 40,
  sampleStep: 4 * 4, // RGBA * stride
  targetWidth: 220,
  maxBrightnessSum: 740,
};

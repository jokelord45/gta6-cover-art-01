// Neon Cover Studio — editor state and interactions.
// Owns the photos, the per-panel crop settings, the live preview and the PNG
// export. The poster engine (poster.js) does the actual drawing.

import { GRADES, LAYOUTS, SIZES, panelAt, panelCount, renderPoster } from './poster.js';

const PREVIEW_LONG = 900;

function imageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function blankSettings(count) {
  return Array.from({ length: count }, () => ({ photoId: null, zoom: 1, ox: 0, oy: 0 }));
}

/**
 * Builds the studio around a preview canvas. `hooks` lets the page update its
 * controls when the studio state changes (panel selected, zoom moved).
 */
export function createStudio(canvas, hooks = {}) {
  const state = {
    layout: 'headliner',
    grade: GRADES[0],
    size: SIZES[0],
    title: 'Sunset Heist',
    subtitle: 'Neon Nights · Sunset Boulevard',
    tag: 'A story in five frames',
    titleColor: '#ffffff',
    photos: new Map(),
    panelSettings: {},
    selectedPanel: 0,
    selectedPhotoId: null,
  };
  LAYOUTS.forEach((l) => { state.panelSettings[l.id] = blankSettings(panelCount(l.id)); });
  let photoSeq = 0;
  let fontsReady = false;

  function currentSettings() {
    return state.panelSettings[state.layout];
  }

  function previewSize() {
    const { w, h } = state.size;
    const scale = PREVIEW_LONG / Math.max(w, h);
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }

  function redraw() {
    const { w, h } = previewSize();
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    renderPoster(canvas, state);
    drawSelection();
    if (hooks.onRedraw) hooks.onRedraw(state);
  }

  function drawSelection() {
    // No selection frame on a bare cover shot.
    if (document.body.classList.contains('shot-cover')) return;
    const settings = currentSettings();
    const panel = settings[state.selectedPanel];
    if (!panel) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = previewSize();
    // Highlight the selected panel with a bright corner frame.
    const layout = LAYOUTS.find((l) => l.id === state.layout);
    const rect = layout.panels(w, h)[state.selectedPanel];
    const x = rect.x * w;
    const y = rect.y * h;
    const pw = rect.w * w;
    const ph = rect.h * h;
    const c = Math.min(pw, ph) * 0.09;
    ctx.save();
    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.beginPath();
    [[x, y, 1, 1], [x + pw, y, -1, 1], [x, y + ph, 1, -1], [x + pw, y + ph, -1, -1]].forEach(
      ([cx, cy, sx, sy]) => {
        ctx.moveTo(cx + sx * c, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * c);
      },
    );
    ctx.stroke();
    ctx.restore();
  }

  async function addPhoto(img, label) {
    photoSeq += 1;
    const id = `photo-${photoSeq}`;
    state.photos.set(id, img);
    state.selectedPhotoId = id;
    if (hooks.onPhotoAdded) hooks.onPhotoAdded(id, label, img);
    return id;
  }

  async function addPhotoFile(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await imageFromUrl(url);
      return addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function addSample(name) {
    const img = await imageFromUrl(`samples/${name}.jpg`);
    return addPhoto(img, name === 'pier' ? 'Pier' : 'Boulevard');
  }

  /** Picks a starting crop for one photo in one panel: spread across the
   * axis with the most slack, so several panels holding one photo show
   * different slices of it, like a comic strip. `t` runs -1..1 across panels. */
  function spreadCrop(panelIndex, img, t) {
    const layout = LAYOUTS.find((l) => l.id === state.layout);
    const { w, h } = previewSize();
    const rect = layout.panels(w, h)[panelIndex];
    const pw = rect.w * w;
    const ph = rect.h * h;
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const slackX = Math.max(0, img.naturalWidth * base - pw);
    const slackY = Math.max(0, img.naturalHeight * base - ph);
    if (slackX >= slackY) return { ox: -t * 0.8, oy: slackY > 0 ? 0.12 : 0 };
    return { ox: 0, oy: -t * 0.8 };
  }

  function setPhotoForPanel(panelIndex, photoId) {
    const settings = currentSettings();
    if (!settings[panelIndex]) return;
    settings[panelIndex].photoId = photoId;
    const img = state.photos.get(photoId);
    if (img) {
      const crop = spreadCrop(panelIndex, img, 0);
      settings[panelIndex].ox = crop.ox;
      settings[panelIndex].oy = crop.oy;
      settings[panelIndex].zoom = 1;
    }
    state.selectedPhotoId = photoId;
    redraw();
  }

  function fillAllPanels(photoId) {
    const settings = currentSettings();
    const img = state.photos.get(photoId);
    settings.forEach((s, i) => {
      s.photoId = photoId;
      if (img) {
        const t = settings.length <= 1 ? 0 : (i / (settings.length - 1)) * 2 - 1;
        const crop = spreadCrop(i, img, t);
        s.ox = crop.ox;
        s.oy = crop.oy;
        s.zoom = 1;
      }
    });
    state.selectedPhotoId = photoId;
    redraw();
  }

  function setLayout(layoutId) {
    if (!LAYOUTS.some((l) => l.id === layoutId)) return;
    state.layout = layoutId;
    state.selectedPanel = 0;
    redraw();
  }

  function setGrade(gradeId) {
    const grade = GRADES.find((g) => g.id === gradeId);
    if (grade) {
      state.grade = grade;
      redraw();
    }
  }

  function setSize(sizeId) {
    const size = SIZES.find((s) => s.id === sizeId);
    if (size) {
      state.size = size;
      redraw();
    }
  }

  function setCaption({ title, subtitle, tag, titleColor }) {
    if (title !== undefined) state.title = title;
    if (subtitle !== undefined) state.subtitle = subtitle;
    if (tag !== undefined) state.tag = tag;
    if (titleColor !== undefined) state.titleColor = titleColor;
    redraw();
  }

  function setZoom(zoom) {
    const s = currentSettings()[state.selectedPanel];
    if (!s) return;
    s.zoom = Math.max(1, Math.min(3, zoom));
    redraw();
  }

  function panSelected(dx, dy) {
    const s = currentSettings()[state.selectedPanel];
    if (!s) return;
    const { w, h } = previewSize();
    s.ox = Math.max(-0.5, Math.min(0.5, s.ox + dx / w));
    s.oy = Math.max(-0.5, Math.min(0.5, s.oy + dy / h));
    redraw();
  }

  function recenterSelected() {
    const s = currentSettings()[state.selectedPanel];
    if (!s) return;
    s.ox = 0;
    s.oy = 0;
    s.zoom = 1;
    redraw();
  }

  function selectPanelAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    const idx = panelAt(state, x, y, canvas.width, canvas.height);
    if (idx >= 0) {
      state.selectedPanel = idx;
      redraw();
      return true;
    }
    return false;
  }

  /** Renders the poster at exact export size and returns a PNG data URL. */
  async function exportPNGDataUrl(width, height) {
    await document.fonts.ready;
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    renderPoster(off, state);
    return off.toDataURL('image/png');
  }

  function downloadExport() {
    const { w, h } = state.size;
    exportPNGDataUrl(w, h).then((url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `neon-cover-${w}x${h}.png`;
      a.click();
      if (hooks.onExported) hooks.onExported(w, h);
    });
  }

  // Pointer: click selects a panel, drag pans its photo, wheel zooms it.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (selectPanelAt(e.clientX, e.clientY)) {
      drag = { x: e.clientX, y: e.clientY, moved: false };
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) {
      const rect = canvas.getBoundingClientRect();
      panSelected(dx * (canvas.width / rect.width), dy * (canvas.height / rect.height));
      drag.x = e.clientX;
      drag.y = e.clientY;
    }
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    selectPanelAt(e.clientX, e.clientY);
    setZoom((currentSettings()[state.selectedPanel]?.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.92));
  }, { passive: false });

  // First paint waits for the display font so the title never falls back.
  document.fonts.load('100px Anton').catch(() => {}).finally(() => {
    fontsReady = true;
    redraw();
  });
  redraw();

  return {
    state,
    redraw,
    addPhotoFile,
    addSample,
    setPhotoForPanel,
    fillAllPanels,
    setLayout,
    setGrade,
    setSize,
    setCaption,
    setZoom,
    recenterSelected,
    selectPanelAt,
    exportPNGDataUrl,
    downloadExport,
    get fontsReady() { return fontsReady; },
  };
}

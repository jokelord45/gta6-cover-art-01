// Neon Cover Studio — poster engine.
// Draws a multi-panel GTA-style poster onto a canvas: comic-strip panels with
// diagonal seams, a sunset/neon colour grade over each photo, and bold Anton
// lettering with a neon offset shadow. No network, no library: canvas 2D only.

export const LAYOUTS = [
  {
    id: 'headliner',
    label: 'Headliner',
    blurb: 'One big hero frame over three small ones',
    panels(w, h) {
      const g = 0.012;
      return [
        { x: 0, y: 0, w: 1, h: 0.56, slant: 0 },
        { x: 0, y: 0.56 + g, w: (1 - 2 * g) / 3, h: 0.44 - g, slant: 0 },
        { x: (1 - 2 * g) / 3 + g, y: 0.56 + g, w: (1 - 2 * g) / 3, h: 0.44 - g, slant: 0 },
        { x: 2 * ((1 - 2 * g) / 3 + g), y: 0.56 + g, w: (1 - 2 * g) / 3, h: 0.44 - g, slant: 0 },
      ];
    },
  },
  {
    id: 'boulevard',
    label: 'Boulevard',
    blurb: 'Tall hero frame, slanted seam, two side frames',
    panels(w, h) {
      const g = 0.012;
      return [
        // Hero: right edge slants inward toward the foot.
        { x: 0, y: 0, w: 0.55, h: 1, slant: -0.05 },
        { x: 0.55 + g, y: 0, w: 0.45 - g, h: 0.5 - g / 2, slant: 0.03 },
        { x: 0.55 + g, y: 0.5 + g / 2, w: 0.45 - g, h: 0.5 - g / 2, slant: 0.03 },
      ];
    },
  },
  {
    id: 'neon-grid',
    label: 'Neon Grid',
    blurb: 'Four equal frames with a lettering band at the foot',
    panels(w, h) {
      const g = 0.012;
      const band = 0.15;
      const gh = 1 - band - g;
      return [
        { x: 0, y: 0, w: 0.5 - g / 2, h: gh / 2 - g / 2, slant: 0 },
        { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: gh / 2 - g / 2, slant: 0 },
        { x: 0, y: gh / 2 + g / 2, w: 0.5 - g / 2, h: gh / 2 - g / 2, slant: 0 },
        { x: 0.5 + g / 2, y: gh / 2 + g / 2, w: 0.5 - g / 2, h: gh / 2 - g / 2, slant: 0 },
      ];
    },
  },
];

export const GRADES = [
  {
    id: 'sunset',
    label: 'Sunset',
    top: 'rgba(255, 122, 61, 0)',
    bottom: 'rgba(214, 38, 120, 0.55)',
    glow: 'rgba(255, 176, 32, 0.20)',
    band: '#1c0b2e',
  },
  {
    id: 'neon',
    label: 'Neon',
    top: 'rgba(34, 211, 238, 0)',
    bottom: 'rgba(255, 45, 149, 0.55)',
    glow: 'rgba(34, 211, 238, 0.22)',
    band: '#0b1226',
  },
  {
    id: 'golden',
    label: 'Golden Hour',
    top: 'rgba(255, 190, 60, 0)',
    bottom: 'rgba(190, 60, 20, 0.55)',
    glow: 'rgba(255, 220, 120, 0.24)',
    band: '#241106',
  },
];

export const SIZES = [
  { id: 'square', label: '1080 × 1080 · Square', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350 · Portrait', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080 · Wide', w: 1920, h: 1080 },
];

const FONT = 'Anton, "Arial Black", sans-serif';

/** Polygon corners for a panel, applying its slant as a diagonal top edge. */
function panelCorners(p) {
  const s = p.slant * p.w;
  return [
    [p.x + s, p.y],
    [p.x + p.w, p.y],
    [p.x + p.w, p.y + p.h],
    [p.x, p.y + p.h],
  ];
}

function tracePolygon(ctx, corners, w, h) {
  ctx.beginPath();
  corners.forEach(([fx, fy], i) => {
    const px = fx * w;
    const py = fy * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

/** Draws one photo into one panel, cover-fit, with zoom and pan offsets. */
function drawPanelPhoto(ctx, panel, img, zoom, ox, oy, w, h) {
  const px = panel.x * w;
  const py = panel.y * h;
  const pw = panel.w * w;
  const ph = panel.h * h;
  const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
  const dw = img.naturalWidth * base * zoom;
  const dh = img.naturalHeight * base * zoom;
  // Clamp the pan so the photo never leaves a gap at the panel edge.
  const maxX = Math.max(0, (dw - pw) / 2);
  const maxY = Math.max(0, (dh - ph) / 2);
  const cx = px + pw / 2 + Math.max(-maxX, Math.min(maxX, ox * pw));
  const cy = py + ph / 2 + Math.max(-maxY, Math.min(maxY, oy * ph));
  ctx.save();
  tracePolygon(ctx, panelCorners(panel), w, h);
  ctx.clip();
  ctx.filter = 'saturate(1.28) contrast(1.07) brightness(1.02)';
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** Sunset/neon grade: warm wash, glow from the top corner, vignette. */
function gradePanel(ctx, panel, grade, w, h) {
  const px = panel.x * w;
  const py = panel.y * h;
  const pw = panel.w * w;
  const ph = panel.h * h;
  ctx.save();
  tracePolygon(ctx, panelCorners(panel), w, h);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, py, 0, py + ph);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(px, py, pw, ph);
  const glow = ctx.createLinearGradient(px, py, px + pw, py + ph);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(px, py, pw, ph);
  const vig = ctx.createRadialGradient(
    px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.35,
    px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.75,
  );
  vig.addColorStop(0, 'rgba(10, 4, 18, 0)');
  vig.addColorStop(1, 'rgba(10, 4, 18, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  // Thin neon rim around the frame.
  ctx.save();
  tracePolygon(ctx, panelCorners(panel), w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1, w * 0.0016);
  ctx.stroke();
  ctx.restore();
}

/** Fits a font size so `text` spans at most `maxWidth`. */
function fitFont(ctx, text, maxWidth, start) {
  let size = start;
  ctx.font = `${size}px ${FONT}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `${size}px ${FONT}`;
  }
  return size;
}

function drawTitle(ctx, state, w, h) {
  const text = (state.title || '').trim().toUpperCase();
  if (!text) return;
  const grade = state.grade;
  const bandH = h * 0.17;
  const bandY = h - bandH;
  // Dark scrim so the title reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.05, 0, h);
  scrim.addColorStop(0, 'rgba(12, 4, 22, 0)');
  scrim.addColorStop(0.45, 'rgba(12, 4, 22, 0.72)');
  scrim.addColorStop(1, 'rgba(12, 4, 22, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - h * 0.05, w, h * 0.22);
  // Neon rule above the title.
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(w * 0.05, bandY + h * 0.008, w * 0.16, Math.max(2, h * 0.004));
  ctx.fillStyle = '#ff2d95';
  ctx.fillRect(w * 0.05 + w * 0.16 + w * 0.01, bandY + h * 0.008, w * 0.07, Math.max(2, h * 0.004));

  ctx.save();
  ctx.translate(w / 2, h - h * 0.105);
  ctx.rotate(-0.022);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, text, w * 0.92, h * 0.115);
  ctx.font = `${size}px ${FONT}`;
  // Neon offset shadows: cyan one way, magenta the other.
  ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
  ctx.fillText(text, -size * 0.045, -size * 0.04);
  ctx.fillStyle = 'rgba(255, 45, 149, 0.85)';
  ctx.fillText(text, size * 0.045, size * 0.045);
  // Heavy black outline, then the face colour.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = state.titleColor || '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();

  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const subSize = Math.max(12, h * 0.022);
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, h * 0.004)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = subSize * 0.4;
    ctx.fillText(sub.toUpperCase(), w / 2, h - h * 0.018);
    ctx.restore();
  }
}

function drawTag(ctx, state, w, h) {
  const tag = (state.tag || '').trim();
  if (!tag) return;
  const size = Math.max(11, h * 0.02);
  ctx.save();
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, h * 0.003)}px`; } catch { /* older canvas */ }
  const tw = ctx.measureText(tag.toUpperCase()).width + size * 1.6;
  const x = w * 0.04;
  const y = h * 0.035;
  ctx.fillStyle = 'rgba(12, 4, 22, 0.72)';
  ctx.fillRect(x, y, tw, size * 1.9);
  ctx.fillStyle = '#ff5e8a';
  ctx.fillRect(x, y, size * 0.32, size * 1.9);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag.toUpperCase(), x + size * 0.7, y + size * 0.98);
  ctx.restore();
}

/**
 * Renders the whole poster onto `canvas` (its width/height are the export
 * size). `state` holds layout id, grade object, title/subtitle/tag,
 * titleColor, photos (Map id -> image) and panelSettings keyed by layout id.
 */
export function renderPoster(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const grade = state.grade || GRADES[0];
  const panels = layout.panels(w, h);
  const settings = state.panelSettings[state.layout] || [];

  // Poster board: deep plum, shows through as the gutters.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  panels.forEach((panel, i) => {
    const s = settings[i] || {};
    const img = s.photoId ? state.photos.get(s.photoId) : null;
    if (img) {
      drawPanelPhoto(ctx, panel, img, s.zoom || 1, s.ox || 0, s.oy || 0, w, h);
      gradePanel(ctx, panel, grade, w, h);
    } else {
      // Empty frame: plum placeholder with a dashed outline.
      ctx.save();
      tracePolygon(ctx, panelCorners(panel), w, h);
      ctx.fillStyle = '#241335';
      ctx.fill();
      ctx.setLineDash([w * 0.008, w * 0.008]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.stroke();
      ctx.restore();
    }
  });

  // Lettering band for the grid layout, then title + tag over everything.
  if (state.layout === 'neon-grid') {
    ctx.fillStyle = grade.band;
    ctx.fillRect(0, h * 0.85, w, h * 0.15);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(0, h * 0.85, w, Math.max(2, h * 0.004));
  }
  drawTitle(ctx, state, w, h);
  drawTag(ctx, state, w, h);
}

/** Which panel (index) contains point (x, y) in canvas pixels, or -1. */
export function panelAt(state, x, y, w, h) {
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const panels = layout.panels(w, h);
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const p = panels[i];
    if (x >= p.x * w && x <= (p.x + p.w) * w && y >= p.y * h && y <= (p.y + p.h) * h) return i;
  }
  return -1;
}

export function panelCount(layoutId) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0];
  return layout.panels(100, 100).length;
}

// Neon Cover Studio — page bootstrap.
// Builds the layout/grade/size pickers, wires the file input, the caption
// fields and the panel controls to the studio, and hands screenshot scenes
// to shots.js when the page carries a ?shot= query.

import { GRADES, LAYOUTS, SIZES } from './poster.js';
import { createStudio } from './editor.js';
import { driveShot } from './shots.js';

const $ = (id) => document.getElementById(id);

const studio = createStudio($('stage'), {
  onPhotoAdded(id, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.setAttribute('aria-pressed', 'false');
    button.title = label;
    const img = studio.state.photos.get(id);
    // Thumbnail from the loaded image itself (a file's object URL is revoked
    // after load, so draw it into a small canvas instead of reusing the URL).
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 128;
    thumbCanvas.height = 128;
    const tctx = thumbCanvas.getContext('2d');
    const scale = Math.max(128 / img.naturalWidth, 128 / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    tctx.drawImage(img, (128 - dw) / 2, (128 - dh) / 2, dw, dh);
    const preview = document.createElement('img');
    preview.alt = label;
    preview.src = thumbCanvas.toDataURL('image/jpeg', 0.85);
    button.appendChild(preview);
    button.addEventListener('click', () => {
      studio.setPhotoForPanel(studio.state.selectedPanel, id);
      syncThumbs();
    });
    $('thumbs').appendChild(button);
    syncThumbs();
  },
  onRedraw(state) {
    syncPicker('layoutRow', LAYOUTS, state.layout);
    syncPicker('gradeRow', GRADES, state.grade.id);
    syncPicker('sizeRow', SIZES, state.size.id);
    const count = state.panelSettings[state.layout].length;
    $('panelName').textContent = `Panel ${state.selectedPanel + 1} of ${count} · ${state.layout}`;
    const current = state.panelSettings[state.layout][state.selectedPanel];
    if (current) $('zoomRange').value = String(current.zoom);
  },
  onExported(w, h) {
    $('status').textContent = `Saved neon-cover-${w}x${h}.png`;
  },
});

function syncPicker(rowId, items, activeId) {
  document.querySelectorAll(`#${rowId} button`).forEach((b, i) => {
    b.setAttribute('aria-pressed', String(items[i].id === activeId));
  });
}

function syncThumbs() {
  const selected = studio.state.selectedPhotoId;
  document.querySelectorAll('.thumb').forEach((button, i) => {
    const id = [...studio.state.photos.keys()][i];
    button.setAttribute('aria-pressed', String(id === selected));
  });
}

function picker(container, items, activeId, onPick) {
  const box = $(container);
  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.title = item.blurb || item.label;
    button.setAttribute('aria-pressed', String(item.id === activeId));
    button.addEventListener('click', () => {
      onPick(item.id);
      box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
    });
    box.appendChild(button);
  });
}

picker('layoutRow', LAYOUTS, studio.state.layout, (id) => studio.setLayout(id));
picker('gradeRow', GRADES, studio.state.grade.id, (id) => studio.setGrade(id));
picker('sizeRow', SIZES, studio.state.size.id, (id) => studio.setSize(id));

$('photoFiles').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    try {
      await studio.addPhotoFile(file);
    } catch {
      $('status').textContent = `Could not read ${file.name}`;
    }
  }
  if (files.length) $('status').textContent = `${files.length} photo${files.length > 1 ? 's' : ''} loaded — click a thumbnail to place one.`;
  e.target.value = '';
});
$('samplePier').addEventListener('click', async () => {
  const id = await studio.addSample('pier');
  studio.setPhotoForPanel(studio.state.selectedPanel, id);
});
$('sampleBlvd').addEventListener('click', async () => {
  const id = await studio.addSample('boulevard');
  studio.setPhotoForPanel(studio.state.selectedPanel, id);
});
$('fillAll').addEventListener('click', () => {
  if (!studio.state.selectedPhotoId) {
    $('status').textContent = 'Load or pick a photo first, then fill all panels with it.';
    return;
  }
  studio.fillAllPanels(studio.state.selectedPhotoId);
  $('status').textContent = 'Every panel now shows the selected photo.';
});
$('zoomRange').addEventListener('input', (e) => studio.setZoom(Number(e.target.value)));
$('zoomIn').addEventListener('click', () => {
  const s = studio.state.panelSettings[studio.state.layout][studio.state.selectedPanel];
  studio.setZoom((s?.zoom || 1) * 1.15);
});
$('zoomOut').addEventListener('click', () => {
  const s = studio.state.panelSettings[studio.state.layout][studio.state.selectedPanel];
  studio.setZoom((s?.zoom || 1) / 1.15);
});
$('recenter').addEventListener('click', () => studio.recenterSelected());
$('titleInput').addEventListener('input', (e) => studio.setCaption({ title: e.target.value }));
$('subtitleInput').addEventListener('input', (e) => studio.setCaption({ subtitle: e.target.value }));
$('tagInput').addEventListener('input', (e) => studio.setCaption({ tag: e.target.value }));
$('titleColor').addEventListener('input', (e) => studio.setCaption({ titleColor: e.target.value }));
$('exportBtn').addEventListener('click', () => studio.downloadExport());

// Preload the two bundled samples so the first click is instant.
studio.addSample('pier').catch(() => {});
studio.addSample('boulevard').catch(() => {});

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  driveShot(studio, query).catch(() => { window.__shotReady = true; });
}

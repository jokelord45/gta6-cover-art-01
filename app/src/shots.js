// Fixed scenes for screenshots: ?shot=cover draws the poster alone at the
// export size; ?shot=editor shows the workbench with a sample photo loaded.
// `photo` picks a sample (pier/boulevard), `caption` the title, `layout`,
// `grade` and `size` pick the poster setup. window.__shotReady is set once
// the scene is painted, and window.__exportPNG renders the current poster at
// any exact size for headless export.

import { renderPoster } from './poster.js';

export async function driveShot(studio, query) {
  const shot = query.get('shot') || 'editor';
  const layout = query.get('layout');
  const grade = query.get('grade');
  const size = query.get('size');
  if (layout) studio.setLayout(layout);
  if (grade) studio.setGrade(grade);
  if (size) studio.setSize(size);

  const caption = query.get('caption');
  const subtitle = query.get('subtitle');
  const tag = query.get('tag');
  studio.setCaption({
    ...(caption !== null ? { title: caption } : {}),
    ...(subtitle !== null ? { subtitle } : {}),
    ...(tag !== null ? { tag } : {}),
  });

  const photo = query.get('photo') || 'pier';
  try {
    const id = await studio.addSample(photo);
    studio.fillAllPanels(id);
  } catch {
    // Sample missing: paint the empty frames rather than failing the shot.
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');

  window.__exportPNG = (w, h) => studio.exportPNGDataUrl(w, h);
  window.__studio = studio;
  await document.fonts.ready;
  studio.redraw();

  if (shot === 'cover') {
    // Crisp full-window render at the viewport's own pixels.
    const stage = document.getElementById('stage');
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    renderPoster(stage, studio.state);
  }

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

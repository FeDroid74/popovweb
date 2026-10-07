// Decorative feedback only: the browser keeps control of scrolling and form input.
export function initMagicCard(card) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = 'input, textarea, select, button, a, label, [role="button"], [role="checkbox"], [role="combobox"], [contenteditable]';
  let gesture = null;
  let point = null;
  let frame = 0;
  let clearTimer;

  function reset() {
    clearTimeout(clearTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    point = null;
    gesture = null;
    card.removeAttribute('data-magic-active');
  }

  function paint() {
    frame = 0;
    if (!point || reduced.matches) return;
    const rect = card.getBoundingClientRect();
    const x = point.x - rect.left;
    const y = point.y - rect.top;
    // A scrolling form can move out from under the finger. Do not leave a stuck glow.
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      card.removeAttribute('data-magic-active');
      return;
    }
    card.style.setProperty('--magic-x', `${x}px`);
    card.style.setProperty('--magic-y', `${y}px`);
    card.dataset.magicActive = '';
  }

  function move(event) {
    if (reduced.matches) return;
    clearTimeout(clearTimer);
    point = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(paint);
  }

  card.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') move(event);
  }, { passive: true });
  card.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch') reset();
  });

  card.addEventListener('touchstart', event => {
    reset();
    if (reduced.matches || event.touches.length !== 1 || event.target.closest(controls)) return;
    const touch = event.touches[0];
    gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, moving: false };
  }, { passive: true });

  // Touch events continue during native page scrolling, unlike cancelled pointer events.
  card.addEventListener('touchmove', event => {
    if (!gesture) return;
    if (event.touches.length !== 1) { reset(); return; }
    const touch = [...event.touches].find(item => item.identifier === gesture.id);
    if (!touch) { reset(); return; }
    gesture.moving ||= Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) >= 10;
    if (gesture.moving) move(touch);
  }, { passive: true });
  card.addEventListener('touchend', () => {
    gesture = null;
    clearTimer = setTimeout(reset, 350);
  }, { passive: true });
  card.addEventListener('touchcancel', reset, { passive: true });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reduced.addEventListener('change', reset);
}

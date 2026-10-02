// SVG grid with softly appearing random cells, adapted from Magic UI's
// Animated Grid Pattern: https://magicui.design/docs/components/animated-grid-pattern
const host = document.querySelector('.hero-grid');
const ns = 'http://www.w3.org/2000/svg';
const cell = 48;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let width = 0, height = 0, visible = false;
const make = (tag, attrs = {}) => {
  const element = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};
const svg = make('svg', { 'aria-hidden': 'true', focusable: 'false' });
const defs = make('defs');
const pattern = make('pattern', { id: 'hero-grid-pattern', width: cell, height: cell, patternUnits: 'userSpaceOnUse' });
pattern.append(make('path', { d: `M ${cell} 0 H 0 V ${cell}`, class: 'hero-grid-lines' }));
defs.append(pattern);
svg.append(defs, make('rect', { width: '100%', height: '100%', fill: 'url(#hero-grid-pattern)' }));
const squares = Array.from({ length: 28 }, () => {
  const rect = make('rect', { width: cell - 1, height: cell - 1, class: 'hero-grid-square' });
  svg.append(rect);
  return { rect, animation: null };
});
host.append(svg);
function place(square) {
  square.rect.setAttribute('x', Math.floor(Math.random() * Math.ceil(width / cell)) * cell + 1);
  square.rect.setAttribute('y', Math.floor(Math.random() * Math.ceil(height / cell)) * cell + 1);
}
function animate(square, first = false) {
  place(square);
  square.animation = square.rect.animate([
    { opacity: 0, offset: 0 }, { opacity: .22, offset: .45 },
    { opacity: 0, offset: .85 }, { opacity: 0, offset: 1 }
  ], { duration: 3600 + Math.random() * 1800, delay: first ? Math.random() * 2600 : 0, easing: 'ease-in-out' });
  square.animation.onfinish = () => { if (visible && !document.hidden && !reduced.matches) animate(square); };
}
function sync() {
  const running = visible && !document.hidden && !reduced.matches && width > 0;
  squares.forEach(square => {
    if (reduced.matches) { square.animation?.cancel(); square.animation = null; }
    else if (running) {
      if (!square.animation || square.animation.playState === 'finished') animate(square, true);
      else square.animation.play();
    } else square.animation?.pause();
  });
}
new ResizeObserver(([entry]) => {
  width = entry.contentRect.width; height = entry.contentRect.height;
  squares.forEach(square => { square.animation?.cancel(); square.animation = null; });
  sync();
}).observe(host);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(host);
document.addEventListener('visibilitychange', sync);
reduced.addEventListener('change', sync);

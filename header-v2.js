// A single persistent header keeps focus, the mobile menu and globe intact.
const header = document.querySelector('.site-header');
let floating = false;
let frame = 0;

function updateHeader() {
  frame = 0;
  const next = window.scrollY > (floating ? 16 : 48);
  if (next === floating) return;
  floating = next;
  header.classList.toggle('is-floating', floating);
}
function queueHeader() {
  if (!frame) frame = requestAnimationFrame(updateHeader);
}
addEventListener('scroll', queueHeader, { passive: true });
addEventListener('pageshow', queueHeader);
updateHeader();

// The fill starts at the entry edge and retracts toward the actual exit edge.
const cta = document.querySelector('[data-edge-fill]');
const fill = cta.querySelector('.nav-cta-fill');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let fillAnimation, phase = 'idle', pointerInside = false;
function edgePoint(event) {
  const rect = cta.getBoundingClientRect();
  let x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  let y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  const distances = [x, rect.width - x, y, rect.height - y];
  const side = distances.indexOf(Math.min(...distances));
  if (side === 0) x = 0;
  if (side === 1) x = rect.width;
  if (side === 2) y = 0;
  if (side === 3) y = rect.height;
  return { x, y, radius: Math.hypot(rect.width, rect.height) + 2 };
}
function paint(entering, point, instant = false) {
  const circle = radius => `circle(${radius}px at ${point.x}px ${point.y}px)`;
  const current = getComputedStyle(fill).clipPath;
  const from = phase === 'idle' ? circle(0) : phase === 'full' ? circle(point.radius) : current;
  const to = circle(entering ? point.radius : 0);
  fillAnimation?.cancel();
  fill.style.clipPath = to;
  cta.dataset.filled = String(entering);
  phase = entering ? 'entering' : 'leaving';
  if (instant || reducedMotion.matches) { phase = entering ? 'full' : 'idle'; return; }
  fillAnimation = fill.animate([{ clipPath: from }, { clipPath: to }], { duration: entering ? 340 : 280, easing: 'cubic-bezier(.22,1,.36,1)' });
  fillAnimation.onfinish = () => { phase = entering ? 'full' : 'idle'; };
}
cta.addEventListener('pointerenter', event => {
  if (event.pointerType === 'touch') return;
  pointerInside = true;
  paint(true, edgePoint(event));
});
cta.addEventListener('pointerleave', event => {
  pointerInside = false;
  if (!cta.matches(':focus-visible')) paint(false, edgePoint(event));
});
const center = () => ({ x: cta.clientWidth / 2, y: cta.clientHeight / 2, radius: Math.hypot(cta.clientWidth, cta.clientHeight) + 2 });
cta.addEventListener('focus', () => { if (cta.matches(':focus-visible')) paint(true, center(), true); });
cta.addEventListener('blur', () => { if (!pointerInside) paint(false, center(), true); });
reducedMotion.addEventListener('change', () => paint(pointerInside || cta.matches(':focus-visible'), center(), true));

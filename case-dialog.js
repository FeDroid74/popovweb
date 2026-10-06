const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let current = null;
let opener = null;
let closing = false;
let unlock = null;
let outsidePress = false;

function lockPage() {
  const y = scrollY;
  const gutter = innerWidth - root.clientWidth;
  const body = document.body;
  const header = document.querySelector('.site-header');
  const saved = [];
  const set = (element, name, value) => {
    saved.push([element, name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
    element.style.setProperty(name, value);
  };
  // Preserve the fixed header geometry, including fractional pixels at zoom.
  if (header) {
    const box = header.getBoundingClientRect();
    const style = getComputedStyle(header);
    set(header, 'padding-left', style.paddingLeft);
    set(header, 'padding-right', style.paddingRight);
    set(header, 'width', `${box.width}px`);
    set(header, 'left', `${box.left}px`);
    set(header, 'transform', 'none');
    set(header, 'transition', 'none');
  }
  set(body, 'padding-right', `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`);
  set(root, 'overflow', 'hidden');
  return () => {
    for (const [element, name, value, priority] of saved.reverse()) {
      if (value) element.style.setProperty(name, value, priority);
      else element.style.removeProperty(name);
    }
    window.scrollTo({ top: y, behavior: 'instant' });
  };
}
function openCase(trigger) {
  if (current) return;
  const dialog = document.getElementById(trigger.getAttribute('aria-controls'));
  if (!(dialog instanceof HTMLDialogElement)) return;
  opener = trigger;
  current = dialog;
  outsidePress = false;
  unlock = lockPage();
  dialog.showModal();
  dialog.querySelector('.case-mockup-scroll').scrollTop = 0;
  dialog.scrollTop = 0;
  dialog.querySelector('[data-case-heading]').focus({ preventScroll: true });
}
async function closeCase() {
  if (!current || closing) return;
  closing = true;
  const dialog = current;
  if (!reduced.matches) {
    dialog.classList.add('case-dialog-closing');
    await Promise.allSettled(dialog.getAnimations().map(animation => animation.finished));
  }
  dialog.close();
}
document.querySelectorAll('[data-case-open]').forEach(trigger => {
  trigger.addEventListener('click', () => openCase(trigger));
});
document.querySelectorAll('.case-dialog').forEach(dialog => {
  dialog.querySelector('[data-case-close]').addEventListener('click', closeCase);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeCase(); });
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  dialog.addEventListener('pointerdown', event => { outsidePress = outside(event); });
  dialog.addEventListener('click', event => { if (outsidePress && outside(event)) closeCase(); outsidePress = false; });
  dialog.addEventListener('close', () => {
    dialog.classList.remove('case-dialog-closing');
    unlock?.();
    unlock = null;
    current = null;
    closing = false;
    opener?.focus({ preventScroll: true });
    opener = null;
  });
});

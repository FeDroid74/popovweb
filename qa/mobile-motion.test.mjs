import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initMagicCard } from '../magic-card.js';

function fixture(t) {
  const values = new Map();
  const listeners = new Map();
  const frames = new Map();
  let frameId = 0;
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const card = Object.assign(new EventTarget(), {
    dataset: {},
    style: { setProperty: (name, value) => values.set(name, value) },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 600 }),
    removeAttribute: () => { delete card.dataset.magicActive; },
    closest: () => null,
  });
  const addListener = card.addEventListener.bind(card);
  card.addEventListener = (name, handler, options) => {
    listeners.set(name, options);
    addListener(name, handler, options);
  };
  const environment = {
    window: new EventTarget(), document: new EventTarget(), matchMedia: () => reduced,
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  const originals = Object.fromEntries(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, environment);
  t.after(() => {
    environment.window.dispatchEvent(new Event('blur'));
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  initMagicCard(card);
  const touch = (x, y, id = 1) => ({ clientX: x, clientY: y, identifier: id });
  const send = (type, touches = [], target = card, extra = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, Object.fromEntries(Object.entries({ touches, target, ...extra }).map(([key, value]) => [key, { value }])));
    card.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, `${type} must leave the native gesture alone`);
  };
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); };
  return { card, values, listeners, frames, reduced, touch, send, flush,
    active: () => 'magicActive' in card.dataset };
}

test('a tap and small finger jitter do not activate the form glow', t => {
  const f = fixture(t);
  f.send('touchstart', [f.touch(100, 150)]);
  f.send('touchmove', [f.touch(103, 153)]);
  f.flush();
  assert.equal(f.active(), false);
  f.send('touchend');
  f.flush();
  assert.equal(f.active(), false);
});

test('dragging follows the finger without cancelling native scrolling', t => {
  const f = fixture(t);
  f.send('touchstart', [f.touch(100, 150)]);
  f.send('touchmove', [f.touch(120, 160)]);
  f.send('touchmove', [f.touch(150, 175)]);
  assert.equal(f.frames.size, 1, 'rapid touch events share a single paint');
  f.flush();
  assert.equal(f.active(), true);
  assert.equal(f.values.get('--magic-x'), '140px');
  assert.equal(f.values.get('--magic-y'), '155px');
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) assert.equal(f.listeners.get(type).passive, true);
});

test('gestures starting on form controls remain reserved for input', t => {
  const f = fixture(t);
  for (const selector of ['input', 'textarea', 'label', 'button', 'a', '[role="checkbox"]', '[role="combobox"]']) {
    const control = { closest: selectors => selectors.split(', ').includes(selector) ? control : null };
    f.send('touchstart', [f.touch(100, 150)], control);
    f.send('touchmove', [f.touch(170, 180)], control);
    f.flush();
    assert.equal(f.active(), false, selector);
  }
});

test('multi-touch and cancellation clear feedback without blocking pinch zoom', t => {
  const f = fixture(t);
  f.send('touchstart', [f.touch(100, 150)]);
  f.send('touchmove', [f.touch(150, 170)]);
  f.flush();
  assert.equal(f.active(), true);
  f.send('touchmove', [f.touch(160, 170), f.touch(250, 250, 2)]);
  assert.equal(f.active(), false);
  f.send('touchmove', [f.touch(180, 190)]);
  f.flush();
  assert.equal(f.active(), false, 'a pinch must not turn into a drag mid-gesture');
  f.send('touchstart', [f.touch(100, 150)]);
  f.send('touchmove', [f.touch(150, 170)]);
  f.send('touchcancel');
  f.flush();
  assert.equal(f.active(), false);
});

test('leaving the form and lifting the finger do not leave a stuck glow', async t => {
  const f = fixture(t);
  f.send('touchstart', [f.touch(100, 150)]);
  f.send('touchmove', [f.touch(150, 170)]);
  f.flush();
  f.send('touchmove', [f.touch(400, 170)]);
  f.flush();
  assert.equal(f.active(), false);
  f.send('touchmove', [f.touch(180, 180)]);
  f.flush();
  assert.equal(f.active(), true);
  f.send('touchend');
  await new Promise(resolve => setTimeout(resolve, 380));
  assert.equal(f.active(), false);
});

test('desktop hover still works and reduced motion suppresses all feedback', t => {
  const f = fixture(t);
  f.send('pointermove', [], f.card, { pointerType: 'mouse', clientX: 100, clientY: 150 });
  f.flush();
  assert.equal(f.active(), true);
  f.reduced.matches = true;
  f.reduced.dispatchEvent(new Event('change'));
  assert.equal(f.active(), false);
  f.send('pointermove', [], f.card, { pointerType: 'mouse', clientX: 120, clientY: 170 });
  f.send('touchstart', [f.touch(100, 150)]);
  f.send('touchmove', [f.touch(150, 170)]);
  f.flush();
  assert.equal(f.active(), false);
});

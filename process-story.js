const section = document.querySelector('#process-story');

if (section) {
  const root = document.documentElement;
  const pin = section.querySelector('.journey-pin');
  const stage = section.querySelector('.journey-stage');
  const call = section.querySelector('.journey-call');
  const documentWindow = section.querySelector('.journey-document');
  const website = section.querySelector('.journey-web');
  const designPieces = [...section.querySelector('.journey-designed-layer').children];
  const published = section.querySelector('.journey-published');
  const buttons = [...section.querySelectorAll('[data-journey-step]')];
  const prev = section.querySelector('[data-journey-prev]');
  const next = section.querySelector('[data-journey-next]');
  const position = section.querySelector('.journey-position');
  const bar = section.querySelector('.journey-progress i');
  const rows = [...section.querySelectorAll('[data-doc-row]')];
  const typedLines = [...section.querySelectorAll('[data-type-line]')];
  const wirePieces = [...section.querySelectorAll('[data-wire-piece]')];
  const docComplete = [...section.querySelectorAll('.journey-doc-saved,.journey-paper-end')];
  const links = [...section.querySelectorAll('.journey-connector path')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1000px) and (min-height: 720px)');
  const mobile = matchMedia('(max-width: 999px) and (min-height: 560px)');
  const targets = [0, .33, .70, 1];
  const clamp = n => Math.max(0, Math.min(1, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const phase = (a, b, p) => ease(clamp((p - a) / (b - a)));
  let current = 0;
  let active = -1;
  let scrollMode = false;
  let scrollFrame = 0;
  let manualFrame = 0;
  let typingFrame = 0;
  let typingStarted = null;
  let lastScrollTime = 0;
  let skipSmoothing = true;
  let requested = null;
  let width = 1;
  let height = 1;
  const sizes = new Map();
  const placement = new Map();
  let lang = root.lang === 'ru' ? 'ru' : 'en';

  function object(element, x, y, scale, rotation, opacity) {
    // Fit the rotated object, not just its untransformed box. No clipped entrances.
    const size = sizes.get(element) || { width: 1, height: 1 };
    const radians = rotation * Math.PI / 180;
    const rotatedWidth = Math.abs(Math.cos(radians)) * size.width + Math.abs(Math.sin(radians)) * size.height;
    const rotatedHeight = Math.abs(Math.sin(radians)) * size.width + Math.abs(Math.cos(radians)) * size.height;
    scale = Math.min(scale, (width - 32) / rotatedWidth, (height - 100) / rotatedHeight);
    const halfWidth = rotatedWidth * scale / 2;
    const halfHeight = rotatedHeight * scale / 2;
    const cx = Math.max(16 + halfWidth, Math.min(width - 16 - halfWidth, width * (.5 + x)));
    const cy = Math.max(42 + halfHeight, Math.min(height - 58 - halfHeight, height * (.48 + y)));
    placement.set(element, { cx, cy, halfWidth, halfHeight });
    element.style.transform = `translate(-50%,-50%) translate3d(${cx - width * .5}px,${cy - height * .48}px,0) scale(${scale}) rotate(${rotation}deg)`;
    element.style.opacity = String(opacity);
    element.style.visibility = opacity > .001 ? 'visible' : 'hidden';
  }

  function typeBrief(now, instant = false) {
    cancelAnimationFrame(typingFrame);
    typingFrame = 0;
    if (current < .12) typingStarted = null;
    if (current >= .205 && typingStarted === null) typingStarted = now;
    if ((instant || current >= .39) && typingStarted !== null) typingStarted = now - 500;
    const elapsed = typingStarted === null ? -1 : now - typingStarted;
    rows.forEach((row, i) => {
      const progress = elapsed < 0 ? 0 : clamp((elapsed - i * 90) / 230);
      row.style.opacity = String(clamp(progress * 4));
      const fullText = typedLines[i].dataset[lang];
      const text = fullText.slice(0, Math.ceil(fullText.length * progress));
      if (typedLines[i].textContent !== text) typedLines[i].textContent = text;
    });
    docComplete.forEach(element => { element.style.opacity = String(clamp((elapsed - 410) / 90)); });
    if (elapsed >= 0 && elapsed < 500 && current < .39 && !reduced.matches) typingFrame = requestAnimationFrame(typeBrief);
  }

  function selectCopy(index) {
    if (index === active) return;
    active = index;
    buttons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    prev.disabled = index === 0;
    next.disabled = index === 3;
    position.textContent = `${String(index + 1).padStart(2, '0')} / 04`;
    const title = buttons[index].querySelector('strong').textContent;
    stage.setAttribute('aria-label', `${title}. ${buttons[index].querySelector('.journey-step-description').textContent}`);
  }

  function updateControls() {
    const destination = requested ?? active;
    prev.disabled = destination === 0;
    next.disabled = destination === 3;
  }

  function render(progress) {
    current = clamp(progress);
    const p = current;
    const compact = width < 520;
    const briefArrives = phase(.12, .28, p);
    const callLeaves = compact ? phase(.23, .32, p) : phase(.37, .48, p);
    const wireArrives = phase(.39, .55, p);
    const briefLeaves = phase(.58, .70, p);
    const wireExpands = phase(.56, .72, p);
    const finish = phase(.92, .98, p);

    object(call, lerp(-.015, -.30, briefArrives) - callLeaves * .08, lerp(0, compact ? -.04 : -.015, briefArrives), lerp(1, compact ? .53 : .73, briefArrives), lerp(-2, -5, briefArrives), 1 - callLeaves);
    object(documentWindow, lerp(.36, compact ? .02 : .18, briefArrives) - wireArrives * (compact ? .29 : .47) - briefLeaves * .12, .015, lerp(compact ? .92 : .97, compact ? .55 : .70, wireArrives), lerp(3, -4, wireArrives), phase(.15, .25, p) * (1 - briefLeaves));
    object(website, lerp(.30, compact ? .16 : .19, wireArrives) * (1 - wireExpands), lerp(.02, -.012, wireExpands), lerp(compact ? .58 : .60, 1, wireExpands), lerp(3, 0, wireExpands), phase(.40, .49, p));

    // A short typing burst finishes even when the visitor stops scrolling.
    typeBrief(performance.now(), reduced.matches);
    wirePieces.forEach((piece, i) => {
      const reveal = phase(.43 + i * .035, .49 + i * .035, p);
      const designStart = .74 + i * .027;
      const resolve = phase(designStart, designStart + .08, p);
      piece.style.opacity = String(reveal * (1 - phase(designStart, designStart + .045, p)));
      piece.style.transform = `translateY(${(1 - reveal) * 10}px)`;
      designPieces[i].style.opacity = String(resolve);
      designPieces[i].style.transform = `translateY(${(1 - resolve) * 5}px)`;
    });
    published.style.opacity = String(finish);
    published.style.visibility = finish > 0 ? 'visible' : 'hidden';
    published.style.transform = `translate(-50%,${(1 - finish) * 13}px)`;
    links.forEach((link, i) => {
      const start = i === 0 ? .15 : .405;
      const end = i === 0 ? .37 : .58;
      const visible = phase(start, start + .06, p) * (1 - phase(end, end + .05, p));
      const from = placement.get(i === 0 ? call : documentWindow);
      const to = placement.get(i === 0 ? documentWindow : website);
      const x1 = from.cx + from.halfWidth * .85;
      const x2 = to.cx - to.halfWidth * .85;
      const y1 = from.cy - from.halfHeight * .3;
      const y2 = to.cy - to.halfHeight * .15;
      link.setAttribute('d', `M${x1} ${y1}C${lerp(x1,x2,.3)} ${Math.min(y1,y2)-40} ${lerp(x1,x2,.7)} ${Math.min(y1,y2)-40} ${x2} ${y2}`);
      link.style.opacity = String(visible * .5 * clamp((x2 - x1) / 40));
      link.style.strokeDashoffset = String(1 - phase(start, start + .1, p));
    });
    stage.classList.toggle('is-call-visible', p < .43);
    bar.style.transform = `scaleX(${.03 + p * .97})`;
    selectCopy(p < .22 ? 0 : p < .46 ? 1 : p < .76 ? 2 : 3);
    updateControls();
  }

  function metrics() {
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    return { top, travel: Math.max(1, section.offsetHeight - pin.offsetHeight), bounds: section.getBoundingClientRect() };
  }

  function renderScroll(now) {
    scrollFrame = 0;
    if (!scrollMode) return;
    const { top, travel, bounds } = metrics();
    const target = clamp((top - bounds.top) / travel);
    const delta = Math.min(64, now - (lastScrollTime || now - 16));
    lastScrollTime = now;
    const immediate = skipSmoothing || bounds.bottom < top || bounds.top > innerHeight;
    skipSmoothing = false;
    const value = immediate ? target : lerp(current, target, 1 - Math.exp(-delta / 75));
    render(Math.abs(target - value) < .00015 ? target : value);
    if (Math.abs(target - current) > .00015) scrollFrame = requestAnimationFrame(renderScroll);
    else {
      lastScrollTime = 0;
      if (requested !== null && Math.abs(current - targets[requested]) < .001) requested = null;
      updateControls();
    }
  }

  function schedule() {
    if (scrollMode && !scrollFrame) scrollFrame = requestAnimationFrame(renderScroll);
  }

  function go(index, keyboard = false) {
    index = Math.max(0, Math.min(3, index));
    cancelAnimationFrame(manualFrame);
    requested = index;
    updateControls();
    if (scrollMode) {
      skipSmoothing = keyboard;
      const { top, travel, bounds } = metrics();
      window.scrollTo({ top: scrollY + bounds.top - top + travel * targets[index], behavior: keyboard ? 'instant' : 'smooth' });
      if (keyboard) { render(targets[index]); typeBrief(performance.now(), true); requested = null; }
      return;
    }
    if (reduced.matches || keyboard) { render(targets[index]); typeBrief(performance.now(), true); requested = null; return; }
    const from = current;
    const to = targets[index];
    const started = performance.now();
    // A full scene handover needs time for the source and its result to coexist.
    const duration = Math.abs(to - from) > .5 ? 1200 : 820;
    const tick = now => {
      const t = clamp((now - started) / duration);
      render(lerp(from, to, ease(t)));
      if (t < 1) manualFrame = requestAnimationFrame(tick);
      else requested = null;
    };
    manualFrame = requestAnimationFrame(tick);
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', event => go(index, event.detail === 0));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : Math.max(0, Math.min(3, index + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1)));
      buttons[nextIndex].focus({ preventScroll: true });
      go(nextIndex, true);
    });
  });
  prev.addEventListener('click', event => go((requested ?? active) - 1, event.detail === 0));
  next.addEventListener('click', event => go((requested ?? active) + 1, event.detail === 0));

  function measure() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    [call, documentWindow, website].forEach(element => sizes.set(element, { width: element.offsetWidth, height: element.offsetHeight }));
    section.querySelector('.journey-connector').setAttribute('viewBox', `0 0 ${width} ${height}`);
    if (scrollMode) schedule();
    else render(current);
  }

  function configure() {
    cancelAnimationFrame(manualFrame);
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    requested = null;
    skipSmoothing = true;
    scrollMode = (desktop.matches || mobile.matches) && !reduced.matches;
    section.classList.toggle('is-scroll-story', scrollMode);
    if (reduced.matches) current = targets[Math.max(0, active)];
    measure();
  }

  function translate() {
    lang = root.lang === 'ru' ? 'ru' : 'en';
    section.querySelectorAll('[data-ru]').forEach(element => { element.textContent = element.dataset[lang]; });
    section.querySelector('.journey-steps').setAttribute('aria-label', lang === 'ru' ? 'Этапы работы' : 'Project stages');
    prev.setAttribute('aria-label', lang === 'ru' ? 'Предыдущий этап' : 'Previous stage');
    next.setAttribute('aria-label', lang === 'ru' ? 'Следующий этап' : 'Next stage');
    active = -1;
    measure();
    selectCopy(current < .22 ? 0 : current < .46 ? 1 : current < .76 ? 2 : 3);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  // Native scrolling cancels only the requested button destination, never the scroll itself.
  const releaseDestination = () => { requested = null; updateControls(); };
  window.addEventListener('wheel', releaseDestination, { passive: true });
  window.addEventListener('touchstart', releaseDestination, { passive: true });
  window.addEventListener('pageshow', () => { skipSmoothing = true; schedule(); });
  desktop.addEventListener('change', configure);
  mobile.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  root.addEventListener('popovweb:language', translate);
  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(([entry]) => section.classList.toggle('is-in-view', entry.isIntersecting)).observe(pin);
  translate();
  configure();
  document.fonts.ready.then(measure);
}

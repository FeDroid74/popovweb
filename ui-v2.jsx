import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as Select from '@radix-ui/react-select';
import * as Tooltip from '@radix-ui/react-tooltip';

function OrbitTooltip({ host, name, src }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const touch = useRef(false);
  useLayoutEffect(() => {
    host.toggleAttribute('data-orbit-interacting', open || hovered || keyboardFocus);
    host.dispatchEvent(new Event('popovweb:orbit-interaction', { bubbles: true }));
  }, [host, open, hovered, keyboardFocus]);
  useEffect(() => {
    const reset = () => { setOpen(false); setHovered(false); setKeyboardFocus(false); };
    window.addEventListener('blur', reset);
    return () => window.removeEventListener('blur', reset);
  }, []);
  return <Tooltip.Provider delayDuration={120}>
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger className="orbit-tool-trigger" aria-label={name}
        onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={event => { touch.current = event.pointerType === 'touch'; if (touch.current) event.preventDefault(); }}
        onFocus={event => { if (!touch.current && event.currentTarget.matches(':focus-visible')) setKeyboardFocus(true); }}
        onBlur={() => setKeyboardFocus(false)}
        onClick={event => { event.preventDefault(); if (touch.current) setOpen(value => !value); else setOpen(true); }}>
        <img src={src} alt="" width="24" height="24" draggable="false" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="orbit-tooltip" sideOffset={9} collisionPadding={12}>
          {name}<Tooltip.Arrow className="orbit-tooltip-arrow" width={10} height={5} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>;
}

function enhanceOrbits() {
  document.querySelectorAll('.orbit-stage[data-orbit-filter] .orbit-node:not([data-tooltip-ready])').forEach(host => {
    const name = host.querySelector('.orbit-node-label').textContent;
    const src = host.querySelector('img').getAttribute('src');
    host.dataset.tooltipReady = '';
    flushSync(() => createRoot(host).render(<OrbitTooltip host={host} name={name} src={src} />));
  });
}
enhanceOrbits();
// app.js builds the orbit nodes; handle either module's loading order.
const orbitRoot = document.querySelector('.orbit-nodes');
if (orbitRoot) new MutationObserver(enhanceOrbits).observe(orbitRoot, { childList: true });

function SiteSelect({ nativeSelect, triggerId, options, label }) {
  const [value, setValue] = useState(nativeSelect.value);
  const [, updateLanguage] = useState(0);
  useEffect(() => {
    const sync = () => setValue(nativeSelect.value);
    const language = () => updateLanguage(n => n + 1);
    nativeSelect.addEventListener('change', sync);
    document.documentElement.addEventListener('popovweb:language', language);
    return () => {
      nativeSelect.removeEventListener('change', sync);
      document.documentElement.removeEventListener('popovweb:language', language);
    };
  }, [nativeSelect]);
  return <Select.Root value={value} disabled={nativeSelect.disabled} onOpenChange={open => {
    document.documentElement.dispatchEvent(new CustomEvent('popovweb:select-open', { detail: open }));
  }} onValueChange={next => {
    setValue(next);
    nativeSelect.value = next;
    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }}>
    <Select.Trigger id={triggerId} className="site-select-trigger" aria-label={label?.textContent || nativeSelect.getAttribute('aria-label')}>
      <Select.Value />
      <Select.Icon className="site-select-chevron"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="site-select-content" position="popper" sideOffset={8} align="end" collisionPadding={16}>
        <Select.Viewport className="site-select-viewport">
          {options.map(option => <Select.Item key={option.value} value={option.value} disabled={option.disabled} className="site-select-item">
            <Select.ItemText>{option.text}</Select.ItemText>
            <Select.ItemIndicator className="site-select-check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></Select.ItemIndicator>
          </Select.Item>)}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>;
}

// Keep native form values and the existing validation; enhance every page select.
document.querySelectorAll('select:not([data-native])').forEach((nativeSelect, index) => {
  const triggerId = nativeSelect.id || `site-select-${index}`;
  const label = nativeSelect.labels?.[0];
  const options = [...nativeSelect.options].map(option => ({ value: option.value, text: option.text, disabled: option.disabled }));
  const mount = document.createElement('div');
  mount.className = 'site-select-mount';
  nativeSelect.after(mount);
  nativeSelect.id = `${triggerId}-native`;
  nativeSelect.hidden = true;
  const oldChevron = nativeSelect.parentElement.querySelector(':scope > svg');
  if (oldChevron) oldChevron.setAttribute('hidden', '');
  flushSync(() => createRoot(mount).render(<SiteSelect nativeSelect={nativeSelect} triggerId={triggerId} options={options} label={label} />));
});

// Magic Card's cursor spotlight + illuminated border, adapted to this site's CSS
// tokens and DOM form. Reference: https://magicui.design/docs/components/magic-card
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-magic-card]').forEach(card => {
  let clearTimer;
  const reset = () => { clearTimeout(clearTimer); card.removeAttribute('data-magic-active'); };
  const move = event => {
    if (reduced.matches) return;
    clearTimeout(clearTimer);
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--magic-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--magic-y', `${event.clientY - rect.top}px`);
    card.dataset.magicActive = '';
  };
  card.addEventListener('pointermove', move, { passive: true });
  card.addEventListener('pointerdown', move, { passive: true });
  card.addEventListener('pointerleave', reset);
  card.addEventListener('pointercancel', reset);
  card.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') clearTimer = setTimeout(reset, 500); });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reduced.addEventListener('change', reset);
});

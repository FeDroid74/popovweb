import { contactCopy as copy } from './contact-copy.js';
import { normalizeContact, suggestEmail, contactError } from './contact-validation.js';

const contacts = { email: 'fedorpopov7@yandex.ru', whatsapp: '+79636746751', telegram: 'FeDroid74' };
const root = document.documentElement;
const form = document.querySelector('.project-form');
const nameInput = form.elements.namedItem('name');
const contactInput = form.elements.namedItem('contact');
const methodInput = form.elements.namedItem('method');
const messageInput = form.elements.namedItem('message');
const help = document.querySelector('#contact-help');
const prefix = document.querySelector('.contact-prefix');
const suggestion = document.querySelector('.email-suggestion');
const status = document.querySelector('.form-status');
const values = { telegram: '', whatsapp: '', email: '' };
const touched = { name: false, contact: false };
let currentMethod = methodInput.value;
let proposedEmail = '';


const text = key => copy[root.lang === 'ru' ? 'ru' : 'en'][key];
// A draft lives only during an explicit language navigation, never in a request URL.
form.addEventListener('popovweb:save-draft', event => {
  Object.assign(event.detail, { name: nameInput.value, message: messageInput.value, method: currentMethod, values: { ...values, [currentMethod]: contactInput.value } });
});
form.addEventListener('popovweb:restore-draft', event => {
  const draft = event.detail;
  if (!draft || !['telegram', 'whatsapp', 'email'].includes(draft.method)) return;
  for (const method of Object.keys(values)) values[method] = String(draft.values?.[method] || '').slice(0, 254);
  nameInput.value = String(draft.name || '').slice(0, 80);
  messageInput.value = String(draft.message || '').slice(0, 3000);
  currentMethod = draft.method;
  methodInput.value = currentMethod;
  contactInput.value = values[currentMethod];
  methodInput.dispatchEvent(new Event('change', { bubbles: true }));
});
let submitting = false, statusKey = '';
function showStatus(key) {
  statusKey = key;
  status.hidden = false;
  status.textContent = text(key);
  if (key !== 'success') {
    const link = document.createElement('a');
    link.href = `https://t.me/${contacts.telegram}`;
    link.textContent = text('direct');
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    status.append(' ', link);
  }
}
function errorFor(input, key) {
  const error = document.getElementById(input === nameInput ? 'name-error' : 'contact-error');
  error.textContent = key ? text(key) : '';
  error.hidden = !key;
  input.setAttribute('aria-invalid', String(Boolean(key)));
}
function validateName() {
  const valid = Boolean(nameInput.value.trim());
  errorFor(nameInput, valid ? '' : 'nameError');
  return valid;
}
function validateContact() {
  const error = contactError(currentMethod, contactInput.value);
  errorFor(contactInput, error);
  proposedEmail = currentMethod === 'email' ? suggestEmail(contactInput.value) : '';
  suggestion.hidden = !proposedEmail;
  suggestion.textContent = proposedEmail ? `${text('suggestion')} ${proposedEmail}` : '';
  return !error;
}
function syncMethod() {
  const telegram = currentMethod === 'telegram', phone = currentMethod === 'whatsapp';
  prefix.hidden = !telegram;
  contactInput.type = phone ? 'tel' : currentMethod === 'email' ? 'email' : 'text';
  contactInput.inputMode = phone ? 'tel' : currentMethod === 'email' ? 'email' : 'text';
  contactInput.autocomplete = phone ? 'tel' : currentMethod === 'email' ? 'email' : 'off';
  contactInput.placeholder = telegram ? 'username' : phone ? '+7 900 123-45-67' : 'name@example.com';
  help.textContent = text(`${currentMethod}Help`);
}
methodInput.addEventListener('change', () => {
  values[currentMethod] = contactInput.value;
  currentMethod = methodInput.value;
  contactInput.value = values[currentMethod];
  touched.contact = false;
  proposedEmail = '';
  suggestion.hidden = true;
  status.hidden = true;
  errorFor(contactInput, '');
  syncMethod();
});
nameInput.addEventListener('blur', () => { touched.name = true; validateName(); });
nameInput.addEventListener('input', () => { status.hidden = true; if (touched.name) validateName(); });
contactInput.addEventListener('blur', () => {
  contactInput.value = normalizeContact(currentMethod, contactInput.value);
  values[currentMethod] = contactInput.value;
  touched.contact = true;
  validateContact();
});
contactInput.addEventListener('input', () => {
  // Avoid a doubled @ when a complete Telegram handle is pasted.
  if (currentMethod === 'telegram' && contactInput.value.startsWith('@')) contactInput.value = contactInput.value.replace(/^@+/, '');
  status.hidden = true;
  suggestion.hidden = true;
  errorFor(contactInput, '');
});
messageInput.addEventListener('input', () => status.hidden = true);
suggestion.addEventListener('click', () => {
  contactInput.value = proposedEmail;
  values.email = proposedEmail;
  validateContact();
  contactInput.focus();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  touched.name = touched.contact = true;
  contactInput.value = normalizeContact(currentMethod, contactInput.value);
  const validName = validateName(), validContact = validateContact();
  if (!validName || !validContact) {
    (validName ? contactInput : nameInput).focus();
    return;
  }
  const chosen = form.querySelector('.chosen-plan');
  const payload = { name: nameInput.value.trim(), method: currentMethod, contact: contactInput.value, message: messageInput.value, plan: chosen.hidden ? '' : chosen.querySelector('.chosen-plan-name').textContent, language: root.lang };
  const submit = form.querySelector('[type=submit]');
  submitting = true; submit.disabled = true; form.setAttribute('aria-busy', 'true');
  submit.querySelector('span').textContent = text('sending'); status.hidden = true;
  try {
    const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
    const result = await response.json();
    if (response.ok && result.ok === true) showStatus('success');
    else showStatus(result.error === 'not_configured' ? 'unavailable' : response.status === 429 ? 'rate' : 'failed');
  } catch { showStatus('failed'); }
  finally {
    submitting = false; submit.disabled = false; form.removeAttribute('aria-busy');
    submit.querySelector('span').textContent = text('submit');
  }
});
function translate() {
  form.querySelectorAll('[data-contact-text]').forEach(node => node.textContent = text(node.dataset.contactText));
  form.setAttribute('aria-label', text('formTitle'));
  nameInput.placeholder = text('namePlaceholder');
  messageInput.placeholder = text('messagePlaceholder');
  syncMethod();
  if (touched.name) validateName();
  if (touched.contact) validateContact();
  if (submitting) form.querySelector('[type=submit] span').textContent = text('sending');
  if (!status.hidden && statusKey) showStatus(statusKey);
}
for (const method of ['whatsapp', 'telegram']) {
  const link = document.querySelector(`[data-contact-link="${method}"]`);
  if (!contacts[method]) continue;
  link.href = method === 'whatsapp' ? `https://wa.me/${contacts[method].replace(/\D/g, '')}` : `https://t.me/${contacts[method].replace(/^@/, '')}`;
  link.removeAttribute('aria-disabled');
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
}
root.addEventListener('popovweb:language', translate);
translate();

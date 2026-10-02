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

const copy = {
  ru: {
    formTitle: 'Обсудить проект', name: 'Ваше имя', contact: 'Как с вами связаться?', method: 'Способ связи',
    message: 'Несколько слов о проекте', optional: 'Необязательно', submit: 'Отправить заявку',
    note: 'Свяжусь с вами выбранным способом.',
    telegramHelp: 'Ваш логин или ссылка t.me. Знак @ уже добавлен.', whatsappHelp: 'Номер с кодом страны, например +7 900 123-45-67.', emailHelp: 'Полный адрес: name@example.com.',
    required: 'Укажите контакт для ответа.', nameError: 'Представьтесь, пожалуйста.', telegram: 'Укажите логин латиницей, без пробелов, или ссылку t.me.',
    whatsapp: 'Укажите номер с + и кодом страны: от 7 до 15 цифр.', email: 'Проверьте адрес: имя ящика, @ и домен.', emailLocal: 'Добавьте имя ящика перед @. Например, name@gmail.com.',
    suggestion: 'Использовать', sending: 'Отправляю…', success: 'Заявка отправлена. Спасибо! Свяжусь с вами по указанному контакту.', unavailable: 'Отправка через форму пока не подключена.', failed: 'Не удалось отправить. Попробуйте ещё раз или напишите мне напрямую.', rate: 'Слишком много попыток. Попробуйте позже или напишите напрямую.', direct: 'Написать в Telegram',
    messagePlaceholder: 'Какой сайт нужен и какую задачу он должен решить?', namePlaceholder: 'Как к вам обращаться'
  },
  en: {
    formTitle: 'Project enquiry', name: 'Your name', contact: 'How can I reach you?', method: 'Contact method',
    message: 'A few words about your project', optional: 'Optional', submit: 'Send enquiry',
    note: 'I’ll reply using your chosen contact method.',
    telegramHelp: 'Your username or t.me link. The @ is already included.', whatsappHelp: 'Include your country code, e.g. +44 7700 900123.', emailHelp: 'Your full email address: name@example.com.',
    required: 'Enter a contact so I can reply.', nameError: 'Please enter your name.', telegram: 'Enter a username without spaces, or a t.me link.',
    whatsapp: 'Include + and your country code: 7 to 15 digits.', email: 'Check the address: mailbox name, @ and domain.', emailLocal: 'Add your mailbox name before @, e.g. name@gmail.com.',
    suggestion: 'Use', sending: 'Sending…', success: 'Enquiry sent. Thank you! I’ll reply using the contact you provided.', unavailable: 'The form is not connected yet.', failed: 'Could not send. Please try again or contact me directly.', rate: 'Too many attempts. Please try later or contact me directly.', direct: 'Message me on Telegram',
    messagePlaceholder: 'What website do you need, and what should it help you achieve?', namePlaceholder: 'What should I call you?'
  }
};
const text = key => copy[root.lang === 'ru' ? 'ru' : 'en'][key];
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
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
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

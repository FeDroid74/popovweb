const emailDomains = ['gmail.com', 'yandex.ru', 'yandex.com', 'ya.ru', 'mail.ru', 'bk.ru', 'inbox.ru', 'list.ru', 'outlook.com', 'hotmail.com', 'icloud.com'];
const domainTypos = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.ru': 'gmail.com', 'yandex.ry': 'yandex.ru', 'mail.ry': 'mail.ru', 'outlok.com': 'outlook.com' };

export function normalizeContact(method, raw) {
  const value = raw.trim();
  if (method === 'telegram') return value.replace(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i, '').replace(/^@+/, '').replace(/\/$/, '');
  if (method === 'whatsapp') return value.replace(/[\s()\-.]/g, '').replace(/^00/, '+');
  return value.replace(/^mailto:/i, '').trim();
}

// Offer changes explicitly; never silently guess somebody's contact address.
export function suggestEmail(raw) {
  const value = normalizeContact('email', raw);
  if (!value.includes('@')) {
    const domain = emailDomains.find(d => value.toLowerCase().endsWith(d));
    const local = domain ? value.slice(0, -domain.length) : '';
    if (local && /^[a-z0-9_+.-]+$/i.test(local) && !/[.]$/.test(local)) return `${local}@${domain}`;
    return '';
  }
  const [local, domain, extra] = value.split('@');
  return local && domain && extra === undefined && domainTypos[domain.toLowerCase()] ? `${local}@${domainTypos[domain.toLowerCase()]}` : '';
}

export function contactError(method, raw) {
  const value = normalizeContact(method, raw);
  if (!value || value === '+') return 'required';
  if (method === 'telegram') return /^[a-z0-9_]{3,32}$/i.test(value) ? '' : 'telegram';
  if (method === 'whatsapp') return /^\+[1-9]\d{6,14}$/.test(value) ? '' : 'whatsapp';
  if (emailDomains.includes(value.toLowerCase())) return 'emailLocal';
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value) && value.length <= 254 ? '' : 'email';
}

export function buildEnquiryMessage({ name, method, contact, message, plan, language }) {
  const ru = language === 'ru';
  const address = normalizeContact(method, contact);
  const formattedContact = method === 'telegram' ? `@${address}` : address;
  const lines = [ru ? 'Новая заявка · PopovWeb' : 'New enquiry · PopovWeb', '', `${ru ? 'Имя' : 'Name'}: ${name.trim()}`, `${method === 'email' ? 'Email' : method === 'telegram' ? 'Telegram' : 'WhatsApp'}: ${formattedContact}`];
  if (plan) lines.push(`${ru ? 'Формат' : 'Format'}: ${plan}`);
  if (message.trim()) lines.push('', `${ru ? 'О проекте' : 'About the project'}:`, message.trim());
  return lines.join('\n');
}

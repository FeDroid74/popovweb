import { contactError, buildEnquiryMessage } from './contact-validation.js';

export function validateEnquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const limits = { name: 80, contact: 254, message: 3000, plan: 160 };
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || body[key].length > limit || /\u0000/.test(body[key])) return false;
  }
  return Boolean(body.name.trim()) && !/[\r\n]/.test(body.name) && ['ru', 'en'].includes(body.language) && ['telegram', 'whatsapp', 'email'].includes(body.method) && !contactError(body.method, body.contact);
}

export function createContactHandler({ token, chatId, send = fetch }) {
  const attempts = new Map();
  const reply = (res, code, value) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(value));
  };
  return async (req, res) => {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res, 405, { error: 'method' }); }
    if (req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) return reply(res, 403, { error: 'origin' }); }
      catch { return reply(res, 403, { error: 'origin' }); }
    }
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return reply(res, 415, { error: 'content_type' });
    // No endpoint calls or false success before the owner connects their bot.
    if (!token || !chatId) { req.resume(); return reply(res, 503, { error: 'not_configured' }); }
    const now = Date.now(), ip = req.socket.remoteAddress;
    for (const [address, record] of attempts) if (record.until <= now) attempts.delete(address);
    const record = attempts.get(ip) || { count: 0, until: now + 600000 };
    if (record.count >= 5) { req.resume(); res.setHeader('Retry-After', Math.ceil((record.until - now) / 1000)); return reply(res, 429, { error: 'rate_limit' }); }
    record.count++; attempts.set(ip, record);
    const chunks = []; let bytes = 0;
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 16384) return reply(res, 413, { error: 'too_large' });
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!validateEnquiry(body)) return reply(res, 400, { error: 'invalid' });
      const response = await send(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: buildEnquiryMessage(body), link_preview_options: { is_disabled: true } }),
        signal: AbortSignal.timeout(8000)
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) return reply(res, 502, { error: 'delivery_failed' });
      return reply(res, 200, { ok: true });
    } catch (error) {
      // Never return bot tokens, Telegram API URLs, or submitted personal data.
      return reply(res, error instanceof SyntaxError ? 400 : 502, { error: error instanceof SyntaxError ? 'invalid' : 'delivery_failed' });
    }
  };
}

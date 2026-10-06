import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeContact, suggestEmail, contactError, buildEnquiryMessage } from '../contact-validation.js';
import { createContactHandler, validateEnquiry } from '../contact-api.mjs';

const enquiry = { name: 'Тест', method: 'email', contact: 'test@example.com', message: 'Тестовая заявка', plan: '', language: 'ru' };
test('email corrections are suggestions; never invent the mailbox name', () => {
  assert.equal(suggestEmail('namegmail.com'), 'name@gmail.com');
  assert.equal(suggestEmail('gmail.com'), '');
  assert.equal(contactError('email', 'gmail.com'), 'emailLocal');
  assert.equal(suggestEmail('name@gmial.com'), 'name@gmail.com');
  assert.equal(normalizeContact('email', 'name@gmial.com'), 'name@gmial.com');
  assert.equal(suggestEmail('name@my-company.design'), '');
  assert.equal(contactError('email', 'a@@gmail.com'), 'email');
  assert.equal(contactError('email', 'a@b..com'), 'email');
  assert.equal(contactError('email', 'a+b@example.design'), '');
});
test('normalize handles and international phones without changing the country', () => {
  assert.equal(normalizeContact('telegram', 'https://t.me/test_user'), 'test_user');
  assert.equal(normalizeContact('telegram', '@test_user'), 'test_user');
  assert.equal(normalizeContact('whatsapp', '+7 (900) 123-45-67'), '+79001234567');
  assert.equal(contactError('whatsapp', '89001234567'), 'whatsapp');
  assert.equal(contactError('whatsapp', '+44 7700 900123'), '');
  assert.equal(contactError('telegram', 'https://t.me/+invite'), 'telegram');
});
test('validate server fields and retain the selected format', () => {
  assert.equal(validateEnquiry(enquiry), true);
  assert.equal(validateEnquiry({ ...enquiry, method: 'other' }), false);
  assert.equal(validateEnquiry({ ...enquiry, message: 'a'.repeat(3001) }), false);
  assert.equal(validateEnquiry({ ...enquiry, contact: 'bad' }), false);
  assert.equal(validateEnquiry({ ...enquiry, name: '\n' }), false);
  assert.match(buildEnquiryMessage({ ...enquiry, method: 'telegram', contact: '@test_user', plan: 'Лендинг' }), /Telegram: @test_user\nФормат: Лендинг/);
});
async function request(handler, body = enquiry, origin = 'http://localhost:4173') {
  const bytes = Buffer.from(JSON.stringify(body));
  const req = { method: 'POST', headers: { host: 'localhost:4173', origin, 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' }, resume() {}, async *[Symbol.asyncIterator]() { for (const byte of bytes) yield Buffer.from([byte]); } };
  let result;
  const res = { setHeader() {}, writeHead(code) { this.code = code; }, end(body) { result = { code: this.code, body: JSON.parse(body) }; } };
  await handler(req, res); return result;
}
test('unconfigured bot cannot report success or contact Telegram', async () => {
  const handler = createContactHandler({ token: '', chatId: '', send: () => { throw Error('must not call'); } });
  assert.deepEqual(await request(handler), { code: 503, body: { error: 'not_configured' } });
});
test('delivery is acknowledged only after Telegram confirmation, UTF-8 survives chunk boundaries', async () => {
  let sent;
  const handler = createContactHandler({ token: 'test-token', chatId: '123', send: async (url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; } });
  assert.deepEqual(await request(handler), { code: 200, body: { ok: true } });
  assert.match(sent.text, /Имя: Тест/); assert.equal(sent.chat_id, '123');
  assert.equal((await request(handler, enquiry, 'https://elsewhere.test')).code, 403);
});
test('delivery errors stay errors; rate limiting prevents repeated calls', async () => {
  let calls = 0;
  const handler = createContactHandler({ token: 'test-token', chatId: '123', send: async () => { calls++; return { ok: false, json: async () => ({ ok: false }) }; } });
  for (let i = 0; i < 5; i++) assert.equal((await request(handler)).code, 502);
  assert.equal((await request(handler)).code, 429); assert.equal(calls, 5);
});

test('network failures and timeouts cannot become a successful enquiry', async () => {
  for (const error of [new TypeError('Network failure'), new DOMException('Timed out', 'TimeoutError')]) {
    const handler = createContactHandler({ token: 'test-token', chatId: '123', send: async () => { throw error; } });
    assert.deepEqual(await request(handler), { code: 502, body: { error: 'delivery_failed' } });
  }
});

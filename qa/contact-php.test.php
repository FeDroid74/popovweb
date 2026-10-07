<?php
declare(strict_types=1);
require __DIR__ . '/../server/contact.php';

function expect($actual, $expected, string $message): void {
    if ($actual !== $expected) throw new RuntimeException($message . ': ' . json_encode($actual));
}
$config = ['token' => '123456:' . str_repeat('x', 30), 'chatId' => '123456',
    'allowedOrigins' => ['https://popovweb.com', 'https://fedroid74.github.io']];
$server = ['REQUEST_METHOD' => 'POST', 'HTTP_ORIGIN' => 'https://popovweb.com', 'CONTENT_TYPE' => 'application/json', 'REMOTE_ADDR' => '192.0.2.1'];
$body = ['name' => 'Тест 🙂', 'method' => 'telegram', 'contact' => 'https://t.me/test_user', 'message' => "Тестовая заявка\nВторая строка", 'plan' => 'Лендинг', 'language' => 'ru', 'consent' => true, 'consentVersion' => '2026-10-06'];
$calls = 0;
$send = static function ($actualConfig, $method, $payload) use (&$calls, $config): array {
    $calls++;
    expect($actualConfig, $config, 'config');
    expect($method, 'sendMessage', 'Telegram method');
    expect($payload['chat_id'], '123456', 'destination');
    expect($payload['link_preview_options']['is_disabled'], true, 'no link previews');
    expect(isset($payload['parse_mode']), false, 'untrusted content stays plain text');
    expect(strpos($payload['text'], 'Telegram: @test_user') !== false, true, 'normalized contact');
    expect(strpos($payload['text'], 'Согласие: 2026-10-06') !== false, true, 'consent included');
    return ['ok' => true, 'result' => ['message_id' => 1]];
};
$limit = static function ($ip): int { expect($ip, '192.0.2.1', 'real client IP'); return 0; };
$request = static function ($overrides = [], $raw = null, $delivery = null, $rate = null, $settings = null) use ($server, $body, $config, $send, $limit): array {
    return popov_handle_contact(array_merge($server, $overrides), $raw ?? json_encode($body), $settings ?? $config, $delivery ?? $send, $rate ?? $limit);
};
expect($request()['body'], ['ok' => true], 'delivery confirmed');
expect($calls, 1, 'one delivery only');
foreach ([['REQUEST_METHOD' => 'GET'], ['HTTP_ORIGIN' => 'https://popovweb.com.evil.test'], ['HTTP_ORIGIN' => ''], ['CONTENT_TYPE' => 'text/plain']] as $index => $invalid) {
    expect($request($invalid)['status'], [405, 403, 403, 415][$index], 'invalid request rejected');
}
expect($request([], '{')['status'], 400, 'invalid JSON');
expect($request([], str_repeat('x', 16385))['status'], 413, 'oversized input');
foreach ([['consent' => false], ['consentVersion' => 'old'], ['name' => "Name\nForged"], ['name' => str_repeat('🙂', 41)], ['message' => str_repeat('a', 3001)], ['contact' => 'https://t.me/+invite'], ['plan' => "Format\nForged"]] as $invalid) {
    expect($request([], json_encode(array_merge($body, $invalid)))['status'], 400, 'invalid fields rejected');
}
expect($calls, 1, 'invalid requests never reach Telegram');
$preflight = $request(['REQUEST_METHOD' => 'OPTIONS', 'HTTP_ORIGIN' => 'https://fedroid74.github.io']);
expect($preflight['status'], 204, 'preview CORS preflight');
expect($preflight['headers']['Access-Control-Allow-Origin'], 'https://fedroid74.github.io', 'exact CORS origin');
expect(isset($preflight['headers']['Access-Control-Allow-Credentials']), false, 'no credentialed CORS');
$missingConfig = $config; unset($missingConfig['token']);
expect($request([], null, null, null, $missingConfig)['status'], 503, 'unconfigured bot fails closed');
foreach ([['ok' => false], ['ok' => true]] as $failed) {
    expect($request([], null, static function () use ($failed): array { return $failed; })['status'], 502, 'no false delivery acknowledgement');
}
expect($request([], null, static function (): array { throw new RuntimeException('TOKEN must never leak'); })['body'], ['error' => 'delivery_failed'], 'upstream details stay private');
$throttled = $request([], null, null, static function (): int { return 40; });
expect($throttled['status'], 429, 'throttled');
expect($throttled['headers']['Retry-After'], '40', 'retry guidance');
expect($request(['HTTP_X_FORWARDED_FOR' => 'spoofed'])['status'], 200, 'forwarded IP cannot bypass rate limit');

foreach (['email' => 'test@example.com', 'whatsapp' => '+7 (900) 123-45-67'] as $method => $contact) {
    expect(popov_valid_enquiry(array_merge($body, ['method' => $method, 'contact' => $contact, 'language' => 'en'])), true, $method . ' accepted');
}
$maximum = array_merge($body, ['name' => str_repeat('Я', 80), 'contact' => str_repeat('a', 32), 'message' => str_repeat('🙂', 1500), 'plan' => str_repeat('Я', 160)]);
expect(popov_valid_enquiry($maximum), true, 'maximum valid lengths');
expect(mb_strlen(popov_enquiry_message($maximum, 'https://fedroid74.github.io'), 'UTF-8') < 4096, true, 'Telegram message length');
expect(strpos(popov_enquiry_message($body, 'https://fedroid74.github.io'), '[TEST') === 0, true, 'preview enquiries labelled');

$file = tempnam(sys_get_temp_dir(), 'popov-contact-test-');
try {
    for ($i = 0; $i < 5; $i++) expect(popov_rate_limit($file, '192.0.2.1', 'private-salt', 100), 0, 'first five attempts');
    expect(popov_rate_limit($file, '192.0.2.1', 'private-salt', 101), 599, 'limit survives independent PHP calls');
    expect(popov_rate_limit($file, '192.0.2.2', 'private-salt', 101), 0, 'different visitor');
    expect(strpos(file_get_contents($file), '192.0.2.') === false, true, 'no IPs stored in plaintext');
    expect(strpos(file_get_contents($file), '<?php http_response_code(404); exit; ?>') === 0, true, 'rate limit storage cannot emit data as PHP');
    expect(popov_rate_limit($file, '192.0.2.1', 'private-salt', 701), 0, 'expired limit resets');
} finally { unlink($file); }
echo "PHP contact: validation, consent, CORS, delivery errors, rate limiting and UTF-8 passed.\n";

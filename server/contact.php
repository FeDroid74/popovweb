<?php
declare(strict_types=1);

// This file is published as /api/contact.php. Private files are provisioned separately, never built.
function popov_normalize_contact(string $method, string $raw): string {
    $value = trim($raw);
    if ($method === 'telegram') {
        $value = preg_replace('~^(?:https?://)?(?:www\.)?(?:t\.me|telegram\.me)/~i', '', $value);
        return rtrim(ltrim($value, '@'), '/');
    }
    if ($method === 'whatsapp') return preg_replace('/^00/', '+', preg_replace('/[\s()\-.]/u', '', $value));
    return trim(preg_replace('/^mailto:/i', '', $value));
}

function popov_valid_enquiry($body): bool {
    if (!is_array($body) || ($body['consent'] ?? null) !== true || ($body['consentVersion'] ?? '') !== '2026-10-06') return false;
    foreach (['name' => 80, 'contact' => 254, 'message' => 3000, 'plan' => 160] as $key => $limit) {
        $value = $body[$key] ?? null;
        if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) return false;
        // Match the browser's UTF-16 maxlength, including emoji.
        if (strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')) / 2 > $limit || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $value)) return false;
    }
    if (trim($body['name']) === '' || preg_match('/[\r\n]/', $body['name'] . $body['plan'])) return false;
    if (!in_array($body['language'] ?? null, ['ru', 'en'], true) || !in_array($body['method'] ?? null, ['telegram', 'whatsapp', 'email'], true)) return false;
    $contact = popov_normalize_contact($body['method'], $body['contact']);
    $patterns = ['telegram' => '/^[a-z0-9_]{3,32}$/iD', 'whatsapp' => '/^\+[1-9]\d{6,14}$/D', 'email' => '/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/uD'];
    return preg_match($patterns[$body['method']], $contact) === 1;
}

function popov_enquiry_message(array $body, string $origin): string {
    $ru = $body['language'] === 'ru';
    $address = popov_normalize_contact($body['method'], $body['contact']);
    $method = ['telegram' => 'Telegram', 'whatsapp' => 'WhatsApp', 'email' => 'Email'][$body['method']];
    $lines = [$ru ? 'Новая заявка · PopovWeb' : 'New enquiry · PopovWeb', '',
        ($ru ? 'Имя: ' : 'Name: ') . trim($body['name']),
        $method . ': ' . ($body['method'] === 'telegram' ? '@' : '') . $address];
    if ($body['plan'] !== '') $lines[] = ($ru ? 'Формат: ' : 'Format: ') . $body['plan'];
    if (trim($body['message']) !== '') array_push($lines, '', $ru ? 'О проекте:' : 'About the project:', trim($body['message']));
    array_push($lines, '', ($ru ? 'Сайт: ' : 'Website: ') . $origin,
        ($ru ? 'Согласие: ' : 'Consent: ') . $body['consentVersion'],
        ($ru ? 'Получено: ' : 'Received: ') . gmdate('Y-m-d\TH:i:s\Z'));
    if ($origin === 'https://fedroid74.github.io') array_unshift($lines, '[TEST · GitHub Pages]');
    return implode("\n", $lines);
}

function popov_configured(array $config): bool {
    return is_string($config['token'] ?? null) && preg_match('/^\d+:[a-zA-Z0-9_-]{20,}$/D', $config['token']) === 1
        && is_string($config['chatId'] ?? null) && preg_match('/^-?\d+$/D', $config['chatId']) === 1;
}

function popov_telegram(array $config, string $method, array $body): array {
    $curl = curl_init('https://api.telegram.org/bot' . $config['token'] . '/' . $method);
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false]);
    // Optional hosting-specific route; keep the Telegram hostname, SNI and certificate verification.
    if (!empty($config['apiIpv4'])) {
        if (!filter_var($config['apiIpv4'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) throw new RuntimeException('Invalid Telegram route');
        curl_setopt($curl, CURLOPT_RESOLVE, ['api.telegram.org:443:' . $config['apiIpv4']]);
    }
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    $result = is_string($raw) ? json_decode($raw, true) : null;
    if ($status !== 200 || !is_array($result) || ($result['ok'] ?? false) !== true) return ['ok' => false];
    return $result;
}

function popov_rate_limit(string $file, string $address, string $secret, int $now): int {
    // One bounded, locked file works across PHP workers. Store IP hashes, never form contents.
    $stream = fopen($file, 'c+');
    if (!$stream) throw new RuntimeException('Rate limit storage unavailable');
    try {
        if (!flock($stream, LOCK_EX)) throw new RuntimeException('Cannot lock rate limits');
        $raw = stream_get_contents($stream, 1048577);
        if (strlen($raw) > 1048576) throw new RuntimeException('Rate limit capacity exceeded');
        $guard = "<?php http_response_code(404); exit; ?>\n";
        if ($raw !== '' && substr($raw, 0, strlen($guard)) !== $guard) throw new RuntimeException('Invalid rate limit storage');
        $records = $raw === '' ? [] : json_decode(substr($raw, strlen($guard)), true, 8, JSON_THROW_ON_ERROR);
        if (!is_array($records)) throw new RuntimeException('Invalid rate limit state');
        foreach ($records as $key => $record) if ($record['until'] <= $now) unset($records[$key]);
        $key = hash_hmac('sha256', $address, $secret);
        $record = $records[$key] ?? ['count' => 0, 'until' => $now + 600];
        if ($record['count'] >= 5) return max(1, $record['until'] - $now);
        if (count($records) >= 5000 && !isset($records[$key])) return 600;
        $record['count']++;
        $records[$key] = $record;
        $encoded = $guard . json_encode($records, JSON_THROW_ON_ERROR);
        rewind($stream);
        if (!ftruncate($stream, 0) || fwrite($stream, $encoded) !== strlen($encoded) || !fflush($stream)) throw new RuntimeException('Cannot save rate limits');
        return 0;
    } finally {
        flock($stream, LOCK_UN);
        fclose($stream);
    }
}

function popov_handle_contact(array $server, string $raw, array $config, callable $send, callable $limit): array {
    $headers = ['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff', 'Vary' => 'Origin'];
    $reply = static function (int $status, array $body) use (&$headers): array { return ['status' => $status, 'headers' => $headers, 'body' => $body]; };
    $method = $server['REQUEST_METHOD'] ?? '';
    if (!in_array($method, ['POST', 'OPTIONS'], true)) { $headers['Allow'] = 'POST, OPTIONS'; return $reply(405, ['error' => 'method']); }
    $origin = $server['HTTP_ORIGIN'] ?? '';
    if (!in_array($origin, $config['allowedOrigins'] ?? [], true) || $origin === '') return $reply(403, ['error' => 'origin']);
    $headers['Access-Control-Allow-Origin'] = $origin;
    if ($method === 'OPTIONS') {
        $headers['Access-Control-Allow-Methods'] = 'POST';
        $headers['Access-Control-Allow-Headers'] = 'Content-Type';
        $headers['Access-Control-Max-Age'] = '600';
        return $reply(204, []);
    }
    if (!preg_match('~^application/json(?:\s*;|$)~i', $server['CONTENT_TYPE'] ?? '')) return $reply(415, ['error' => 'content_type']);
    if (strlen($raw) > 16384 || (int) ($server['CONTENT_LENGTH'] ?? 0) > 16384) return $reply(413, ['error' => 'too_large']);
    if (!popov_configured($config)) return $reply(503, ['error' => 'not_configured']);
    try { $body = json_decode($raw, true, 16, JSON_THROW_ON_ERROR); }
    catch (JsonException $error) { return $reply(400, ['error' => 'invalid']); }
    if (!popov_valid_enquiry($body)) return $reply(400, ['error' => 'invalid']);
    try {
        // Ignore user-controlled forwarding headers; Timeweb provides REMOTE_ADDR.
        $retry = $limit($server['REMOTE_ADDR'] ?? 'unknown');
        if ($retry > 0) { $headers['Retry-After'] = (string) $retry; return $reply(429, ['error' => 'rate_limit']); }
    } catch (Throwable $error) { return $reply(503, ['error' => 'temporarily_unavailable']); }
    try {
        $result = $send($config, 'sendMessage', ['chat_id' => $config['chatId'],
            'text' => popov_enquiry_message($body, $origin), 'link_preview_options' => ['is_disabled' => true]]);
        if (($result['ok'] ?? false) !== true || !isset($result['result']['message_id'])) return $reply(502, ['error' => 'delivery_failed']);
        return $reply(200, ['ok' => true]);
    } catch (Throwable $error) { return $reply(502, ['error' => 'delivery_failed']); }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    ini_set('display_errors', '0');
    umask(0077);
    // Timeweb site isolation blocks reads outside the site. HTTP access to this folder is denied.
    $private = __DIR__ . '/_private';
    try {
        define('POPOVWEB_CONTACT_CONFIG', true);
        $config = is_file($private . '/telegram.php') ? require $private . '/telegram.php' : [];
        if (!is_array($config)) $config = [];
        $result = popov_handle_contact($_SERVER, file_get_contents('php://input', false, null, 0, 16385), $config, 'popov_telegram',
            static function (string $ip) use ($private, $config): int { return popov_rate_limit($private . '/rate-limit.php', $ip, $config['token'], time()); });
    } catch (Throwable $error) {
        $result = ['status' => 503, 'headers' => ['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store'], 'body' => ['error' => 'not_configured']];
    }
    http_response_code($result['status']);
    foreach ($result['headers'] as $name => $value) header($name . ': ' . $value);
    if ($result['status'] !== 204) echo json_encode($result['body'], JSON_UNESCAPED_UNICODE);
}

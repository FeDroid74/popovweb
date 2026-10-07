// One-time provisioning. Send credentials through encrypted SSH stdin, never command arguments or Git.
import { loadEnvFile } from 'node:process';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { isIPv4 } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFile(resolve(root, '.env'));
const token = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || '';
const apiIpv4 = process.env.TELEGRAM_API_IPV4 || '';
if (apiIpv4 && !isIPv4(apiIpv4)) throw new Error('TELEGRAM_API_IPV4 must be an IPv4 address.');
if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token) || !/^-?\d+$/.test(chatId)) throw new Error('Set TELEGRAM_BOT_TOKEN and numeric TELEGRAM_CHAT_ID in the ignored .env file.');
const source = readFileSync(resolve(root, 'server/contact.php'), 'utf8');
const payload = { source, config: { token, chatId, apiIpv4, allowedOrigins: ['https://popovweb.com', 'https://fedroid74.github.io'] } };
const remote = String.raw`
ini_set('display_errors', '0');
umask(0077);
$stage = 'home directory';
try {
    $home = getenv('HOME');
    if ($home !== '/home/c/cz013423' || is_link($home . '/public_html') || !is_file($home . '/public_html/index.html')) throw new RuntimeException('Unexpected site directory.');
    $payload = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
    $config = $payload['config'];
    foreach (['getMe' => [], 'getChat' => ['chat_id' => $config['chatId']]] as $method => $params) {
        $stage = 'Telegram ' . $method;
        $curl = curl_init('https://api.telegram.org/bot' . $config['token'] . '/' . $method);
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($params), CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        if ($config['apiIpv4'] !== '') curl_setopt($curl, CURLOPT_RESOLVE, ['api.telegram.org:443:' . $config['apiIpv4']]);
        $response = curl_exec($curl);
        $code = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $errno = curl_errno($curl);
        curl_close($curl);
        $result = is_string($response) ? json_decode($response, true) : null;
        if ($code !== 200 || ($result['ok'] ?? false) !== true) { $stage .= ' HTTP ' . (int) $code . ', cURL ' . $errno; throw new RuntimeException('Telegram verification failed.'); }
    }
    $stage = 'private configuration directory';
    $api = $home . '/public_html/api';
    $private = $api . '/_private';
    if (is_link($private) || is_link($api)) throw new RuntimeException('Unexpected symlink.');
    if (!is_dir($api) && !mkdir($api, 0755)) throw new RuntimeException('Cannot create API directory.');
    chmod($api, 0755);
    if (!is_dir($private) && !mkdir($private, 0700)) throw new RuntimeException('Cannot create private configuration.');
    chmod($private, 0700);
    foreach (['.htaccess', 'telegram.php', 'telegram-staging.php', 'contact-staging.php'] as $file) if (is_link($private . '/' . $file)) throw new RuntimeException('Unexpected private symlink.');
    // Keep isolation enabled. Deny HTTP access before writing any credentials.
    $deny = "Require all denied\n";
    if (file_put_contents($private . '/.htaccess', $deny) !== strlen($deny)) throw new RuntimeException('Cannot protect configuration.');
    chmod($private . '/.htaccess', 0600);
    $stage = 'private directory HTTP protection';
    $probe = 'probe-' . bin2hex(random_bytes(12)) . '.php';
    file_put_contents($private . '/' . $probe, '<?php http_response_code(418);');
    $check = curl_init('https://popovweb.com/api/_private/' . $probe);
    curl_setopt_array($check, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
    curl_exec($check);
    $code = curl_getinfo($check, CURLINFO_RESPONSE_CODE);
    curl_close($check);
    unlink($private . '/' . $probe);
    if (!in_array($code, [403, 404], true)) throw new RuntimeException('Private directory must reject HTTP access.');
    $staging = $private . '/contact-staging.php';
    $stage = 'handler upload and PHP validation';
    if (file_put_contents($staging, $payload['source']) !== strlen($payload['source'])) throw new RuntimeException('Incomplete handler upload.');
    exec(escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($staging) . ' 2>&1', $lintOutput, $lintStatus);
    if ($lintStatus !== 0) throw new RuntimeException('PHP validation failed.');
    $target = $api . '/contact.php';
    $stage = 'handler backup';
    if (is_link($target)) throw new RuntimeException('Unexpected handler symlink.');
    if (is_file($target)) {
        $backup = $home . '/.popovweb-deploy-backups/contact-' . gmdate('Ymd-His');
        if (!mkdir($backup, 0700, true) || !copy($target, $backup . '/contact.php')) throw new RuntimeException('Cannot back up existing handler.');
    }
    // PHP guard also prevents output if the web server ever stops honoring .htaccess.
    $contents = "<?php\nif (!defined('POPOVWEB_CONTACT_CONFIG')) { http_response_code(404); exit; }\nreturn " . var_export($config, true) . ";\n";
    $stage = 'private configuration write';
    if (file_put_contents($private . '/telegram-staging.php', $contents) !== strlen($contents)) throw new RuntimeException('Incomplete configuration write.');
    chmod($private . '/telegram-staging.php', 0600);
    if (!rename($private . '/telegram-staging.php', $private . '/telegram.php')) throw new RuntimeException('Cannot save configuration.');
    chmod($staging, 0644);
    $stage = 'handler publication';
    if (!rename($staging, $target)) throw new RuntimeException('Cannot publish handler.');
    echo "Telegram credentials verified; private configuration and PHP handler installed.\n";
} catch (Throwable $error) {
    // Do not print exception details that might contain bot URLs or credentials.
    fwrite(STDERR, "Contact setup failed at " . $stage . "; no credentials were printed.\n");
    exit(1);
}
`;
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const ssh = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/ssh.exe' : 'ssh';
const result = spawnSync(ssh, ['-i', resolve(root, '.deploy/timeweb-github-actions'), '-o', 'BatchMode=yes',
  '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${resolve(root, '.deploy/timeweb-known-hosts')}`,
  '-o', 'ConnectTimeout=20', 'cz013423@vh460.timeweb.ru', 'php -r ' + quote(remote)],
  { input: JSON.stringify(payload), encoding: 'utf8', timeout: 60000 });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw new Error('SSH provisioning failed or timed out.');
process.exitCode = result.status || 0;

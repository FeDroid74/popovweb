// One-time provisioning. Send credentials through encrypted SSH stdin, never command arguments or Git.
import { loadEnvFile } from 'node:process';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvFile(resolve(root, '.env'));
const token = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || '';
if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token) || !/^-?\d+$/.test(chatId)) throw new Error('Set TELEGRAM_BOT_TOKEN and numeric TELEGRAM_CHAT_ID in the ignored .env file.');
const source = readFileSync(resolve(root, 'server/contact.php'), 'utf8');
const payload = { source, config: { token, chatId, allowedOrigins: ['https://popovweb.com', 'https://fedroid74.github.io'] } };
const remote = String.raw`
ini_set('display_errors', '0');
umask(0077);
try {
    $home = getenv('HOME');
    if ($home !== '/home/c/cz013423' || is_link($home . '/public_html') || !is_file($home . '/public_html/index.html')) throw new RuntimeException('Unexpected site directory.');
    $payload = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
    $config = $payload['config'];
    foreach (['getMe' => [], 'getChat' => ['chat_id' => $config['chatId']]] as $method => $params) {
        $curl = curl_init('https://api.telegram.org/bot' . $config['token'] . '/' . $method);
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($params), CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
        $response = curl_exec($curl);
        $code = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        $result = is_string($response) ? json_decode($response, true) : null;
        if ($code !== 200 || ($result['ok'] ?? false) !== true) throw new RuntimeException($method . ' failed: verify the token, chat ID and that the recipient started the bot.');
    }
    $private = $home . '/.config/popovweb';
    $api = $home . '/public_html/api';
    if (is_link($home . '/.config') || is_link($private) || is_link($api)) throw new RuntimeException('Unexpected symlink.');
    if (!is_dir($private) && !mkdir($private, 0700, true)) throw new RuntimeException('Cannot create private configuration.');
    chmod($private, 0700);
    if (!is_dir($api) && !mkdir($api, 0755)) throw new RuntimeException('Cannot create API directory.');
    chmod($api, 0755);
    $staging = $private . '/contact-staging.php';
    if (file_put_contents($staging, $payload['source']) !== strlen($payload['source'])) throw new RuntimeException('Incomplete handler upload.');
    exec(escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($staging) . ' 2>&1', $lintOutput, $lintStatus);
    if ($lintStatus !== 0) throw new RuntimeException('PHP validation failed.');
    $target = $api . '/contact.php';
    if (is_link($target)) throw new RuntimeException('Unexpected handler symlink.');
    if (is_file($target)) {
        $backup = $home . '/.popovweb-deploy-backups/contact-' . gmdate('Ymd-His');
        if (!mkdir($backup, 0700, true) || !copy($target, $backup . '/contact.php')) throw new RuntimeException('Cannot back up existing handler.');
    }
    $json = json_encode($config, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (file_put_contents($private . '/telegram.json.tmp', $json) !== strlen($json)) throw new RuntimeException('Incomplete configuration write.');
    chmod($private . '/telegram.json.tmp', 0600);
    if (!rename($private . '/telegram.json.tmp', $private . '/telegram.json')) throw new RuntimeException('Cannot save configuration.');
    chmod($staging, 0644);
    if (!rename($staging, $target)) throw new RuntimeException('Cannot publish handler.');
    echo "Telegram credentials verified; private configuration and PHP handler installed.\n";
} catch (Throwable $error) {
    // Do not print exception details that might contain bot URLs or credentials.
    fwrite(STDERR, "Contact setup failed; no credentials were printed.\n");
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

#!/usr/bin/env bash
set -euo pipefail

# Only native SSH and rsync handle credentials; no third-party deployment action.
: "${TIMEWEB_SSH_HOST:?Set TIMEWEB_SSH_HOST}"
: "${TIMEWEB_SSH_USER:?Set TIMEWEB_SSH_USER}"
: "${TIMEWEB_SSH_KEY:?Set TIMEWEB_SSH_KEY}"
: "${TIMEWEB_KNOWN_HOSTS:?Set TIMEWEB_KNOWN_HOSTS}"
: "${GITHUB_SHA:?Missing revision}"
: "${GITHUB_RUN_ID:?Missing workflow run}"
: "${GITHUB_RUN_ATTEMPT:?Missing workflow attempt}"
port="${TIMEWEB_SSH_PORT:-22}"
[[ "$TIMEWEB_SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]
[[ "$TIMEWEB_SSH_USER" =~ ^[a-z_][a-z0-9_-]*$ ]]
[[ "$port" =~ ^[0-9]{1,5}$ ]] && (( 10#$port > 0 && 10#$port < 65536 ))
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$GITHUB_RUN_ID" =~ ^[0-9]+$ && "$GITHUB_RUN_ATTEMPT" =~ ^[0-9]+$ ]]
[[ -f dist/index.html && -f dist/en/index.html && -f dist/deployment.json ]]

umask 077
credentials=$(mktemp -d /tmp/popovweb-ssh.XXXXXX)
trap 'rm -f -- "$credentials/key" "$credentials/known_hosts"; rmdir -- "$credentials"' EXIT
printf '%s\n' "$TIMEWEB_SSH_KEY" > "$credentials/key"
printf '%s\n' "$TIMEWEB_KNOWN_HOSTS" > "$credentials/known_hosts"
unset TIMEWEB_SSH_KEY TIMEWEB_KNOWN_HOSTS
ssh_options=(-p "$port" -i "$credentials/key" -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$credentials/known_hosts" -o ConnectTimeout=20)
remote="$TIMEWEB_SSH_USER@$TIMEWEB_SSH_HOST"

# The confirmed site directory is public_html under this account's home.
# Do not create/guess another destination, follow symlinks, or touch another site.
remote_root=$(ssh "${ssh_options[@]}" "$remote" 'bash -s' <<'REMOTE'
set -euo pipefail
command -v rsync >/dev/null
account_home=$(cd "$HOME" && pwd -P)
[[ -d "$account_home/public_html" && ! -L "$account_home/public_html" ]]
[[ -f "$account_home/public_html/index.html" ]]
grep -q PopovWeb "$account_home/public_html/index.html"
[[ -f "$account_home/public_html/.htaccess" ]]
printf '%s\n' "$account_home/public_html"
REMOTE
)
[[ "$remote_root" =~ ^/[a-zA-Z0-9_./-]+/public_html$ && "$remote_root" != *'/../'* ]]
backup_root="${remote_root%/public_html}/.popovweb-deploy-backups"
release="${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${GITHUB_SHA:0:12}"
ssh "${ssh_options[@]}" "$remote" "mkdir -p -- '$backup_root/$release'"

printf -v rsync_ssh '%q ' ssh "${ssh_options[@]}"
options=(-rz --checksum --delay-updates --backup --backup-dir="$backup_root/$release"
  --chmod=D755,F644 --timeout=60 -e "$rsync_ssh"
  --exclude='.htaccess' --exclude='.well-known/' --exclude='cgi-bin/' --exclude='api/' --exclude='.env*')
# Upload assets before the HTML that references them. No --delete: preserve
# host configuration, certificates, future PHP handler, and server-only files.
rsync "${options[@]}" --exclude='*.html' --exclude='deployment.json' dist/ "$remote:$remote_root/"
rsync "${options[@]}" --include='*/' --include='*.html' --exclude='*' dist/ "$remote:$remote_root/"
rsync "${options[@]}" dist/deployment.json "$remote:$remote_root/"

for route in / /en/ /documents/privacy-ru.html; do
  curl --fail --silent --show-error --retry 3 --max-time 30 -o /dev/null "https://popovweb.com$route"
done
curl --fail --silent --show-error --retry 3 --max-time 30 \
  "https://popovweb.com/deployment.json?revision=$GITHUB_SHA" |
  node --input-type=module -e 'let body=""; for await (const chunk of process.stdin) body+=chunk; if(JSON.parse(body).commit!==process.env.GITHUB_SHA) process.exit(1);'
echo "Published $GITHUB_SHA to https://popovweb.com. Backup: $backup_root/$release" >> "$GITHUB_STEP_SUMMARY"

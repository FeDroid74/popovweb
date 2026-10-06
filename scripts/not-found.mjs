export function render404(config = {}) {
  const home = config.base || config.basePath || '/';
  const escaped = home.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><title>Страница не найдена | PopovWeb</title>
<style>html{color-scheme:dark;background:#1b1c1a;color:#f5f5f2;font-family:system-ui,sans-serif}body{margin:0;min-height:100svh;display:grid;place-items:center}main{max-width:640px;padding:32px}p{color:#a4a69e;line-height:1.6}h1{font-size:clamp(32px,6vw,56px);font-weight:500;letter-spacing:-.04em;margin:16px 0}.code{color:#f76a38;font-size:18px}nav{display:flex;flex-wrap:wrap;gap:16px;margin-top:32px}a{color:inherit;text-underline-offset:6px;padding:12px 0}a:hover{color:#f76a38}a:focus-visible{outline:2px solid #f76a38;outline-offset:6px}</style></head>
<body><main><span class="code">PopovWeb / 404</span><h1>Страница не найдена</h1><p>Возможно, адрес изменился. Перейдите на главную страницу.</p><p lang="en">This page could not be found. You can return to the homepage below.</p><nav aria-label="Главная страница"><a href="${escaped}" lang="ru">На главную →</a><a href="${escaped}en/" lang="en">English homepage →</a></nav></main></body></html>`;
}

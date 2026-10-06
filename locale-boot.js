// Inlined into each generated page before first paint; never changes the URL's locale.
try {
  const key = 'popovweb-locale-transfer';
  const transfer = JSON.parse(sessionStorage.getItem(key) || 'null');
  sessionStorage.removeItem(key);
  if (transfer && Date.now() - transfer.at < 30000 && transfer.target === location.pathname) {
    window.popovLocaleTransfer = transfer;
    if (transfer.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('locale-arriving');
      setTimeout(() => document.documentElement.classList.remove('locale-arriving', 'locale-swapping', 'locale-revealing'), 3000);
    }
  }
} catch { /* Direct URLs and blocked storage always reveal the page normally. */ }

(function() {
  // Avoid double-injection
  if (document.getElementById('bd-back-btn')) return;

  var btn = document.createElement('a');
  btn.id = 'bd-back-btn';
  btn.href = 'https://people.blackdogpanama.com';
  btn.textContent = '\u2190 People';
  btn.style.cssText = [
    'position:fixed',
    'top:12px',
    'left:12px',
    'z-index:99999',
    'background:#1e293b',
    'color:#fff',
    'padding:6px 14px',
    'border-radius:8px',
    'font:600 13px/1.4 system-ui,sans-serif',
    'text-decoration:none',
    'box-shadow:0 2px 8px rgba(0,0,0,.25)',
    'transition:background .2s'
  ].join(';');
  btn.onmouseenter = function() { btn.style.background = '#334155'; };
  btn.onmouseleave = function() { btn.style.background = '#1e293b'; };

  document.body.appendChild(btn);
})();

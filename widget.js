(() => {
  const script = document.currentScript;
  const targetId = script?.dataset.target || 'keyword-news';
  const topic = script?.dataset.topic || 'federal-tax';
  const limit = Number(script?.dataset.limit || 5);
  const title = script?.dataset.title || 'Latest headlines';
  const base = new URL('.', script.src);
  const dataUrl = new URL('data/headlines.json', base);

  const root = document.getElementById(targetId);
  if (!root) return;

  root.classList.add('knw-widget');
  root.innerHTML = `<div class="knw-card"><div class="knw-heading"></div><div class="knw-body">Loading…</div></div>`;
  root.querySelector('.knw-heading').textContent = title;

  const styleId = 'knw-widget-style';
  if (!document.getElementById(styleId)) {
    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = new URL('widget.css', base);
    document.head.appendChild(link);
  }

  const escapeHtml = (s) => String(s || '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));

  const relativeTime = (dateString) => {
    if (!dateString) return '';
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.max(0, Math.round(diff / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  fetch(dataUrl, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const items = (data.topics?.[topic] || []).slice(0, limit);
      const body = root.querySelector('.knw-body');
      if (!items.length) {
        body.textContent = 'No matching headlines right now.';
        return;
      }
      body.innerHTML = items.map(item => `
        <article class="knw-item">
          <a class="knw-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
          <div class="knw-meta">${escapeHtml(item.source)}${item.publishedAt ? ` · ${relativeTime(item.publishedAt)}` : ''}</div>
        </article>
      `).join('');
    })
    .catch(err => {
      root.querySelector('.knw-body').textContent = `Unable to load headlines.`;
      console.error(err);
    });
})();

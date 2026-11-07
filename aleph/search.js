(() => {
  'use strict';
  const key = 'zafkiel.demo.aleph.v1';
  const $ = id => document.getElementById(id);
  const fields = { title: '名稱', description: '描述', body: '正文' };
  const kinds = { folder: '資料夾', pdf: 'PDF', video: '影片', text: '文字' };
  const tagNames = new Map(alephFixture.tags.map(tag => [tag.id, tag.name]));
  const libraries = new Map(alephFixture.libraries.map(lib => [lib.id, lib.label]));
  const normalize = value => value.trim().normalize('NFKC').toLowerCase();
  const filters = new Set();
  const selected = new Set();
  let index, visible = [], generation = 0, anchor = null, view = 'home', inspecting = null;

  function node(tag, text, cls) {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }

  function buildIndex() {
    index = alephFixture.assets.map(asset => ({
      asset,
      fields: Object.entries(fields).map(([field, label]) => ({ label, text: normalize(asset[field]) }))
    }));
    $('size').textContent = index.length;
    $('generation').textContent = '索引 v' + ++generation;
  }

  function updateSelection() {
    $('bulk').hidden = !selected.size;
    $('selected-count').textContent = '已選 ' + selected.size + ' 筆';
    $('hits').classList.toggle('has-selection', selected.size > 0);
    for (const card of $('hits').querySelectorAll('.asset-card')) {
      const checked = selected.has(card.dataset.id);
      card.classList.toggle('asset-selected', checked);
      card.querySelector('input').checked = checked;
    }
  }

  function choose(id, shift) {
    const start = visible.indexOf(anchor);
    const end = visible.indexOf(id);
    const range = shift && start >= 0 ? visible.slice(Math.min(start, end), Math.max(start, end) + 1) : [id];
    const checking = !selected.has(id);
    for (const item of range) {
      if (checking) selected.add(item);
      else selected.delete(item);
    }
    if (!shift || start < 0) anchor = id;
    updateSelection();
    $('event').textContent = checking ? '已更新選取。' : '已取消選取。';
  }

  function makeCard(asset, matches) {
    const card = node('article', '', 'asset-card');
    card.dataset.id = asset.id;
    const check = node('input', '', 'asset-select');
    check.type = 'checkbox';
    check.setAttribute('aria-label', '選取資產 ' + asset.title);
    check.addEventListener('click', event => choose(asset.id, event.shiftKey));
    const link = node('a', '', 'card-open');
    link.id = 'asset-link-' + asset.id;
    link.href = '#/assets/' + asset.id;
    link.addEventListener('click', event => {
      if (!selected.size) return;
      event.preventDefault();
      choose(asset.id, event.shiftKey);
      check.focus();
    });
    link.append(node('h2', asset.title), node('p', asset.body || asset.description, 'card-excerpt'));
    if (matches.length) link.append(node('small', matches.map(f => f.label + '命中').join('、'), 'match'));
    if (filters.size) link.append(node('small', '符合標籤 · ' + [...filters].map(t => tagNames.get(t)).join('、'), 'match'));
    if (matches.length || filters.size) link.append(node('code', asset.id, 'match'));
    const chips = node('div', '', 'chips card-tags');
    for (const tag of asset.tags) {
      const chip = node('button', tagNames.get(tag), 'chip');
      chip.addEventListener('click', () => {
        filters.clear();
        filters.add(tag);
        $('filter-panel').open = true;
        render();
        $('tag-' + tag).focus();
      });
      chips.append(chip);
    }
    card.append(check, link, chips);
    return card;
  }

  function render() {
    const terms = normalize($('query').value).split(/\s+/).filter(Boolean);
    const searched = terms.length || filters.size;
    const cards = [];
    visible = [];
    for (const { asset, fields } of index) {
      if (view !== 'home' || ![...filters].every(tag => asset.tags.includes(tag))) continue;
      if (!terms.every(term => fields.some(field => field.text.includes(term)))) continue;
      const matches = fields.filter(field => terms.some(term => field.text.includes(term)));
      cards.push(makeCard(asset, matches));
      visible.push(asset.id);
    }
    if (!cards.length) {
      const message = searched ? '沒有符合的資產，請調整搜尋或清除篩選。' :
        view === 'trash' ? '垃圾桶是空的。' : '封存的記事會顯示在這裡。';
      cards.push(node('p', message, 'empty-results'));
    }
    $('hits').replaceChildren(...cards);
    for (const id of selected) if (!visible.includes(id)) selected.delete(id);
    if (!visible.includes(anchor)) anchor = null;
    updateSelection();
    $('count').textContent = searched ? visible.length + ' 筆命中' : '尚未搜尋 · 共 ' + visible.length + ' 筆資產';
    $('filter-summary').textContent = filters.size ? '同時符合：' + [...filters].map(t => tagNames.get(t)).join('、') : '';
    $('clear-filters').hidden = !searched;
    for (const chip of $('tags').children) chip.setAttribute('aria-pressed', String(filters.has(chip.value)));
    for (const link of document.querySelectorAll('[data-view]')) link.setAttribute('aria-current', link.dataset.view === view ? 'page' : 'false');
    $('composer').hidden = view !== 'home';
  }

  function route() {
    const hash = location.hash;
    const entering = !hash || hash === '#/entry';
    const asset = index.find(entry => hash === '#/assets/' + entry.asset.id)?.asset;
    const previous = inspecting;
    $('entry').hidden = !entering;
    $('workspace').hidden = entering;
    if (!asset || asset.id !== previous) closePreview(false);
    if (!asset && $('reader').open) $('reader').close();
    inspecting = asset?.id || null;
    if (entering) {
      if (hash) document.querySelector('.vault-open').focus();
      return;
    }
    view = ['#/archive', '#/trash'].includes(hash) ? hash.slice(2) : 'home';
    render();
    if (asset) {
      $('asset-title').textContent = asset.title;
      $('asset-tags').replaceChildren(...asset.tags.map(t => node('span', tagNames.get(t), 'chip')));
      $('asset-description').textContent = asset.description;
      $('asset-body').textContent = asset.body;
      $('asset-source').textContent = libraries.get(asset.libraryId) + ' / ' + kinds[asset.kind];
      $('asset-id').textContent = asset.id;
      const hasMaterial = asset.kind === 'pdf' || asset.kind === 'video';
      $('asset-media').hidden = !hasMaterial;
      if (hasMaterial) {
        const name = asset.kind === 'video' ? 'lesson.mp4' : 'lecture.pdf';
        $('material-name').textContent = name;
        $('material-open').textContent = (asset.kind === 'video' ? '▶' : 'PDF') + '　' + name;
        $('material-open').setAttribute('aria-label', '預覽素材 ' + name);
      }
      if (!$('reader').open) $('reader').showModal();
      $('asset-title').focus();
    } else if (previous) {
      ($('asset-link-' + previous) || $('query')).focus();
    }
  }

  function clearSelection() {
    const focusWasInBulk = $('bulk').contains(document.activeElement);
    selected.clear();
    anchor = null;
    updateSelection();
    if (focusWasInBulk) $('query').focus();
  }

  function clearFilters() {
    filters.clear();
    $('query').value = '';
    render();
    $('event').textContent = '已清除篩選。';
    $('query').focus();
  }

  for (const [id, name] of tagNames) {
    const chip = node('button', name, 'chip');
    chip.id = 'tag-' + id;
    chip.value = id;
    chip.addEventListener('click', () => {
      if (filters.has(id)) filters.delete(id);
      else filters.add(id);
      render();
      $('event').textContent = '已更新標籤條件。';
    });
    $('tags').append(chip);
  }

  window.addEventListener('hashchange', route);
  $('query').addEventListener('input', () => { render(); $('event').textContent = ''; });
  $('clear-filters').addEventListener('click', clearFilters);
  $('deselect').addEventListener('click', clearSelection);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('reader').open && selected.size) {
      event.preventDefault();
      clearSelection();
    }
  });
  function closeReader() { location.hash = '#/home'; }
  function closePreview(restoreFocus = true) {
    if ($('preview').open) $('preview').close();
    $('reader').inert = false;
    if (restoreFocus && $('reader').open) $('material-open').focus();
  }
  $('material-open').addEventListener('click', () => {
    const asset = index.find(entry => entry.asset.id === inspecting)?.asset;
    if (!asset) return;
    $('preview-title').textContent = $('material-name').textContent;
    const sample = node('div', '', asset.kind === 'video' ? 'sample-video' : 'sample-pdf');
    if (asset.kind === 'video') {
      sample.append(node('span', '▶', 'play-symbol'), node('p', '示範影片畫面 · 00:00 / 02:00'));
    } else {
      sample.append(node('strong', '示範講義'), node('p', '先確認輸入資料與工作目的。'), node('small', '合成 PDF 頁面標本'));
    }
    $('preview-content').replaceChildren(sample);
    $('reader').inert = true;
    $('preview').showModal();
    $('preview-close').focus();
  });
  $('preview-close').addEventListener('click', () => closePreview());
  $('preview').addEventListener('cancel', event => { event.preventDefault(); closePreview(); });
  $('preview').addEventListener('click', event => {
    if (event.target !== $('preview')) return;
    const r = $('preview').getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closePreview();
  });
  $('close').addEventListener('click', closeReader);
  $('reader').addEventListener('cancel', event => { event.preventDefault(); closeReader(); });
  $('reader').addEventListener('click', event => {
    if (event.target !== $('reader')) return;
    const r = $('reader').getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeReader();
  });
  $('rebuild').addEventListener('click', () => {
    buildIndex();
    render();
    $('event').textContent = '已從固定示範資料重建索引。';
  });
  $('save').addEventListener('click', () => {
    try {
      localStorage.setItem(key, JSON.stringify({ query: $('query').value, tags: [...filters], selection: [...selected] }));
      $('event').textContent = '已保存查詢、標籤與選取。';
    } catch {
      $('event').textContent = '瀏覽器無法保存目前查詢。';
    }
  });
  $('reset').addEventListener('click', () => {
    try { localStorage.removeItem(key); }
    catch { $('event').textContent = '瀏覽器無法清除保存資料，重設未完成。'; return; }
    generation = 0;
    clearSelection();
    buildIndex();
    clearFilters();
    $('filter-panel').open = false;
    if (view !== 'home') location.hash = '#/home';
    $('event').textContent = '已重設 Aleph 示範。';
  });

  buildIndex();
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const saved = JSON.parse(raw);
      if (typeof saved?.query !== 'string' || !Array.isArray(saved.tags)) throw new Error();
      $('query').value = saved.query;
      for (const id of saved.tags) if (tagNames.has(id)) filters.add(id);
      for (const id of Array.isArray(saved.selection) ? saved.selection : [saved.selection]) selected.add(id);
      $('filter-panel').open = filters.size > 0;
      $('event').textContent = '已載入保存的查詢。';
    }
  } catch {
    $('event').textContent = '無法載入保存的查詢，已開啟初始畫面。';
  }
  route();
})();

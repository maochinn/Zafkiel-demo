'use strict';
(() => {
const drawings={
  note:'<path d="M9 18h6m-5 3h4M8.4 14.5C4 11 6.2 3 12 3s8 8 3.6 11.5c-.9.7-1.6 1.5-1.6 2.5h-4c0-1-.7-1.8-1.6-2.5Z"/>',
  image:'<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><circle cx="8" cy="8" r="1"/><path d="m4 18 5-5 3 3 3-5 5 7"/>',
  edit:'<path d="m4 16-1 5 5-1L20 8l-4-4ZM14 6l4 4M3 21h7"/>',
  archive:'<path d="M4 7h16v14H4ZM3 3h18v4H3Zm6 8h6"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
};
  const key = 'zafkiel.demo.vav.v1';
  const fixture = VAV_FIXTURE;
  const [folder, pdf, video, note] = fixture.assets;
  const locations = [
    {asset: pdf.id, locator: {kind: 'page', page: 2}, label: '第 2 頁'},
    {asset: video.id, locator: {kind: 'time-range', start: 45, end: 60}, label: '00:45–01:00'}
  ];
  const kinds = {'explicit-reference': '筆記引用', 'uses-material': '素材使用', 'physically-contains': '實體包含'};
  const $ = id => document.getElementById(id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fresh = () => ({
    notes: {}, titles: {}, tagVocabulary: copy(fixture.tags), tagGroups: copy(fixture.groups),
    assetTagOpinions: {}, authoredRelations: [copy(fixture.relations[1])], graphView: 'all'
  });
  let state = fresh();
  let view = 'asset';
  let selected = note.id;
  let editingTag = 'python';
  let dirty = false;
  let message = '已載入合成資產。';
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved) {
      if (!Array.isArray(saved.tagVocabulary) || !Array.isArray(saved.authoredRelations) ||
          !Array.isArray(saved.tagGroups) || !saved.assetTagOpinions || !saved.notes || !saved.titles) throw Error();
      state = saved;
      message = '已載入已儲存的 overview。';
    }
  } catch { message = '無法讀取已存整理，目前顯示示範初始值。'; }
  const assets = () => [...fixture.assets, ...Object.entries(state.notes).filter(([id]) =>
    !fixture.assets.some(a => a.id === id)).map(([id]) => ({
      id, title:'新筆記', kind:'text', authority:'zafkiel-body', tags:[], body:'', path:'overview'
    }))];
  const asset = id => assets().find(a => a.id === id);
  const title = id => state.titles[id] || asset(id).title;
  const body = a => state.notes[a.id] ?? a.body;
  const tagIds = a => state.assetTagOpinions[a.id] ?? a.tags;
  const relations = () => [fixture.relations[0], ...state.authoredRelations];
  const owner = () => $('role').value === 'owner';
  const option = (id,label,active) => `<option value="${esc(id)}" ${id === active ? 'selected' : ''}>${esc(label)}</option>`;
  const tagOptions = (items,active) => items.map(t => option(t.id,t.name,active)).join('');
  const jump = id => `<button class="link" data-open="${esc(id)}">${esc(title(id))}</button>`;
  function status(msg, changed = false) {
    if (changed) dirty = true;
    message = msg;
    $('dirty').textContent = dirty ? '● 尚未儲存' : '○ 無待存變更';
    $('message').textContent = message;
    $('notice').textContent = $('sheet').open ? message : '';
  }
  function apply(msg) { status(msg,true); render(); }
  function locatorLabel(r) {
    if (!r.locator) return '固定登錄 metadata';
    return r.locator.kind === 'page' ? '第 ' + r.locator.page + ' 頁' :
      [r.locator.start,r.locator.end].map(t => [Math.floor(t/60),t%60].map(n=>String(n).padStart(2,'0')).join(':')).join('–');
  }
  function edges(incoming) {
    const rows = relations().filter(r => (incoming ? r.to : r.from) === selected);
    return rows.map(r => `<div class="edge">${jump(incoming ? r.from : r.to)}<br>
      <span class="muted">${kinds[r.kind]} · ${locatorLabel(r)}</span>
      ${!incoming && r.kind !== 'physically-contains' ? `<button class="link" data-remove="${esc(r.id)}">移除關係</button>` : ''}</div>`).join('') || '<p class="muted">目前無關係</p>';
  }
  const chosen = new Set();
  const filters = new Set();
  let anchor = null;
  let editing = false;
  let composerOpen = false;
  let returnFocus = '';
  let listRoute = '#/home';

  function storeOverview() {
    try { localStorage.setItem(key, JSON.stringify(state)); }
    catch { status('瀏覽器儲存失敗，請重試。'); return false; }
    dirty = false;
    status('已儲存目前的 overview。');
    return true;
  }
  function openComposer() {
    $('expanded').hidden=false; $('open').hidden=true;
    $('open').setAttribute('aria-expanded','true');
    composerOpen=true; $('newTitle').focus();
  }
  function finishComposer() {
    if (!composerOpen) return true;
    const name=val('newTitle'), content=$('newBody').value;
    if (name || content.trim()) {
      const id=crypto.randomUUID();
      state.notes[id]=content;
      state.titles[id]=name || content.trim().split('\n')[0].slice(0,100);
      if (!storeOverview()) { delete state.notes[id]; delete state.titles[id]; return false; }
      filters.clear(); $('search').value=''; returnFocus='asset-link-'+id;
    }
    $('newTitle').value=''; $('newBody').value='';
    $('expanded').hidden=true; $('open').hidden=false;
    $('open').setAttribute('aria-expanded','false');
    composerOpen=false; render(); ($(returnFocus)||$('open')).focus();
    return true;
  }
  function applyFields() {
    if (!editing) return;
    const a=asset(selected), name=val('title') || title(selected);
    if (name!==title(selected)) { state.titles[selected]=name; dirty=true; }
    if ($('body') && body(a)!==$('body').value) { state.notes[selected]=$('body').value; dirty=true; }
  }
  function closeSheet() {
    if ($('material-preview').open) { closePreview(); return; }
    applyFields();
    if (dirty && !storeOverview()) return;
    location.hash=listRoute;
    const target=returnFocus;
    setTimeout(() => ($(target)||$('home')).focus(), 50);
  }
  function route() {
    if ($('material-preview').open) closePreview();
    const hash=location.hash || '#/home';
    const wasOpen=$('sheet').open;
    const previousView=view;
    const previousAsset=selected;
    if ($('sheet').open && editing) applyFields();
    if (dirty && $('sheet').open && !storeOverview()) return;
    editing=false;
    if (hash.startsWith('#/assets/') && asset(hash.slice(9))) {
      selected=hash.slice(9); view='asset';
      returnFocus='asset-link-'+selected;
    } else if (hash==='#/tags' || hash==='#/graph') {
      view=hash.slice(2); returnFocus='panel-'+view;
    } else {
      listRoute=['#/archive','#/trash'].includes(hash)?hash:'#/home';
      view='list';
    }
    if (view==='list' && $('sheet').open) $('sheet').close();
    if (view!==previousView || selected!==previousAsset) $('notice').textContent='';
    render();
    if (view!=='list') {
      if (!$('sheet').open) $('sheet').showModal();
      $('sheet').scrollTop=0;
      const target=view==='graph' ? history.state?.vavGraphFocus : null;
      if (target) setTimeout(() => (document.querySelector('[data-graph-focus="'+CSS.escape(target)+'"]')||$('graphFilter')).focus(), 50);
      else ($('asset-title')||$('close')).focus();
    } else if (wasOpen) {
      const target=returnFocus;
      setTimeout(() => ($(target)||$('home')).focus(), 0);
    }
  }
  function matchingAssets() {
    const query=$('search').value.trim().toLowerCase();
    return assets().filter(a=>title(a.id).toLowerCase().includes(query) &&
      [...filters].every(t=>tagIds(a).includes(t)));
  }
  function visibleAssets() {
    return listRoute==='#/home' ? matchingAssets() : [];
  }
  function chip(t, active=false) {
    return `<button class="chip" data-filter="${esc(t.id)}" aria-pressed="${active}">${esc(t.name)}</button>`;
  }
  function library() {
    const rows=visibleAssets(), order=rows.map(a=>a.id);
    for(const id of chosen) if(!order.includes(id)) chosen.delete(id);
    if(!order.includes(anchor)) anchor=null;
    $('assets').classList.toggle('has-selection',chosen.size>0);
    $('assets').innerHTML=rows.map(a=>`<article class="asset-card ${chosen.has(a.id)?'asset-selected':''}">
      <input type="checkbox" class="asset-select" aria-label="選取資產 ${esc(title(a.id))}" data-select="${a.id}" ${chosen.has(a.id)?'checked':''}>
      <a class="card-open" id="asset-link-${a.id}" href="#/assets/${a.id}" data-card="${a.id}"><div class="card-content">
      <h2>${esc(title(a.id))}</h2><div class="card-excerpt">${esc(previewText(a))}</div></div></a>
      <div class="chips card-tags">${state.tagVocabulary.filter(t=>tagIds(a).includes(t.id)).map(t=>chip(t)).join('')}</div></article>`).join('');
    $('asset-count').textContent=rows.length?'共 '+rows.length+' 筆資產':'沒有符合的資產';
    $('bulk').hidden=!chosen.size; $('count').textContent='已選 '+chosen.size+' 筆';
    $('filter-tags').innerHTML=state.tagVocabulary.map(t=>chip(t,filters.has(t.id))).join('');
    $('capture-page').hidden=listRoute!=='#/home';
    document.querySelectorAll('nav a[href^="#"]').forEach(a=>{
      if(a.hash===listRoute) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }
  function choose(id,shift) {
    const order=visibleAssets().map(a=>a.id), start=order.indexOf(anchor), end=order.indexOf(id);
    const ids=shift && start>=0 ? order.slice(Math.min(start,end),Math.max(start,end)+1) : [id];
    const select=!chosen.has(id);
    for(const item of ids) { if(select) chosen.add(item); else chosen.delete(item); }
    if(!shift || start<0) anchor=id;
    library(); document.querySelector('[data-select="'+id+'"]')?.focus();
  }
  function previewText(a) {
    if (a.id===folder.id) return '已登錄成員：lecture.pdf';
    if (a.id===video.id) return '合成影片 · 02:00';
    return body(a);
  }
  function openPreview(id) {
    const preview=$('material-preview');
    $('preview-title').textContent=title(id);
    $('preview-content').innerHTML=id===pdf.id
      ? '<div class="synthetic-page"><strong>示範講義 · 第 2 頁</strong><p>操作紀錄對應實際完成的動作。</p></div>'
      : '<div class="synthetic-video"><span aria-hidden="true">▶</span><p>示範影片 · 00:45–01:00</p><p>這段示範如何記錄操作與來源。</p></div>';
    preview.showModal();
    $('close-preview').focus();
  }
  function closePreview() {
    $('material-preview').close();
    $('preview-trigger')?.focus();
  }
  function assetView() {
    const a=asset(selected), editable=a.authority==='zafkiel-body';
    const tags=state.tagVocabulary.filter(t=>tagIds(a).includes(t.id));
    const available=state.tagVocabulary.filter(t=>!tagIds(a).includes(t.id));
    return `${editing?`<article class="keep editor"><label>顯示標題<input id="title" maxlength="100" value="${esc(title(selected))}"></label>
      ${editable?`<label>庫內正文<textarea id="body">${esc(body(a))}</textarea></label>`:'<p>外部原件 · 正文唯讀</p>'}
      <div class="toolbar"><span class="spacer"></span><button id="finishEdit" class="close-note">關閉</button></div></article>`:
      `<h1 id="asset-title" tabindex="-1">${esc(title(selected))}</h1><div class="chips">${tags.map(t=>chip(t)).join('')}</div>
      <article class="article">${esc(previewText(a))}</article>`}
      ${[pdf.id,video.id].includes(a.id) ? `<section id="asset-media" class="section" aria-label="資產素材"><h2>資產素材</h2>
      <button id="preview-trigger" data-preview="${a.id}" aria-haspopup="dialog">${a.id===pdf.id?'示範講義 · PDF':'示範教學影片 · 02:00'}　預覽</button></section>` : ''}
      <p class="meta">${editable?'庫內正文':'外部原件 · 唯讀'} · <code>${esc(a.path)}</code><br>資產 ID　<code>${esc(a.id)}</code></p>
      <section class="section"><h2>資產標籤</h2><label>既有標籤<select id="applyTag">${tagOptions(available)}</select></label>
      <button id="attach" ${available.length?'':'disabled'}>掛上標籤</button></section>
      <section class="section"><h2>關係與來源</h2><h3>連出關係</h3>${edges(false)}
      <h3>反向引用與連入關係</h3>${edges(true)}
      ${editable?`<h3>建立明確關係</h3><label>關係類型<select id="kind">${['explicit-reference','uses-material'].map(k=>option(k,kinds[k])).join('')}</select></label>
      <label>固定來源定位<select id="location">${locations.map((l,i)=>option(i,title(l.asset)+' · '+l.label)).join('')}</select></label><button id="addEdge">加入關係</button>`:''}</section>`;
  }
  function tagsView() {
    const tags = state.tagVocabulary;
    const current = tags.find(t=>t.id === editingTag) || tags[0];
    editingTag = current.id;
    const groups = id => state.tagGroups.map(g=>option(g.id,g.label,id)).join('');
    return `<div class="grid"><section class="panel"><h2>標籤詞彙</h2><p class="muted">群組用於分類。掛標籤只套用到選取的資產。</p>
      ${state.tagGroups.map(g=>`<div class="section"><h3>${esc(g.label)}</h3>${tags.filter(t=>t.group===g.id).map(t=>`<span class="chip">${esc(t.name)}${t.aliases.length?'（'+esc(t.aliases.join('、'))+'）':''}</span>`).join('') || '尚無標籤'}</div>`).join('')}</section>
      <section class="panel"><h2>管理詞彙</h2>${owner()?'':'<p>API-client 僅能在資產整理使用既有標籤。</p>'}
      <fieldset ${owner()?'':'disabled'}><label>編輯標籤<select id="editing">${tagOptions(tags,current.id)}</select></label>
      <label>名稱<input id="tagName" value="${esc(current.name)}"></label>
      <label>別名（以逗號或頓號分隔）<input id="aliases" value="${esc(current.aliases.join('、'))}"></label>
      <label>群組<select id="group">${groups(current.group)}</select></label><button id="updateTag">套用詞彙變更</button>
      <div class="section"><label>將選定標籤合併至<select id="targetTag">${tagOptions(tags.filter(t=>t.id!==current.id))}</select></label><button id="merge" ${tags.length<2?'disabled':''}>合併標籤</button></div></fieldset></section>
      <section class="panel"><h2>新增詞彙</h2><fieldset ${owner()?'':'disabled'}><label>新標籤名稱<input id="newName"></label>
      <label>所屬群組<select id="newGroup">${groups()}</select></label><button id="createTag">新增標籤</button>
      <div class="section"><label>新群組名稱<input id="groupName"></label><button id="createGroup">新增群組</button></div></fieldset></section></div>`;
  }
  function graphNode(id, key) {
    return `<button class="link" data-open="${esc(id)}" data-graph-focus="${esc(key)}">${esc(title(id))} · ${esc(id.slice(-8))}</button>`;
  }
  function graphView() {
    const scope = matchingAssets(), ids = new Set(scope.map(a=>a.id));
    const list = relations().filter(r => ids.has(r.from) && ids.has(r.to) &&
      (state.graphView === 'all' || r.kind === state.graphView));
    const isolated = scope.filter(a => !list.some(r => r.from===a.id || r.to===a.id));
    return `<section class="panel"><h2>資產關係圖</h2><p class="muted">沿用清單的名稱與標籤篩選。箭頭由建立關係的資產指向目標。實體包含取自固定登錄資料。</p>
      <label>顯示關係<select id="graphFilter">${Object.entries({all:'全部關係',...kinds}).map(([k,v])=>option(k,v,state.graphView)).join('')}</select></label>
      <div class="section">${list.map(r=>`<div class="graphline"><span class="node chip">${graphNode(r.from,r.id+'-from')}</span><span class="arrow">── ${kinds[r.kind]} · ${locatorLabel(r)} →</span><span class="node chip">${graphNode(r.to,r.id+'-to')}</span></div>`).join('') || '此類型尚無關係'}</div>
      ${isolated.length?`<div class="section"><h3>此檢視中的獨立節點</h3>${isolated.map(a=>`<span class="node chip">${graphNode(a.id,'isolated-'+a.id)}</span>`).join('')}</div>`:''}</section>`;
  }
  function render() {
    library();
    $('workspace').innerHTML=view==='tags'?tagsView():view==='graph'?graphView():view==='asset'?assetView():'';
    $('edit').hidden=view!=='asset'||editing;
    $('dirty').textContent=dirty ? '● 尚未儲存' : '○ 無待存變更';
    $('message').textContent=message;
  }
  const val = id => $(id).value.trim();
  const unique = items => [...new Set(items)];
  function manage(id) {
    if (!owner()) return status('此身分無法變更詞彙。');
    const tags = state.tagVocabulary;
    const current = tags.find(t=>t.id===editingTag);
    if (id==='createGroup') {
      const label = val('groupName');
      if (!label || state.tagGroups.some(g=>g.label===label)) return status('請輸入尚未使用的群組名稱。');
      state.tagGroups.push({id:crypto.randomUUID(),label});
      return apply('已建立群組。');
    }
    if (id==='merge') {
      const target = tags.find(t=>t.id===val('targetTag'));
      for (const a of assets()) {
        const ids = tagIds(a);
        if (ids.includes(current.id)) state.assetTagOpinions[a.id] = unique(ids.map(i=>i===current.id?target.id:i));
      }
      target.aliases = unique([...target.aliases,current.name,...current.aliases]);
      state.tagVocabulary = tags.filter(t=>t!==current);
      editingTag = target.id;
      return apply('已合併詞彙並更新掛用位置。');
    }
    const create = id==='createTag';
    const name = val(create?'newName':'tagName');
    const aliases = create ? [] : unique(val('aliases').split(/[,，、]/).map(s=>s.trim()).filter(Boolean));
    const names = [name,...aliases].map(s=>s.toLowerCase());
    const used = tags.filter(t=>create || t!==current).flatMap(t=>[t.name,...t.aliases]).map(s=>s.toLowerCase());
    if (!name || unique(names).length!==names.length || names.some(n=>used.includes(n))) return status('請使用非空白且未重複的名稱與別名。');
    const changes = {name,aliases,group:val(create?'newGroup':'group')};
    if (create) {
      editingTag = crypto.randomUUID();
      tags.push({id:editingTag,...changes});
    } else Object.assign(current,changes);
    apply(create?'已新增標籤。':'已套用詞彙變更。');
  }
  document.addEventListener('change',e=>{
    if (e.target.id==='editing') { editingTag=e.target.value; render(); $('editing').focus(); }
    if (e.target.id==='role') { render(); status('已切換模擬身分。'); }
    if (e.target.id==='graphFilter') { state.graphView=e.target.value; apply('已更新圖的顯示範圍。'); $('graphFilter').focus(); }
  });
  $('search').addEventListener('input',library);
  $('sheet').addEventListener('cancel',e=>{ e.preventDefault(); closeSheet(); });
  $('sheet').addEventListener('click',e=>{ if(e.target===$('sheet')) closeSheet(); });
  $('material-preview').addEventListener('cancel',e=>{ e.preventDefault(); closePreview(); });
  $('material-preview').addEventListener('click',e=>{ if(e.target===$('material-preview')) closePreview(); });
  window.addEventListener('hashchange',route);
  document.addEventListener('keydown',e=>{
    if(e.key==='Tab' && $('sheet').open && !$('material-preview').open) {
      const nodes=Array.from($('sheet').querySelectorAll('button:not(:disabled):not([hidden]),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]'))
        .filter(n=>n.getClientRects().length);
      const first=nodes[0], last=nodes.at(-1);
      if(nodes.length && (e.shiftKey ? document.activeElement===first : document.activeElement===last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    }
    if(!composerOpen && e.key==='Escape' && chosen.size && !$('sheet').open) {
      chosen.clear(); anchor=null; library(); $('home').focus();
    }
    if (composerOpen && (e.key==='Escape' || ((e.ctrlKey||e.metaKey) && e.key==='Enter'))) {
      e.preventDefault(); finishComposer();
    }
    if (editing && (e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); closeSheet(); }
  });
  document.addEventListener('click',e=>{
    if(composerOpen && !e.target.closest('#composer') && !finishComposer()) { e.preventDefault(); return; }
    const b=e.target.closest('a,button,input[type=checkbox]');
    if(!b || b.disabled) return;
    const id=b.id;
    if(b.dataset.select || (b.dataset.card && chosen.size)) {
      e.preventDefault(); choose(b.dataset.select||b.dataset.card,e.shiftKey); return;
    }
    if(b.dataset.panel) {
      location.hash='/'+b.dataset.panel; return;
    }
    if(b.dataset.open) {
      if(b.dataset.graphFocus) {
        history.replaceState({...history.state, vavGraphFocus:b.dataset.graphFocus},'');
      }
      location.hash='/assets/'+b.dataset.open; return;
    }
    if(b.dataset.filter) {
      const tag=b.dataset.filter;
      if(b.closest('#filter-tags')) {
        if(filters.has(tag)) filters.delete(tag); else filters.add(tag);
      } else { filters.clear(); filters.add(tag); }
      $('filter-panel').open=true;
      if($('sheet').open) { listRoute='#/home'; closeSheet(); }
      else {
        library();
        setTimeout(() => document.querySelector('#filter-tags [data-filter="'+tag+'"]')?.focus(), 50);
      }
      return;
    }
    if(id==='close-preview') { closePreview(); return; }
    if(b.dataset.preview) { openPreview(b.dataset.preview); return; }
    if(id==='clearSelection') { chosen.clear(); anchor=null; library(); $('home').focus(); return; }
    if(id==='edit') { editing=true; render(); $('title').focus(); return; }
    if(id==='close' || id==='finishEdit') return closeSheet();
    if(id==='open' || id==='new') {
      if(listRoute!=='#/home') { listRoute='#/home'; location.hash='/home'; library(); }
      openComposer(); return;
    }
    if(id==='complete') return finishComposer();
    if(id==='save') { storeOverview(); return; }
    if(id==='reset') {
      try { localStorage.removeItem(key); } catch { return status('重設失敗，請重試。'); }
      state=fresh(); selected=note.id; editingTag='python'; dirty=false; chosen.clear(); filters.clear(); anchor=null;
      $('search').value=''; $('role').value='owner'; returnFocus='home';
      location.hash='/home'; status('已重設 Vav 示範。'); route(); return;
    }
    if(['createGroup','merge','createTag','updateTag'].includes(id)) {
      manage(id); for(const t of filters) if(!state.tagVocabulary.some(v=>v.id===t)) filters.delete(t);
      return;
    }
    applyFields();
    if(b.dataset.remove) {
      state.authoredRelations=state.authoredRelations.filter(r=>r.id!==b.dataset.remove);
      apply('已移除連出關係。');
      setTimeout(() => ($('addEdge')||$('close')).focus(), 50);
      return;
    }
    if(id==='attach') {
      state.assetTagOpinions[selected]=unique([...tagIds(asset(selected)),val('applyTag')]);
      apply('已將標籤掛到此資產。');
      setTimeout(() => ($('applyTag')||$('close')).focus(), 50);
      return;
    }
    if(id==='addEdge') {
      const loc=locations[Number(val('location'))], kind=val('kind');
      if(state.authoredRelations.some(r=>r.from===selected && r.to===loc.asset && r.kind===kind &&
        JSON.stringify(r.locator)===JSON.stringify(loc.locator))) return status('此定位已存在相同關係。');
      state.authoredRelations.push({id:crypto.randomUUID(),kind,from:selected,to:loc.asset,locator:copy(loc.locator)});
      apply('已加入關係，目標資產可查看反向引用。');
      setTimeout(() => $('addEdge')?.focus(), 50);
    }
  });
  document.querySelectorAll('[data-panel]').forEach(b=>b.id='panel-'+b.dataset.panel);
  document.querySelectorAll('[data-icon]').forEach(n=>{
    n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+drawings[n.dataset.icon]+'</svg>';
  });
  route();
})();

"use strict";
(() => {
  const key = "zafkiel.demo.yud.v1";
  const { assets, contexts } = yudFixture;
  const $ = id => document.getElementById(id);
  const assetById = id => assets.find(asset => asset.id === id);
  const format = { text: "TXT", pdf: "PDF", video: "MP4" };
  const fresh = () => ({
    activeAssetId: null, positions: {}, capturedLocator: null,
    originContext: { index: 0, selected: null, checked: [], scroll: 0, returnToJump: false }, previewOpen: false
  });
  let state = fresh();
  const say = message => { $("status").textContent = message; };
  function element(tag, text, css) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (css) node.className = css;
    return node;
  }
  function button(text, action, css) {
    const node = element("button", text, css);
    node.onclick = action;
    return node;
  }
  function initial(asset) {
    if (asset.kind === "video") return { kind: "time-range", start: 0, end: 10 };
    return asset.kind === "pdf" ? { kind: "page", page: 1 } : { kind: "paragraph", paragraph: 1 };
  }
  function valid(asset, loc) {
    if (!asset || asset.unavailable || !loc || loc.kind !== initial(asset).kind) return false;
    if (asset.kind === "video") return Number.isInteger(loc.start) && Number.isInteger(loc.end)
      && loc.start >= 0 && loc.end <= asset.duration && loc.start < loc.end;
    const n = loc[loc.kind];
    return Number.isInteger(n) && n >= 1 && n <= (asset.pages || asset.paragraphs).length;
  }
  function restore(saved) {
    const next = fresh();
    const origin = saved.originContext;
    if (origin && Number.isInteger(origin.index) && contexts[origin.index]) {
      next.originContext = {
        index: origin.index, selected: contexts[origin.index].ids.includes(origin.selected) ? origin.selected : null,
        checked: contexts[origin.index].ids.filter(id => origin.checked?.includes(id)),
        scroll: Number.isFinite(origin.scroll) ? Math.max(0, origin.scroll) : 0,
        returnToJump: origin.returnToJump === true
      };
    }
    for (const asset of assets) {
      const loc = saved.positions?.[asset.id];
      if (valid(asset, loc)) next.positions[asset.id] = loc;
    }
    if (assetById(saved.activeAssetId)) next.activeAssetId = saved.activeAssetId;
    next.previewOpen = saved.previewOpen === true;
    const ticket = saved.capturedLocator;
    if (ticket && valid(assetById(ticket.assetId), ticket.locator)) next.capturedLocator = ticket;
    return next;
  }
  function renderCatalog(focus) {
    $("save").disabled = false;
    if ($("lightbox").open) $("lightbox").close();
    if ($("reader").open) $("reader").close();
    state.previewOpen = false;
    $("catalog-tools").append($("tools"));
    const origin = state.originContext;
    const ids = contexts[origin.index].ids;
    $("context").value = origin.index;
    $("count").textContent = ids.length + " 筆來源";
    $("catalog-title").textContent = ["首頁", "搜尋結果", "標籤 · Python", "圖位置 · 研究筆記"][origin.index];
    $("search").value = origin.index === 1 ? "示範" : "";
    $("home").setAttribute("aria-current", origin.index === 0 ? "page" : "false");
    $("filter").open = origin.index === 2;
    const list = $("sources");
    list.replaceChildren();
    for (const id of ids) {
      const asset = assetById(id);
      const row = button("", event => {
        if (origin.checked.length) {
          check.checked = !check.checked;
          check.onclick(event);
          list.querySelectorAll(".card-open")[ids.indexOf(id)].focus({ preventScroll: true });
          return;
        }
        origin.selected = id;
        origin.returnToJump = false;
        origin.scroll = $("catalog").scrollTop;
        openReader(id);
      }, "card-open");
      row.append(element("strong", asset.title), element("em", format[asset.kind] + " · " + asset.status), tags(asset));
      row.setAttribute("aria-current", String(origin.selected === id));
      const card = element("article", undefined, "asset-card");
      const check = element("input");
      check.type = "checkbox";
      check.className = "asset-select";
      check.setAttribute("aria-label", "選取資產 " + asset.title);
      check.checked = origin.checked.includes(id);
      card.classList.toggle("selected", check.checked);
      check.onclick = event => {
        const from = event.shiftKey ? ids.indexOf(origin.anchor) : -1;
        const to = ids.indexOf(id);
        const range = from < 0 ? [id] : ids.slice(Math.min(from, to), Math.max(from, to) + 1);
        origin.checked = ids.filter(item => range.includes(item) ? check.checked : origin.checked.includes(item));
        origin.anchor = id;
        origin.scroll = $("catalog").scrollTop;
        renderCatalog(false);
        list.querySelectorAll("input")[to].focus({ preventScroll: true });
      };
      card.append(check, row);
      list.append(card);
    }
    if (focus) (list.querySelector('[aria-current="true"]') || $("catalog-title")).focus({ preventScroll: true });
    list.classList.toggle("has-selection", !!origin.checked.length);
    $("selection").hidden = !origin.checked.length;
    $("selection").firstElementChild.textContent = "已選取 " + origin.checked.length + " 筆資產";
    $("catalog").scrollTop = origin.scroll;
  }
  function tags(asset) {
    const group = element("div", undefined, "chips");
    asset.tags.forEach(name => group.append(element("span", name, "chip")));
    return group;
  }
  function openReader(id, preview = false) {
    if ($("lightbox").open) $("lightbox").close();
    state.previewOpen = false;
    state.activeAssetId = id;
    const asset = assetById(id);
    if (!asset.unavailable) state.positions[id] ??= initial(asset);
    if (!$("reader").open) $("reader").showModal();
    $("title").textContent = asset.title;
    $("tags").replaceChildren(tags(asset));
    $("metadata").textContent = [asset.status, asset.library, asset.parent, asset.path].filter(Boolean).join(" ／ ");
    $("parking").append($("reading-content"));
    $("article").replaceChildren();
    $("reader-tools").append($("tools"));
    $("save").disabled = false;
    const hasMedia = asset.kind !== "text" && !asset.unavailable;
    $("material").hidden = !hasMedia;
    $("material").textContent = "開啟" + format[asset.kind] + "預覽";
    if (asset.kind === "text") {
      $("article").append($("reading-content"));
      renderContent();
    } else {
      $("article").textContent = asset.unavailable ? "來源不可用，無既有快取。" : asset.body || "";
    }
    $("title").focus();
    say("");
    if (hasMedia && preview) openPreview();
  }
  function openPreview() {
    state.previewOpen = true;
    $("media-title").textContent = assetById(state.activeAssetId).title;
    $("preview").append($("reading-content"));
    $("media-tools").append($("tools"));
    $("lightbox").showModal();
    renderContent();
  }
  function choose(loc, focusIndex) {
    state.positions[state.activeAssetId] = loc;
    renderContent();
    say("");
    $("content").querySelectorAll("button")[focusIndex]?.focus({ preventScroll: true });
  }
  function time(s) {
    return [Math.floor(s / 60), s % 60].map(n => String(n).padStart(2, "0")).join(":");
  }
  function renderVideo(asset, loc, content) {
    const screen = element("div", undefined, "screen");
    const clock = element("output");
    const track = element("div", undefined, "track");
    const marker = element("i");
    track.append(marker);
    screen.append(element("small", "示範時間軸 ／ " + time(asset.duration)), clock, track);
    const bounds = element("div", undefined, "range");
    const segments = asset.assetData.transcript.segments;
    const choices = element("fieldset");
    choices.append(element("legend", "影片內逐字稿"));
    function update() {
      clock.textContent = time(loc.start) + " – " + time(loc.end);
      marker.style.left = (100 * loc.start / asset.duration) + "%";
      marker.style.width = (100 * (loc.end - loc.start) / asset.duration) + "%";
      choices.querySelectorAll("button").forEach((btn, index) => {
        const segment = segments[index];
        btn.setAttribute("aria-pressed", String(segment.start === loc.start && segment.end === loc.end));
      });
    }
    const fields = {};
    for (const [name, label] of [["start", "起點（秒）"], ["end", "終點（秒）"]]) {
      const wrap = element("label", label);
      const input = element("input");
      input.type = "number";
      input.min = name === "start" ? 0 : 1;
      input.max = name === "end" ? asset.duration : asset.duration - 1;
      input.value = loc[name];
      fields[name] = input;
      input.oninput = () => {
        const range = { kind: "time-range", start: fields.start.valueAsNumber, end: fields.end.valueAsNumber };
        const ok = valid(asset, range);
        $("capture").disabled = !ok;
        $("save").disabled = !ok;
        if (!ok) return say("請輸入 0 至 120 的整秒，終點須晚於起點。");
        state.positions[asset.id] = loc = range;
        update();
        say("");
      };
      wrap.append(input);
      bounds.append(wrap);
    }
    segments.forEach(({ start, end, text }, index) => {
      const btn = button("", () => choose({ kind: "time-range", start, end }, index), "choice");
      btn.append(element("span", time(start) + " – " + time(end) + "　講者"), text);
      choices.append(btn);
    });
    content.append(screen, bounds, choices);
    update();
  }
  function renderContent() {
    const asset = assetById(state.activeAssetId);
    const content = $("content");
    const loc = state.positions[asset.id];
    content.replaceChildren();
    $("capture").disabled = false;
    $("save").disabled = false;
    if (asset.unavailable) return content.append(element("p", "目前只能檢視來源欄位，沒有可閱讀的頁面。"));
    if (asset.kind === "video") return renderVideo(asset, loc, content);
    if (asset.kind === "text") {
      asset.paragraphs.forEach((text, i) => {
        const btn = button("", () => choose({ kind: "paragraph", paragraph: i + 1 }, i), "choice");
        btn.append(element("span", "段落 " + (i + 1)), text);
        btn.setAttribute("aria-pressed", String(loc.paragraph === i + 1));
        content.append(btn);
      });
      return;
    }
    content.append(element("p", asset.body));
    const sheet = element("div", undefined, "sheet");
    sheet.append(element("small", "合成頁面 ／ " + loc.page + " of " + asset.pages.length),
      element("p", asset.pages[loc.page - 1]));
    const pager = element("div", "頁碼 ", "pager");
    asset.pages.forEach((_, i) => {
      const btn = button(String(i + 1), () => choose({ kind: "page", page: i + 1 }, i));
      btn.setAttribute("aria-pressed", String(loc.page === i + 1));
      pager.append(btn);
    });
    content.append(sheet, pager);
  }
  function renderTicket() {
    const ticket = state.capturedLocator;
    $("jump").disabled = !ticket;
    $("ticket").replaceChildren();
    if (!ticket) return $("ticket").append(element("p", "開啟來源，選取段落、頁碼或時間區間後擷取定位。"));
    $("ticket").append(element("strong", assetById(ticket.assetId).title),
      element("code", JSON.stringify(ticket, null, 2)));
  }
  contexts.forEach(({ label }, index) => $("context").add(new Option(label, index)));
  $("context").onchange = () => {
    state.originContext = { index: Number($("context").value), selected: null, checked: [], scroll: 0 };
    renderCatalog(false);
    say("");
  };
  function switchContext(index) {
    $("context").value = index;
    $("context").onchange();
  }
  $("home").onclick = () => switchContext(0);
  document.querySelector(".brand").onclick = event => { event.preventDefault(); switchContext(0); };
  $("tag").onclick = () => switchContext(2);
  $("search").onclick = () => switchContext(1);
  $("search").onkeydown = event => { if (event.key === "Enter") switchContext(1); };
  $("clear").onclick = () => {
    state.originContext.checked = [];
    renderCatalog(true);
  };
  $("material").onclick = openPreview;
  $("media-back").onclick = () => {
    $("lightbox").close();
    state.previewOpen = false;
    $("save").disabled = false;
    $("reader-tools").append($("tools"));
    $("material").focus();
    say("");
  };
  for (const [dialog, close] of [["reader", "back"], ["lightbox", "media-back"]]) {
    $(dialog).oncancel = event => { event.preventDefault(); $(close).click(); };
  }
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const close = $("lightbox").open ? "media-back" : $("reader").open ? "back" : null;
    if (!close) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    $(close).click();
  }, true);
  $("reader").onclick = event => {
    if (event.target !== $("reader")) return;
    const rect = $("reader").getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $("back").click();
  };
  $("back").onclick = () => {
    state.activeAssetId = null;
    renderCatalog(!state.originContext.returnToJump);
    if (state.originContext.returnToJump) $("jump").focus({ preventScroll: true });
    state.originContext.returnToJump = false;
    say("已返回「" + contexts[state.originContext.index].label + "」。");
  };
  $("capture").onclick = () => {
    const assetId = state.activeAssetId;
    state.capturedLocator = { assetId, locator: { ...state.positions[assetId] } };
    renderTicket();
    say("已擷取「" + assetById(assetId).title + "」的目前定位。");
  };
  $("jump").onclick = () => {
    const { assetId, locator } = state.capturedLocator;
    if (!state.activeAssetId) state.originContext.returnToJump = true;
    if (!state.activeAssetId) state.originContext.scroll = $("catalog").scrollTop;
    state.positions[assetId] = { ...locator };
    openReader(assetId, true);
    say("已開啟定位單指定的位置。");
  };
  $("save").onclick = () => {
    if (!state.activeAssetId) state.originContext.scroll = $("catalog").scrollTop;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      say("已保存目前閱讀位置、來源脈絡與定位單。");
    } catch { say("瀏覽器無法保存狀態，目前仍可繼續閱讀。"); }
  };
  $("reset").onclick = () => {
    try { localStorage.removeItem(key); }
    catch { return say("瀏覽器無法清除已存狀態。"); }
    state = fresh();
    renderCatalog(true);
    renderTicket();
    say("已重設本示範的閱讀狀態。");
  };
  try {
    const data = localStorage.getItem(key);
    if (data) state = restore(JSON.parse(data));
  } catch { say("無法載入已存閱讀狀態，已開啟初始清單。"); }
  const preview = state.previewOpen;
  renderCatalog(false);
  if (state.activeAssetId) openReader(state.activeAssetId, preview);
  renderTicket();
  if (!state.activeAssetId) $("catalog").scrollTop = state.originContext.scroll;
})();

(() => {
  "use strict";
  const key = "zafkiel.demo.tet.v1";
  const byId = id => document.getElementById(id);
  const base = {
    assetId: "22222222-2222-4222-8222-222222222222",
    path: "X:/Samples/Course/lecture.pdf", tags: ["Python", "課程"],
    size: 12345, contentGroup: "lecture-equal"
  };
  const backup = {
    ...base, assetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    path: "Y:/Samples/Backup/lecture.pdf"
  };
  const other = {
    ...base, assetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    path: "Y:/Samples/Other/lecture.pdf", tags: ["課程"], contentGroup: "lecture-different"
  };
  const scenarios = new Map([
    ["backup", { label: "備存目錄", peer: backup, available: true }],
    ["other", { label: "其他目錄", peer: other, available: true }],
    ["offline", { label: "備存目錄・來源離線", peer: backup, available: false }]
  ]);
  const labels = { equal: "內容相同", different: "內容不同", failed: "驗證失敗",
    pending: "驗證中", cancelled: "已取消" };
  const initial = () => ({
    candidates: [...scenarios.keys()], selection: "backup", requests: {}, results: {}
  });
  let comparison = initial();
  const snapshot = () => JSON.stringify(comparison);
  let saved = snapshot();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (!scenarios.has(data.selection) ||
          JSON.stringify(data.candidates) !== JSON.stringify(comparison.candidates)) {
        throw new Error("Incompatible snapshot");
      }
      const restored = initial();
      restored.selection = data.selection;
      for (const id of restored.candidates) {
        const result = data.results?.[id];
        if (["equal", "different"].includes(result)) restored.results[id] = result;
        const request = data.requests?.[id];
        if (["failed", "cancelled", "applied"].includes(request)) restored.requests[id] = request;
      }
      comparison = restored;
      saved = snapshot();
      byId("storage").textContent = "已載入上次保存的整理。";
    }
  } catch {
    byId("storage").textContent = "無法讀取本機整理，已開啟初始示範。";
  }

  const active = new Map();
  const shared = {
    assetId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    path: "X:/Samples/Shared/shared.md", tags: ["Orion"]
  };
  const titles = new Map([[base, "示範講義"], [backup, "講義副本候選"],
    [other, "同名講義候選"], [shared, "跨庫共用資產"]]);
  const selections = new Set();
  const cards = new Map();
  let viewed;
  let returnFocus;
  const reader = byId("reader");
  const preview = byId("preview");
  function openAsset(asset) {
    location.hash = "/assets/" + asset.assetId;
  }

  function refreshSelection() {
    for (const [asset, card] of cards) {
      card.classList.toggle("asset-selected", selections.has(asset));
      card.querySelector("input").checked = selections.has(asset);
    }
    byId("assets").classList.toggle("has-selection", selections.size > 0);
    byId("bulk").hidden = selections.size === 0;
    byId("selection-count").textContent = "已選取 " + selections.size + " 筆資產";
    byId("bulk-open").disabled = selections.size !== 2 || !selections.has(base) || selections.has(shared);
  }

  for (const [asset, title] of titles) {
    const card = document.createElement("article");
    card.className = "asset-card";
    const link = document.createElement("a");
    link.className = "card-open";
    link.href = "#/assets/" + asset.assetId;
    const heading = document.createElement("h2");
    heading.textContent = title;
    const path = document.createElement("p");
    path.textContent = asset.path;
    link.append(heading, path);
    for (const tag of asset.tags) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      link.append(chip);
    }
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "asset-select";
    checkbox.setAttribute("aria-label", "選取" + title);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selections.add(asset);
      else selections.delete(asset);
      refreshSelection();
    });
    link.addEventListener("click", event => {
      if (!selections.size) return;
      event.preventDefault();
      if (selections.has(asset)) selections.delete(asset);
      else selections.add(asset);
      refreshSelection();
      link.focus();
    });
    card.append(checkbox, link);
    cards.set(asset, card);
    byId("assets").append(card);
  }

  byId("bulk-open").addEventListener("click", () => {
    comparison.selection = selections.has(backup) ? "backup" : "other";
    openAsset(base);
  });
  byId("clear").addEventListener("click", () => {
    selections.clear();
    refreshSelection();
    cards.get(base).querySelector("input").focus();
  });
  byId("folder").addEventListener("click", () => {
    byId("folder").setAttribute("aria-pressed", "true");
    byId("picked").textContent = "已選取 /Samples/我的資產庫";
    byId("enter").disabled = false;
  });
  byId("enter").addEventListener("click", () => { location.hash = "/home"; });
  const options = new Map();
  for (const [id, scenario] of scenarios) {
    const option = new Option(scenario.label, id);
    options.set(id, option);
    byId("choices").add(option);
  }
  byId("choices").addEventListener("change", event => {
    comparison.selection = event.target.value;
    render();
  });

  function sourceCard(title, asset) {
    const section = document.createElement("section");
    section.className = "source";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const list = document.createElement("dl");
    for (const [label, value] of [
      ["來源位置", asset.path], ["已知大小", asset.size.toLocaleString("en-US") + " B"],
      ["既有標籤", asset.tags.join(" · ")]
    ]) {
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      term.textContent = label;
      definition.textContent = value;
      list.append(term, definition);
    }
    section.append(heading, list);
    return section;
  }

  function outcome(id) {
    const request = comparison.requests[id];
    return request === "applied" ? comparison.results[id] : request;
  }

  function render() {
    const id = comparison.selection;
    const status = outcome(id);
    for (const [candidate, option] of options) {
      const scenario = scenarios.get(candidate);
      option.textContent = scenario.label + " · " + (labels[outcome(candidate)] || "未驗證");
      option.disabled = (viewed === backup || viewed === other) && scenario.peer !== viewed;
    }
    byId("choices").value = id;
    byId("pair").replaceChildren(sourceCard("磁碟 A 庫", base), sourceCard("磁碟 B 庫", scenarios.get(id).peer));
    byId("count").textContent = Object.keys(comparison.results).length + " / 3 組已驗證";
    byId("status").textContent = ({
      pending: "已送出模擬請求，正在比對所選來源。",
      cancelled: "已取消這次請求。可重新驗證。",
      failed: "驗證失敗：此情境的 B 庫來源離線，無法判定內容。",
      equal: "內容相同。模擬比對已完成。",
      different: "內容不同。兩份同名講義的模擬內容有差異。"
    })[status] || "未驗證。同名、大小與標籤僅供篩選候選。";
    if (["pending", "cancelled"].includes(status) && comparison.results[id]) {
      byId("status").textContent += " 上次完成：" + labels[comparison.results[id]] + "。";
    }
    byId("verify").setAttribute("aria-disabled", String(status === "pending"));
    byId("verify").textContent = status === "failed" ? "重試驗證" :
      "模擬授權並驗證";
    byId("cancel").hidden = status !== "pending";
    byId("save").disabled = active.size > 0;
    if (active.size) byId("storage").textContent = "請在驗證完成或取消後保存。";
    else if (snapshot() !== saved) byId("storage").textContent = "目前整理尚未保存。";
    else byId("storage").textContent = storageNote;
  }

  let storageNote = byId("storage").textContent;
  byId("verify").addEventListener("click", () => {
    const id = comparison.selection;
    if (active.has(id)) return;
    // Request identity also invalidates a late reply after reset or cancel/retry.
    const token = {};
    active.set(id, token);
    comparison.requests[id] = "pending";
    render();
    setTimeout(() => {
      if (active.get(id) !== token) return;
      active.delete(id);
      const scenario = scenarios.get(id);
      if (scenario.available) {
        comparison.results[id] = base.contentGroup === scenario.peer.contentGroup ? "equal" : "different";
        comparison.requests[id] = "applied";
      } else {
        comparison.requests[id] = "failed";
      }
      render();
    }, 1400);
  });
  byId("cancel").addEventListener("click", () => {
    const id = comparison.selection;
    if (!active.delete(id)) return;
    comparison.requests[id] = "cancelled";
    render();
    byId("verify").focus();
  });
  byId("save").addEventListener("click", () => {
    if (active.size) return;
    try {
      localStorage.setItem(key, snapshot());
      saved = snapshot();
      storageNote = "已保存目前整理。";
      render();
    } catch {
      byId("storage").textContent = "本機儲存不可用，目前整理僅保留於本頁。";
    }
  });
  byId("reset").addEventListener("click", () => {
    try {
      localStorage.removeItem(key);
    } catch {
      byId("storage").textContent = "本機儲存不可用，重設未完成。";
      return;
    }
    active.clear();
    comparison = initial();
    saved = snapshot();
    storageNote = "已重設 Tet 的本機整理。";
    selections.clear();
    refreshSelection();
    if (viewed === other || viewed === backup) openAsset(base);
    returnFocus = cards.get(base).querySelector("a");
    render();
  });
  function closePreview() {
    if (!preview.open) return;
    preview.close();
    byId("material-open").focus();
  }
  byId("material-open").addEventListener("click", () => {
    preview.showModal();
    byId("preview-title").focus();
  });
  byId("preview-close").addEventListener("click", closePreview);
  preview.addEventListener("cancel", event => {
    event.preventDefault();
    closePreview();
  });
  preview.addEventListener("click", event => {
    if (event.target === preview) closePreview();
  });
  function closeAsset() {
    if (preview.open) closePreview();
    location.hash = "/home";
  }
  byId("close").addEventListener("click", closeAsset);
  reader.addEventListener("cancel", event => {
    event.preventDefault();
    closeAsset();
  });
  reader.addEventListener("click", event => {
    if (event.target === reader) closeAsset();
  });

  function route() {
    const hash = location.hash;
    const entry = !hash || hash === "#/entry";
    byId("entry").hidden = !entry;
    byId("workspace").hidden = entry;
    const asset = [...titles.keys()].find(item => hash === "#/assets/" + item.assetId);
    if (!asset) {
      if (preview.open) closePreview();
      if (reader.open) {
        reader.close();
        if (entry) byId("folder").focus();
        else {
          const focusTarget = returnFocus?.getClientRects().length ?
            returnFocus : cards.get(viewed || base).querySelector("a");
          focusTarget.focus();
        }
      }
      viewed = null;
      return;
    }
    if (preview.open && asset !== viewed) closePreview();
    viewed = asset;
    if (asset === other) comparison.selection = "other";
    if (asset === backup && comparison.selection === "other") comparison.selection = "backup";
    byId("asset-title").textContent = titles.get(asset);
    byId("asset-path").textContent = asset.path;
    byId("structural").hidden = asset !== shared;
    byId("asset-media").hidden = asset === shared;
    byId("content").hidden = asset === shared;
    render();
    if (!reader.open) {
      returnFocus = document.activeElement === byId("bulk-open") ? byId("bulk-open") :
        cards.get(asset).querySelector("a");
      reader.showModal();
    }
    byId("asset-title").focus();
  }
  window.addEventListener("hashchange", route);
  render();
  route();
})();

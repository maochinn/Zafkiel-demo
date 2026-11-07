"use strict";
const yudFixture = (() => {
  const note = {
    id: "44444444-4444-4444-8444-444444444444", title: "研究筆記", kind: "text",
    path: "X:/Samples/Notes/research.md", status: "庫內正文", library: "磁碟 A 庫",
    tags: ["Orion"], paragraphs: ["保存具體來源，正式結論另經採用流程。", "複查講義時，先記下所讀頁碼，再核對影片示範的起訖時間。", "返回來源清單後，從同一段繼續閱讀。"]
  };
  const pdf = {
    id: "22222222-2222-4222-8222-222222222222", title: "示範講義", kind: "pdf",
    path: "X:/Samples/Course/lecture.pdf", status: "來源可讀", library: "磁碟 A 庫", parent: "課程包",
    tags: ["Python", "課程"], body: "準備資料。記錄動作與來源。核對成果再返回。",
    pages: ["先確認輸入資料與工作目的。", "操作紀錄對應實際完成的動作。", "成果保留來源定位以便核對。"]
  };
  const video = {
    id: "33333333-3333-4333-8333-333333333333", title: "示範教學影片", kind: "video",
    path: "X:/Samples/Course/lesson.mp4", status: "來源離線 · 既有快取可讀", library: "磁碟 A 庫", duration: 120,
    tags: ["Python", "課程"], assetData: { transcript: { segments: [
      { start: 10, end: 24, text: "先找到來源，再決定需要哪些內容。" },
      { start: 45, end: 60, text: "這段示範如何記錄操作與來源。" },
      { start: 90, end: 110, text: "核對成果後，返回原本的閱讀位置。" }
    ] } }
  };
  const unavailable = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "講義副本候選", kind: "pdf",
    path: "Y:/Samples/Backup/lecture.pdf", status: "來源不可用 · 無快取", library: "磁碟 B 庫", tags: ["Python", "課程"], unavailable: true
  };
  const assets = [note, pdf, video, unavailable];
  return {
    assets,
    contexts: [
      { label: "我的資產庫 ／ 固定來源", ids: assets.map(asset => asset.id) },
      { label: "固定查詢 ／ 示範", ids: [pdf.id, video.id] },
      { label: "標籤條件 ／ Python", ids: [pdf.id, video.id, unavailable.id] },
      { label: "圖位置 ／ 研究筆記的引用", ids: [video.id] }
    ]
  };
})();

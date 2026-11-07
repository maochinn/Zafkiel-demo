const VAV_FIXTURE = {
  "assets": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "title": "課程包",
      "kind": "folder",
      "path": "X:/Samples/Course",
      "authority": "external-file",
      "body": "",
      "tags": [
        "course"
      ]
    },
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "title": "示範講義",
      "kind": "pdf",
      "path": "X:/Samples/Course/lecture.pdf",
      "authority": "external-file",
      "body": "準備資料。記錄動作與來源。核對成果再返回。",
      "tags": [
        "python",
        "course"
      ]
    },
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "title": "示範教學影片",
      "kind": "video",
      "path": "X:/Samples/Course/lesson.mp4",
      "authority": "external-file",
      "body": "",
      "tags": [
        "python",
        "course"
      ]
    },
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "title": "研究筆記",
      "kind": "text",
      "path": "X:/Samples/Notes/research.md",
      "authority": "zafkiel-body",
      "body": "保存具體來源，正式結論另經採用流程。",
      "tags": [
        "orion"
      ]
    }
  ],
  "tags": [
    {
      "id": "python",
      "name": "Python",
      "group": "topic",
      "aliases": []
    },
    {
      "id": "course",
      "name": "課程",
      "group": "purpose",
      "aliases": []
    },
    {
      "id": "learning",
      "name": "學習",
      "group": "purpose",
      "aliases": []
    },
    {
      "id": "orion",
      "name": "Orion",
      "group": "project",
      "aliases": []
    }
  ],
  "groups": [
    {
      "id": "topic",
      "label": "主題"
    },
    {
      "id": "purpose",
      "label": "用途"
    },
    {
      "id": "project",
      "label": "專案"
    }
  ],
  "relations": [
    {
      "id": "rel-1",
      "kind": "physically-contains",
      "from": "11111111-1111-4111-8111-111111111111",
      "to": "22222222-2222-4222-8222-222222222222",
      "evidence": "明確登錄的資料夾成員"
    },
    {
      "id": "rel-2",
      "kind": "explicit-reference",
      "from": "44444444-4444-4444-8444-444444444444",
      "to": "33333333-3333-4333-8333-333333333333",
      "locator": {
        "kind": "time-range",
        "start": 45,
        "end": 60
      },
      "evidence": "明確保存的引用"
    }
  ]
};
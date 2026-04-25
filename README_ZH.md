# HackMD Editor Toolkit

支援 Chrome 與 Microsoft Edge 的瀏覽器擴充套件，使用 Vue 3、Tailwind CSS、Vite 與 Manifest V3 建立。

## 展示影片

https://github.com/user-attachments/assets/5bcff155-1d24-4f7f-8353-468b8acb84bd

## 目前功能

- HackMD 雙欄編輯模式預覽圖片拖曳縮放
- 將縮放結果寫回 HackMD markdown 圖片語法，例如 `=300x`
- Popup 內提供模組化功能開關
- 新功能可透過集中設定檔管理預設是否啟用
- 提供 build、validate、zip 流程

## 專案結構

```text
src/
  background/      背景 service worker
  content/         content script 與功能模組
  popup/           Vue popup UI
  shared/          共用型別、設定、storage
  styles/          Tailwind 入口
scripts/           驗證與打包腳本
public/icons/      extension icons
```

## 開發

```bash
npm install
npm run dev
```

`npm run dev` 會持續監看並輸出到 `dist/`，適合用「載入未封裝項目」方式在 Chrome / Edge 測試。

## 驗證

```bash
npm run check
```

## 產出 zip

```bash
npm run zip
```

輸出檔案會在 `artifacts/hackmd-editor-toolkit.zip`。

## 載入方式

1. 執行 `npm run build`
2. 開啟 Chrome 或 Edge 的擴充管理頁
3. 開啟開發人員模式
4. 選擇「載入未封裝項目」並指向 `dist/`

## 設定預設開關

功能與預設值集中在 `src/shared/config/features.ts`。
新增功能時：

1. 在 `src/shared/types/settings.ts` 加入新的 `FeatureId`
2. 在 `src/shared/config/features.ts` 加入功能描述與 `defaultEnabled`
3. 在 `src/content/features/` 新增功能模組並匯出

既有使用者會在下次啟動時自動補齊新的預設設定。

## 已知限制

- 目前圖片 markdown 回寫以標準 `![](url =300x)` 形式為主
- 若同一張圖片網址在同一篇筆記中出現多次，現在會先更新第一個符合項目
- 目前先鎖定 `https://hackmd.io/*`

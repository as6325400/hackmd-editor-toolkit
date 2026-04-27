export const languageDefinitions = [
  {
    code: 'zh-TW',
    label: '繁體中文',
  },
  {
    code: 'en',
    label: 'English',
  },
] as const

export type LanguageCode = (typeof languageDefinitions)[number]['code']

const englishMessages = {
  'app.brand': 'HackMD Editor Toolkit',
  'app.title': 'Editor tools',
  'app.description': 'Small workflow upgrades for HackMD editing, previewing, and markdown formatting.',
  'app.notice': 'Enable the tools you want to use. Changes apply automatically on HackMD tabs after settings sync.',
  'app.loading': 'Loading settings...',
  'app.readError': 'Failed to load settings',
  'app.updateError': 'Failed to update settings',
  'settings.language': 'Language',
  'settings.languageHelp': 'Choose the popup and toolbar language.',
  'feature.statusOn': 'ON',
  'feature.statusOff': 'OFF',
  'feature.hackmdImageResize.title': 'HackMD image resize',
  'feature.hackmdImageResize.description':
    'Shows a resize handle on preview images in HackMD split mode and writes the selected size back to markdown, such as =300x or =50%x.',
  'feature.showResizeHints.title': 'Show image resize hints',
  'feature.showResizeHints.description': 'Shows resize controls and current size hints when hovering preview images.',
  'feature.hackmdTableInsert.title': 'HackMD table picker',
  'feature.hackmdTableInsert.description':
    'Adds a Word-style table picker to the HackMD editor toolbar and inserts the selected markdown table at the cursor.',
  'feature.previewSourceLocator.title': 'Preview source locator',
  'feature.previewSourceLocator.description':
    'Highlights the matching markdown line in the editor when you select text in the HackMD preview pane.',
  'feature.pdfExportButton.title': 'PDF export button',
  'feature.pdfExportButton.description': 'Adds a floating button on HackMD pages for exporting the current note as PDF.',
  'content.imageResize.defaultLabel': 'Drag to resize image',
  'content.imageResize.handleTitle': 'Resize image',
  'content.imageResize.saved': 'px written to markdown',
  'content.imageResize.writeFailed': 'px, preview updated but markdown write failed',
  'content.imageResize.matchFailed': 'px, could not find matching markdown image',
  'content.tableInsert.buttonLabel': 'Insert table',
  'content.tableInsert.cellLabel': 'columns, rows',
} as const

export type TranslationKey = keyof typeof englishMessages

export const messages: Record<LanguageCode, Record<TranslationKey, string>> = {
  'zh-TW': {
    'app.brand': 'HackMD Editor Toolkit',
    'app.title': '編輯工具',
    'app.description': '替 HackMD 編輯、預覽與 Markdown 格式補上一些順手的小工具。',
    'app.notice': '開啟你想使用的工具。設定同步後，HackMD 分頁會自動套用變更。',
    'app.loading': '正在讀取設定...',
    'app.readError': '讀取設定失敗',
    'app.updateError': '更新設定失敗',
    'settings.language': '語言',
    'settings.languageHelp': '選擇 popup 與工具列提示使用的語言。',
    'feature.statusOn': '開啟',
    'feature.statusOff': '關閉',
    'feature.hackmdImageResize.title': 'HackMD 圖片拖曳縮放',
    'feature.hackmdImageResize.description':
      '在 HackMD 雙欄模式的預覽圖片上顯示縮放控制點，拖曳後會把尺寸寫回 Markdown，例如 =300x 或 =50%x。',
    'feature.showResizeHints.title': '顯示圖片縮放提示',
    'feature.showResizeHints.description': '滑過預覽圖片時顯示縮放控制與目前尺寸提示。',
    'feature.hackmdTableInsert.title': 'HackMD 表格拉選工具',
    'feature.hackmdTableInsert.description':
      '在 HackMD 編輯工具列加入 Word 式表格拉選器，並在目前游標位置插入選定大小的 Markdown 表格。',
    'feature.previewSourceLocator.title': '預覽內容定位',
    'feature.previewSourceLocator.description':
      '在 HackMD 預覽區框選文字時，高亮左側最可能對應的 Markdown 行，方便快速找到要修改的位置。',
    'feature.pdfExportButton.title': 'PDF 匯出按鈕',
    'feature.pdfExportButton.description': '在 HackMD 頁面加入浮動按鈕，用來將目前筆記匯出成 PDF。',
    'content.imageResize.defaultLabel': '拖曳調整圖片大小',
    'content.imageResize.handleTitle': '調整圖片大小',
    'content.imageResize.saved': 'px 已寫回 Markdown',
    'content.imageResize.writeFailed': 'px，預覽已更新但寫回 Markdown 失敗',
    'content.imageResize.matchFailed': 'px，找不到對應的 Markdown 圖片語法',
    'content.tableInsert.buttonLabel': '插入表格',
    'content.tableInsert.cellLabel': '欄，列',
  },
  en: englishMessages,
}

export function getMessage(language: LanguageCode, key: TranslationKey) {
  return messages[language]?.[key] ?? messages['zh-TW'][key]
}

import type { FeatureDefinition } from '../types/settings'

export const featureDefinitions: FeatureDefinition[] = [
  {
    id: 'hackmdImageResize',
    title: 'HackMD 圖片拖曳縮放',
    description:
      '在 HackMD 雙欄編輯模式的預覽圖片上顯示 resize 控制點，拖曳後會把尺寸寫回 markdown 圖片語法，例如 =300x 或 =50%x。',
    defaultEnabled: true,
  },
  {
    id: 'showResizeHints',
    title: '顯示圖片縮放提示',
    description: '滑過預覽圖片時顯示縮放控制與目前尺寸提示。',
    defaultEnabled: true,
  },
  {
    id: 'hackmdTableInsert',
    title: 'HackMD 表格插入工具',
    description: '在 HackMD 編輯工具列加入表格按鈕，可像 Word 一樣拖曳選擇列欄數，並在目前游標插入 markdown 表格。',
    defaultEnabled: true,
  },
]

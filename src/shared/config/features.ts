import type { FeatureDefinition } from '../types/settings'

export const featureDefinitions: FeatureDefinition[] = [
  {
    id: 'hackmdImageResize',
    title: 'HackMD 雙欄圖片拖曳縮放',
    description:
      '在 HackMD 雙欄編輯模式的預覽圖片上顯示 resize 控制點，拖曳後會把尺寸寫回 markdown 圖片語法，例如 =300x 或 =50%x。',
    defaultEnabled: true,
  },
  {
    id: 'showResizeHints',
    title: '顯示縮放提示',
    description: '在可調整的圖片右下角顯示提示角標，方便辨識哪些圖片可被拖曳調整。',
    defaultEnabled: true,
  },
]

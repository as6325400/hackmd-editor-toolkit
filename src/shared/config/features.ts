import type { FeatureDefinition } from '../types/settings'

export const featureDefinitions: FeatureDefinition[] = [
  {
    id: 'hackmdImageResize',
    titleKey: 'feature.hackmdImageResize.title',
    descriptionKey: 'feature.hackmdImageResize.description',
    defaultEnabled: true,
  },
  {
    id: 'showResizeHints',
    titleKey: 'feature.showResizeHints.title',
    descriptionKey: 'feature.showResizeHints.description',
    defaultEnabled: true,
    parentId: 'hackmdImageResize',
  },
  {
    id: 'hackmdTableInsert',
    titleKey: 'feature.hackmdTableInsert.title',
    descriptionKey: 'feature.hackmdTableInsert.description',
    defaultEnabled: true,
  },
  {
    id: 'previewSourceLocator',
    titleKey: 'feature.previewSourceLocator.title',
    descriptionKey: 'feature.previewSourceLocator.description',
    defaultEnabled: true,
  },
  {
    id: 'pdfExportButton',
    titleKey: 'feature.pdfExportButton.title',
    descriptionKey: 'feature.pdfExportButton.description',
    defaultEnabled: true,
  },
]

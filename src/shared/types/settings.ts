export type FeatureId = 'hackmdImageResize' | 'showResizeHints' | 'hackmdTableInsert'

export type FeatureDefinition = {
  id: FeatureId
  title: string
  description: string
  defaultEnabled: boolean
}

export type ExtensionSettings = {
  schemaVersion: number
  features: Record<FeatureId, boolean>
}

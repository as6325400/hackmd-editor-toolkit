import { ensureDefaultSettings } from '../shared/storage/settings'

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaultSettings()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureDefaultSettings()
})

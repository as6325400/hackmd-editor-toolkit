import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'HackMD Editor Toolkit',
  short_name: 'Editor Toolkit',
  description:
    'Chrome/Edge extension for HackMD with toggleable features, starting with draggable image resize that writes HackMD markdown size syntax back into the editor.',
  version: '0.1.1',
  minimum_chrome_version: '114',
  permissions: ['storage'],
  host_permissions: ['https://hackmd.io/*'],
  icons: {
    16: 'public/icons/icon-16.png',
    32: 'public/icons/icon-32.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
  action: {
    default_title: 'HackMD Editor Toolkit',
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background/main.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://hackmd.io/*'],
      js: ['src/content/main.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      matches: ['https://hackmd.io/*'],
      resources: ['page-bridge.js'],
    },
  ],
})

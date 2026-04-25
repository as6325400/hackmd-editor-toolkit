# HackMD Editor Toolkit

English | [繁體中文](./README_ZH.md)

A browser extension for Chrome and Microsoft Edge, built with Vue 3, Tailwind CSS, Vite, and Manifest V3.

## Demo Video

https://github.com/user-attachments/assets/5bcff155-1d24-4f7f-8353-468b8acb84bd

## Current Features

- Draggable image resize in HackMD split editor mode preview
- Writes the resized result back to HackMD markdown image syntax, such as `=300x`
- Modular feature toggles in the popup UI
- Centralized default-enabled feature management for future features
- Build, validation, and zip packaging workflow included

## Project Structure

```text
src/
  background/      background service worker
  content/         content scripts and feature modules
  popup/           Vue popup UI
  shared/          shared types, config, storage
  styles/          Tailwind entry
scripts/           validation and packaging scripts
public/icons/      extension icons
```

## Development

```bash
npm install
npm run dev
```

`npm run dev` watches changes and outputs to `dist/`, which is suitable for loading the extension as an unpacked extension in Chrome or Edge.

## Validation

```bash
npm run check
```

## Build Zip Package

```bash
npm run zip
```

The output archives will be generated at:

- `artifacts/hackmd-editor-toolkit-v<version>.zip`
- `artifacts/hackmd-editor-toolkit.zip`

## Release

CI runs `npm run check` on pull requests and pushes to `main`.

To publish a GitHub Release with the packaged extension zip:

1. Update the version in both `package.json` and `manifest.config.ts`
2. Run `npm run check`
3. Create and push a matching tag, such as `v0.1.0`

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow validates that the tag matches the package and manifest version, builds the extension, and uploads the versioned zip to GitHub Releases.

Chrome Web Store and Microsoft Edge Add-ons publishing is intentionally manual for now, so store listing copy, screenshots, permissions, and review timing can be checked before submission.

## Load as an Unpacked Extension

1. Run `npm run build`
2. Open the Extensions management page in Chrome or Edge
3. Enable developer mode
4. Choose "Load unpacked" and select `dist/`

## Configure Default Feature Toggles

Feature definitions and default values are centralized in `src/shared/config/features.ts`.
When adding a new feature:

1. Add a new `FeatureId` in `src/shared/types/settings.ts`
2. Add the feature metadata and `defaultEnabled` in `src/shared/config/features.ts`
3. Add a new feature module under `src/content/features/` and export it

Existing users will automatically receive newly added default settings on the next startup.

## Known Limitations

- Markdown write-back currently targets the standard `![](url =300x)` format
- If the same image URL appears multiple times in the same note, the first matching entry is updated
- The extension currently targets `https://hackmd.io/*` only

# HackMD Editor Toolkit

English | [繁體中文](./README_ZH.md)

A browser extension for Chrome and Microsoft Edge, built with Vue 3, Tailwind CSS, Vite, and Manifest V3.

## Current Features

- Draggable image resize in HackMD split editor mode preview
- Writes the resized result back to HackMD markdown image syntax, such as `=300x`
- Modular feature toggles in the popup UI
- Centralized default-enabled feature management for future features
- Build, validation, and zip packaging workflow included

## Demo Video

Add your demo video here.

- Video link: `TBD`
- Preview image / GIF: `TBD`
- Notes: `TBD`

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

The output archive will be generated at `artifacts/hackmd-editor-toolkit.zip`.

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

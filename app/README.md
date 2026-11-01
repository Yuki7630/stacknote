# StackNote — Expo client

Block-based notes (text, bullet/checkbox list, table), saved on the device first and synced
to the `mock-cloud` server over REST. Runs in Expo Go SDK 57 (Android) and on the web.

Project overview, design decisions and limitations: [`../README.md`](../README.md).

## Run

1. Start the server (in `../mock-cloud`): `npm install`, then `npm run dev`
   (optional sample notes: `npm run db:seed`).
2. Copy `.env.example` to `.env` and set the server URL. A phone needs the computer's LAN IP and the same Wi-Fi:
   `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000` (the web build can use `http://localhost:4000`).
3. In this folder: `npm install`, then
   - `npx expo start` and scan the QR code with Expo Go, or
   - `npx expo start --web`.

## Check

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
```

Install Expo/native libraries with `npx expo install <pkg>` only, so versions match SDK 57.

## Folders

All source code is in `src/`. The `@/` import alias points to `src/`.

| Folder | Contents |
|---|---|
| `src/app/` | expo-router screens: note list (`index.tsx`), editor (`note/[id].tsx`) |
| `src/components/` | shared UI: auto-growing input, search bar, sync status, web drag list |
| `src/components/blocks/` | one component per block type, plus `BlockView` and the insert toolbar |
| `src/constants/` | theme colours and wide-screen layout |
| `src/store/` | zustand stores (notes, settings, sync status), block edit actions and AsyncStorage persistence |
| `src/sync/` | `CloudAdapter`, `MockCloudAdapter`, sync engine, auto sync |
| `src/types/note.ts` | data model (single source of truth) |
| `src/utils/` | helpers: block creation, list/table edits, CSV, search, preview, caret, dialogs |

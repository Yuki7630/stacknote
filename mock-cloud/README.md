# StackNote — mock cloud server

A local Express + SQLite server that stands in for a cloud backend, so the app's sync can be developed
and tested. Listens on `0.0.0.0:4000` so a phone on the same Wi-Fi can reach it.

Project overview: [`../README.md`](../README.md).

## Run

```bash
npm install
npm run dev        # tsx watch src/server.ts
npm run db:seed    # optional: adds sample notes, never deletes
```

The database is created at `data/notes.db` on first start.

`npm run db:drop` permanently deletes the database, after you type `yes` to confirm.

## API

Note routes need the header `Authorization: Bearer dev-token` (a fixed mock token).

| Route | Description |
|---|---|
| `GET /health` | Server check, no token needed |
| `GET /notes?since=<ms>` | Notes changed after `since`, including deleted ones |
| `PUT /notes/:id` | Saves the note only if its `updatedAt` is newer than the stored copy |

## Simulating a bad network

| Variable | Effect |
|---|---|
| `MOCK_DELAY_MS` | Adds a delay to each note request, in milliseconds |
| `MOCK_FAIL_RATE` | Share of note requests that fail with a 503, from 0 to 1 |

## Folders

| Path | Contents |
|---|---|
| `src/server.ts` | Express routes and mock network conditions |
| `src/db.ts` | SQLite setup and queries |
| `src/schema.ts` | zod copy of the app's data model |
| `scripts/` | `seed.ts` and `drop-db.ts` |
| `data/` | The SQLite database (not in git) |

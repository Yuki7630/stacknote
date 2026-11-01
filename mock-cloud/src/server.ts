import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

import { createNoteRepo, DB_PATH, openDb } from './db.js';
import { noteSchema } from './schema.js';

const PORT = 4000;
const HOST = '0.0.0.0';
const TOKEN = 'dev-token';

// Dev toggles for testing offline / error handling.
const MOCK_DELAY_MS = Math.max(0, Number(process.env.MOCK_DELAY_MS ?? 0) || 0);
const MOCK_FAIL_RATE = Math.min(1, Math.max(0, Number(process.env.MOCK_FAIL_RATE ?? 0) || 0));

const db = openDb();
const notes = createNoteRepo(db);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Public so a phone browser can check connectivity without a token.
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

function requireToken(req: Request, res: Response, next: NextFunction) {
  if (req.get('authorization') !== `Bearer ${TOKEN}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

async function mockConditions(_req: Request, res: Response, next: NextFunction) {
  if (MOCK_DELAY_MS > 0) await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  if (Math.random() < MOCK_FAIL_RATE) {
    res.status(503).json({ error: 'mock failure (MOCK_FAIL_RATE)' });
    return;
  }
  next();
}

const notesRouter = express.Router();
notesRouter.use(requireToken, mockConditions);

const sinceQuery = z.object({
  since: z.coerce.number().int().nonnegative().default(0),
});

notesRouter.get('/', (req, res) => {
  const parsed = sinceQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid since', issues: parsed.error.issues });
    return;
  }
  res.json(notes.since(parsed.data.since));
});

notesRouter.put('/:id', (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid note', issues: parsed.error.issues });
    return;
  }
  if (parsed.data.id !== req.params.id) {
    res.status(400).json({ error: 'id in path and body differ' });
    return;
  }
  const { applied, current } = notes.putIfNewer(parsed.data);
  res.json({ applied, note: current });
});

app.use('/notes', notesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`mock-cloud listening on http://${HOST}:${PORT}`);
  console.log(`database: ${DB_PATH} (WAL)`);
  console.log(`MOCK_DELAY_MS=${MOCK_DELAY_MS} MOCK_FAIL_RATE=${MOCK_FAIL_RATE}`);
});

// Close the database cleanly (checkpoints the WAL) when tsx watch restarts or on Ctrl+C.
function shutdown() {
  server.close();
  db.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

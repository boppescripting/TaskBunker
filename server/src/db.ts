import { createClient } from '@libsql/client'

export const db = createClient({
  url: process.env.LIBSQL_URL || 'file:./data/taskbunker.db'
})

export function parseBoard(row: Record<string, any>) {
  return { ...row, column_ids: JSON.parse((row.column_ids as string) || '[]') }
}

export function parseColumn(row: Record<string, any>) {
  return { ...row, card_ids: JSON.parse((row.card_ids as string) || '[]') }
}

export function parseCard(row: Record<string, any>) {
  return { ...row, labels: JSON.parse((row.labels as string) || '[]'), archived: Boolean(row.archived) }
}

export function parseChecklist(row: Record<string, any>) {
  return { ...row, checked: Boolean(row.checked) }
}

export async function initDb() {
  await db.executeMultiple(`
    PRAGMA journal_mode=WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'bg-sky-600',
      owner_id INTEGER NOT NULL,
      column_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_members (
      board_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (board_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      card_ids TEXT NOT NULL DEFAULT '[]',
      wip_limit INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      column_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_date TEXT,
      labels TEXT NOT NULL DEFAULT '[]',
      cover_color TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS card_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_assignees (
      card_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (card_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      card_id INTEGER,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Migrations for existing installs
  const cols = await db.execute("PRAGMA table_info(cards)")
  const colNames = cols.rows.map((r: any) => r.name)
  if (!colNames.includes('labels')) {
    await db.executeMultiple(`
      ALTER TABLE cards ADD COLUMN labels TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE cards ADD COLUMN cover_color TEXT;
      ALTER TABLE cards ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
    `)
  }
  if (!colNames.includes('wip_limit')) {
    // wip_limit is on columns
  }
  const colCols = await db.execute("PRAGMA table_info(columns)")
  const colColNames = colCols.rows.map((r: any) => r.name)
  if (!colColNames.includes('wip_limit')) {
    await db.execute("ALTER TABLE columns ADD COLUMN wip_limit INTEGER")
  }

  console.log('Database initialized')
}

export async function logActivity(boardId: number, userId: number, action: string, cardId?: number) {
  await db.execute({
    sql: 'INSERT INTO activity_log (board_id, card_id, user_id, action) VALUES (?, ?, ?, ?)',
    args: [boardId, cardId ?? null, userId, action]
  })
}

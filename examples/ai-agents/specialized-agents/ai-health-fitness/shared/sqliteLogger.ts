import Database from 'better-sqlite3';

export function logUserActivity(user: string, weight = '', workout = '', meal = '') {
  const db = new Database('health_data.db');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      weight TEXT,
      workout TEXT,
      meal TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(
    'INSERT INTO tracker (user, weight, workout, meal) VALUES (?, ?, ?, ?)'
  ).run(user, weight, workout, meal);

  db.close();
}
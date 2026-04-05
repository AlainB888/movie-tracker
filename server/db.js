import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "movies.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    rating INTEGER DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
    watched_in_theatre INTEGER DEFAULT 0,
    watch_count INTEGER DEFAULT 1,
    poster_path TEXT,
    release_year INTEGER,
    director TEXT,
    actors TEXT,
    genres TEXT,
    imdb_rating REAL,
    music_composer TEXT,
    is_masterpiece INTEGER DEFAULT 0,
    in_watchlist INTEGER DEFAULT 0,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Safe idempotent migrations — add new columns to existing databases without touching data
const existingColumns = db.pragma("table_info(movies)").map((c) => c.name);

if (!existingColumns.includes("music_composer")) {
  db.exec("ALTER TABLE movies ADD COLUMN music_composer TEXT");
}
if (!existingColumns.includes("is_masterpiece")) {
  db.exec("ALTER TABLE movies ADD COLUMN is_masterpiece INTEGER DEFAULT 0");
}
if (!existingColumns.includes("in_watchlist")) {
  db.exec("ALTER TABLE movies ADD COLUMN in_watchlist INTEGER DEFAULT 0");
}

export default db;

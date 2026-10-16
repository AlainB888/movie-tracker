import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const TMDB_API_KEY = process.env.API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

if (!TMDB_API_KEY) {
    console.error("❌ Error: API_KEY not found in .env");
    process.exit(1);
}

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "server", "movies.db");
console.log(`📂 Opening database at: ${DB_PATH}`);
const db = new Database(DB_PATH);

// Ensure runtime column exists
const existingColumns = db.pragma("table_info(movies)").map((c) => c.name);
if (!existingColumns.includes("runtime")) {
    console.log("Adding 'runtime' column to movies table...");
    db.exec("ALTER TABLE movies ADD COLUMN runtime INTEGER");
}

// Fetch all movies that either have NULL runtime or we want to backfill
const movies = db.prepare("SELECT id, tmdb_id, title FROM movies WHERE runtime IS NULL OR runtime = 0").all();
console.log(`🎬 Found ${movies.length} movies needing runtime updates.`);

if (movies.length === 0) {
    console.log("✅ All movies already have runtime populated!");
    process.exit(0);
}

const updateStmt = db.prepare("UPDATE movies SET runtime = ? WHERE id = ?");

let updatedCount = 0;
let skippedCount = 0;

for (const movie of movies) {
    if (!movie.tmdb_id) {
        console.warn(`⚠️ Skipping "${movie.title}" (ID ${movie.id}): No tmdb_id found.`);
        skippedCount++;
        continue;
    }

    try {
        const url = `${TMDB_BASE}/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Failed to fetch TMDB data for "${movie.title}" (${res.status})`);
            skippedCount++;
            continue;
        }

        const data = await res.json();
        const runtime = data.runtime;

        if (runtime) {
            updateStmt.run(runtime, movie.id);
            console.log(`✓ Updated "${movie.title}": ${runtime} mins (${Math.floor(runtime / 60)}h ${runtime % 60}m)`);
            updatedCount++;
        } else {
            console.log(`- "${movie.title}": No runtime reported by TMDB.`);
            skippedCount++;
        }

        // Small delay to prevent rate-limiting
        await new Promise((resolve) => setTimeout(resolve, 80));
    } catch (err) {
        console.error(`❌ Error updating "${movie.title}":`, err.message);
        skippedCount++;
    }
}

console.log("\n==============================");
console.log(`🎉 Done! Successfully updated ${updatedCount} movies (${skippedCount} skipped/not found).`);
console.log("==============================");

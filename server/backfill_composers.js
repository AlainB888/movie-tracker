import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const TMDB_API_KEY = process.env.API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

async function getMovieDetails(tmdbId) {
    const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB error: ${res.statusText}`);
    return res.json();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    console.log("Starting music composer backfill...");

    // Find movies without a music composer
    const movies = db.prepare("SELECT id, tmdb_id, title FROM movies WHERE music_composer IS NULL OR music_composer = ''").all();
    console.log(`Found ${movies.length} movies to backfill.`);

    let updated = 0;

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        try {
            const details = await getMovieDetails(movie.tmdb_id);
            const crew = details.credits?.crew || [];

            const music_composer =
                crew.find((c) => c.job === "Original Music Composer")?.name ||
                crew.find((c) => c.department === "Sound" && c.job === "Music")?.name ||
                null;

            if (music_composer) {
                db.prepare("UPDATE movies SET music_composer = ? WHERE id = ?").run(music_composer, movie.id);
                updated++;
                console.log(`[${i + 1}/${movies.length}] Yes - ${movie.title}: ${music_composer}`);
            } else {
                console.log(`[${i + 1}/${movies.length}] No  - ${movie.title}: Not found on TMDB`);
            }
        } catch (err) {
            console.error(`[${i + 1}/${movies.length}] Err - ${movie.title}: ${err.message}`);
        }

        // Sleep to avoid rate limiting
        await sleep(150);
    }

    console.log(`\nBackfill complete. Updated ${updated} movies.`);
}

run();

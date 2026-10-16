import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = 3000;
const TMDB_API_KEY = process.env.API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const OMDB_API_KEY = process.env.OMDB_API_KEY;

app.use(cors());
app.use(express.json());

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function searchTMDB(title, year) {
    // 1. Separate actual title from hint, separated by --
    let hint = null;
    let queryTitle = title;
    const splitIndex = title.indexOf('--');
    if (splitIndex !== -1) {
        queryTitle = title.substring(0, splitIndex).trim();
        hint = title.substring(splitIndex + 2).trim().toLowerCase();
    }

    let url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(queryTitle)}`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    if (!hint) {
        return data.results[0]; // No hint provided, return first match immediately
    }

    // 2. If hint provided, get top 20 results and find best match
    const topResults = data.results.slice(0, 20);

    // First check if hint matches any release year
    for (const result of topResults) {
        if (result.release_date && result.release_date.startsWith(hint)) {
            return result;
        }
    }

    // Then check details for director/actor matches (limit detail fetches to top 5 to avoid API rate limits)
    const detailResults = topResults.slice(0, 5);
    for (const result of detailResults) {
        const details = await getMovieDetails(result.id);
        const directorName = details.credits?.crew?.find(c => c.job === "Director")?.name?.toLowerCase() || "";
        const castNames = (details.credits?.cast || []).slice(0, 5).map(a => a.name.toLowerCase());

        if (directorName.includes(hint)) {
            return result;
        }

        for (const actor of castNames) {
            if (actor.includes(hint)) {
                return result;
            }
        }
    }

    // Fallback if hint didn't match anything
    return data.results[0];
}

async function getMovieDetails(tmdbId) {
    const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const res = await fetch(url);
    return res.json();
}

async function fetchIMDbRating(imdbId) {
    if (!OMDB_API_KEY || !imdbId) return null;
    try {
        const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
            return parseFloat(data.imdbRating);
        }
    } catch (err) {
        console.error("OMDB fetch failed:", err.message);
    }
    return null;
}

async function extractMetadata(details) {
    const crew = details.credits?.crew || [];

    const director = crew.find((c) => c.job === "Director")?.name || "Unknown";

    // Fetch music composer from TMDB credits
    const music_composer =
        crew.find((c) => c.job === "Original Music Composer")?.name ||
        crew.find((c) => c.department === "Sound" && c.job === "Music")?.name ||
        null;

    const actors = (details.credits?.cast || [])
        .slice(0, 5)
        .map((a) => a.name)
        .join(", ");

    const genres = (details.genres || []).map((g) => g.name).join(", ");

    // Try OMDB for real IMDb rating, fall back to TMDB vote_average
    const imdbRating = await fetchIMDbRating(details.imdb_id);
    const rating = imdbRating ?? (details.vote_average ? Math.round(details.vote_average * 10) / 10 : null);

    // Runtime in minutes
    const runtime = details.runtime || null;

    return {
        tmdb_id: details.id,
        title: details.title,
        poster_path: details.poster_path
            ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
            : null,
        release_year: details.release_date
            ? parseInt(details.release_date.split("-")[0], 10)
            : null,
        director,
        actors,
        genres,
        imdb_rating: rating,
        music_composer,
        runtime,
    };
}


// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/search?q=title&year=2010 — preview TMDB matches without adding
app.get("/api/search", async (req, res) => {
    try {
        const { q, year } = req.query;
        if (!q) return res.status(400).json({ error: "Query is required" });

        let url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}`;
        if (year) url += `&year=${year}`;
        const tmdbRes = await fetch(url);
        const data = await tmdbRes.json();
        if (!data.results) return res.json([]);

        const results = data.results.slice(0, 8).map((r) => ({
            tmdb_id: r.id,
            title: r.title,
            release_year: r.release_date ? parseInt(r.release_date.split("-")[0], 10) : null,
            release_date: r.release_date || null,
            poster_path: r.poster_path
                ? `https://image.tmdb.org/t/p/w200${r.poster_path}`
                : null,
        }));

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all movies (optionally filter watchlist vs. watched)
app.get("/api/movies", (req, res) => {
    try {
        const { watchlist } = req.query;
        let movies;
        if (watchlist === "1") {
            movies = db.prepare("SELECT * FROM movies WHERE in_watchlist = 1 ORDER BY date_added DESC").all();
        } else {
            movies = db.prepare("SELECT * FROM movies WHERE in_watchlist = 0 ORDER BY date_added DESC").all();
        }
        res.json(movies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single movie
app.get("/api/movies/:id", (req, res) => {
    try {
        const movie = db.prepare("SELECT * FROM movies WHERE id = ?").get(req.params.id);
        if (!movie) return res.status(404).json({ error: "Movie not found" });
        res.json(movie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — add single movie (search TMDB + merge user data)
app.post("/api/movies", async (req, res) => {
    try {
        const { title, year, rating = 0, watched_in_theatre = 0, watch_count = 1, in_watchlist = 0, tmdb_id: tmdbIdDirect } = req.body;

        let details;
        if (tmdbIdDirect) {
            // User picked a specific result from the preview — fetch by ID directly
            details = await getMovieDetails(tmdbIdDirect);
        } else {
            if (!title) return res.status(400).json({ error: "Title is required" });
            const searchResult = await searchTMDB(title, year);
            if (!searchResult) return res.status(404).json({ error: "Movie not found on TMDB" });
            details = await getMovieDetails(searchResult.id);
        }

        const meta = await extractMetadata(details);

        // Check if already exists
        const existing = db.prepare("SELECT id FROM movies WHERE tmdb_id = ?").get(meta.tmdb_id);
        if (existing) {
            return res.status(409).json({ error: "Movie already exists", id: existing.id });
        }

        const stmt = db.prepare(`
      INSERT INTO movies (tmdb_id, title, rating, watched_in_theatre, watch_count,
                          poster_path, release_year, director, actors, genres, imdb_rating,
                          music_composer, is_masterpiece, in_watchlist, runtime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

        const result = stmt.run(
            meta.tmdb_id,
            meta.title,
            in_watchlist ? 0 : rating,
            in_watchlist ? 0 : (watched_in_theatre ? 1 : 0),
            in_watchlist ? 0 : watch_count,
            meta.poster_path,
            meta.release_year,
            meta.director,
            meta.actors,
            meta.genres,
            meta.imdb_rating,
            meta.music_composer,
            in_watchlist ? 1 : 0,
            meta.runtime
        );

        const movie = db.prepare("SELECT * FROM movies WHERE id = ?").get(result.lastInsertRowid);
        res.status(201).json(movie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — bulk add movies
app.post("/api/movies/bulk", async (req, res) => {
    try {
        const { titles, in_watchlist = 0 } = req.body;
        if (!Array.isArray(titles) || titles.length === 0) {
            return res.status(400).json({ error: "An array of titles is required" });
        }

        const results = [];

        for (const entry of titles) {
            const entryTitle = typeof entry === 'string' ? entry : entry.title;
            const entryYear = typeof entry === 'string' ? null : entry.year;
            const trimmed = entryTitle?.trim();
            if (!trimmed) continue;

            try {
                const searchResult = await searchTMDB(trimmed, entryYear);
                if (!searchResult) {
                    results.push({ title: trimmed, status: "not_found" });
                    continue;
                }

                const details = await getMovieDetails(searchResult.id);
                const meta = await extractMetadata(details);

                const existing = db
                    .prepare("SELECT id FROM movies WHERE tmdb_id = ?")
                    .get(meta.tmdb_id);

                if (existing) {
                    results.push({ title: trimmed, status: "already_exists", id: existing.id });
                    continue;
                }

                const stmt = db.prepare(`
          INSERT INTO movies (tmdb_id, title, rating, watched_in_theatre, watch_count,
                              poster_path, release_year, director, actors, genres, imdb_rating,
                              music_composer, is_masterpiece, in_watchlist, runtime)
          VALUES (?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `);

                const insertResult = stmt.run(
                    meta.tmdb_id,
                    meta.title,
                    in_watchlist ? 0 : 1, // watch_count
                    meta.poster_path,
                    meta.release_year,
                    meta.director,
                    meta.actors,
                    meta.genres,
                    meta.imdb_rating,
                    meta.music_composer,
                    in_watchlist ? 1 : 0,
                    meta.runtime
                );

                results.push({ title: meta.title, status: "added", id: insertResult.lastInsertRowid });
            } catch (innerErr) {
                results.push({ title: trimmed, status: "error", error: innerErr.message });
            }
        }

        res.status(201).json({ results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — update movie fields
app.put("/api/movies/:id", (req, res) => {
    try {
        const movie = db.prepare("SELECT * FROM movies WHERE id = ?").get(req.params.id);
        if (!movie) return res.status(404).json({ error: "Movie not found" });

        const { rating, watched_in_theatre, watch_count, music_composer, is_masterpiece, in_watchlist } = req.body;

        // Enforce masterpiece rule: must have watch_count >= 2 AND rating = 5
        if (is_masterpiece === 1 || is_masterpiece === true) {
            const effectiveWatchCount = watch_count !== undefined ? watch_count : movie.watch_count;
            const effectiveRating = rating !== undefined ? rating : movie.rating;
            if (effectiveWatchCount < 2 || effectiveRating < 5) {
                return res.status(400).json({ error: "Masterpiece requires watch_count >= 2 and rating = 5" });
            }
        }

        const stmt = db.prepare(`
      UPDATE movies
      SET rating = COALESCE(?, rating),
          watched_in_theatre = COALESCE(?, watched_in_theatre),
          watch_count = COALESCE(?, watch_count),
          music_composer = COALESCE(?, music_composer),
          is_masterpiece = COALESCE(?, is_masterpiece),
          in_watchlist = COALESCE(?, in_watchlist)
      WHERE id = ?
    `);

        stmt.run(
            rating !== undefined ? rating : null,
            watched_in_theatre !== undefined ? (watched_in_theatre ? 1 : 0) : null,
            watch_count !== undefined ? watch_count : null,
            music_composer !== undefined ? music_composer : null,
            is_masterpiece !== undefined ? (is_masterpiece ? 1 : 0) : null,
            in_watchlist !== undefined ? (in_watchlist ? 1 : 0) : null,
            req.params.id
        );

        const updated = db.prepare("SELECT * FROM movies WHERE id = ?").get(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — promote a movie from watchlist to watched
app.post("/api/movies/:id/promote", (req, res) => {
    try {
        const movie = db.prepare("SELECT * FROM movies WHERE id = ?").get(req.params.id);
        if (!movie) return res.status(404).json({ error: "Movie not found" });

        db.prepare(`
      UPDATE movies SET in_watchlist = 0, watch_count = 1, rating = 0,
                        date_added = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

        const updated = db.prepare("SELECT * FROM movies WHERE id = ?").get(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// DELETE — remove a movie
app.delete("/api/movies/:id", (req, res) => {
    try {
        const movie = db.prepare("SELECT * FROM movies WHERE id = ?").get(req.params.id);
        if (!movie) return res.status(404).json({ error: "Movie not found" });

        db.prepare("DELETE FROM movies WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve the static files from the React app's build folder
app.use(express.static(path.join(__dirname, "../client/dist")));

// Catch-all: If the user requests any route, send them the React index.html
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`🎬 Movie Tracker server running on http://localhost:${PORT}`);
});

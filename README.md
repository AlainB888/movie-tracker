# Movie Tracker Application

This is a full-stack web application designed to track movies you've watched, manage a watchlist, and retrieve detailed movie information (including ratings, cast, and directors). 

## 🏗️ Project Structure

The project follows a simple monorepo structure, split into an independent React frontend (`client`) and an Express/Node backend (`server`).

```text
movies/
├── client/                 # Frontend React application
│   ├── public/             # Static assets
│   ├── src/                # React source code (Pages, Components, etc.)
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.js      # Vite build configuration
│   └── ...
├── server/                 # Backend Node.js/Express application
│   ├── server.js           # Main Express server and API route definitions
│   ├── db.js               # Database initialization and better-sqlite3 logic
│   ├── movies.db           # SQLite database file (where data is stored)
│   └── package.json        # Backend dependencies
├── data/                   # (Created when run with Docker) Database persistence directory
├── .env                    # Environment variables (API Keys config)
├── docker-compose.yml      # Docker compose configuration
├── Dockerfile              # Docker image build instructions
└── package.json            # Root package configuration (for unified execution)
```

## 🛠️ Tech Stack & Key Libraries

### Frontend (`/client`)
- **React (v19)**: Core UI framework.
- **Vite**: Ultra-fast development server and production bundler.
- **React Router DOM (v7)**: Handles client-side navigation between different pages (like Home vs. Watchlist).
- **Tailwind CSS**: Utility-first CSS framework for rapid and modern UI styling.
- **Lucide React**: Open-source, beautiful icon library used throughout the UI.

### Backend (`/server`)
- **Express.js**: Fast, unopinionated backend framework for Node to create the REST API.
- **Better-SQLite3**: The fastest SQLite3 library for Node.js, running synchronously for extreme performance without boilerplate. Allows SQLite files (`movies.db`) to provide self-contained data storage.
- **CORS**: Middleware to allow the frontend to access our API seamlessly without Cross-Origin errors.
- **Dotenv**: Automatically loads environment variables (like TMDB/OMDB API Keys) from the `.env` file.

## 🧠 Application Workflow & Important Info

1. **Movie API Integration**:
   The application heavily relies on external APIs to scrape high-quality movie metadata. 
   - **TMDB (The Movie Database)**: Searched first for general data like the poster path, title, genres, release year, and detailed cast/crew credits (including the director and composer). 
   - **OMDB API (Open Movie Database)**: Fallback used to pull the official IMDb rating specifically. 
   Keys for both APIs must be present in the `.env` file (`API_KEY` for TMDB, `OMDB_API_KEY` for OMDB).

2. **Backend Serving Frontend (Production)**:
   Notice that `server.js` serves static files dynamically via:
   ```javascript
   app.use(express.static(path.join(__dirname, "../client/dist")));
   ```
   This means that when you deploy the app, the frontend output (built by Vite) is served directly out of the same backend server on port `3000`. You only need to run the Node server in production.

3. **Database Rules & Enhancements**:
   The SQLite database incorporates features natively without needing high-level ORMs. For example:
   - Contains boolean flags (`is_masterpiece`, `in_watchlist`) and detailed text logs (`actors`, `director`, `genres`).
   - "Masterpiece" flags enforce strict validation natively inside `server.js` ensuring a movie is watched at least twice (`watch_count >= 2`) and rated exactly five stars (`rating = 5`).

## 🚀 Running the App

### Standard Development (Local)
For local development, you generally want hot-reloading for Vite and Node separately.
- **Frontend**: Navigate into `/client` and run `npm run dev`.
- **Backend**: Navigate into `/server` and run `npm run dev` (starts `node --watch`).

### Using Docker
1. Ensure your `.env` contains the required keys.
2. Run `docker-compose up --build -d` in the root folder.
3. Access the web app at `http://localhost:3000`.
4. Your `movies.db` runs safely inside the Docker container and its state is persisted transparently into the `data/` folder on your disk.

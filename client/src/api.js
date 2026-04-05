const API_BASE = '/api';

export async function fetchMovies() {
    const res = await fetch(`${API_BASE}/movies`);
    if (!res.ok) throw new Error('Failed to fetch movies');
    return res.json();
}

export async function fetchWatchlist() {
    const res = await fetch(`${API_BASE}/movies?watchlist=1`);
    if (!res.ok) throw new Error('Failed to fetch watchlist');
    return res.json();
}

export async function fetchMovie(id) {
    const res = await fetch(`${API_BASE}/movies/${id}`);
    if (!res.ok) throw new Error('Failed to fetch movie');
    return res.json();
}

export async function addMovie(movieData) {
    const res = await fetch(`${API_BASE}/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movieData),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add movie');
    }
    return res.json();
}

export async function bulkAddMovies(titles, in_watchlist = 0) {
    const res = await fetch(`${API_BASE}/movies/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles, in_watchlist }),
    });
    if (!res.ok) throw new Error('Failed to bulk add movies');
    return res.json();
}

export async function updateMovie(id, data) {
    const res = await fetch(`${API_BASE}/movies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update movie');
    return res.json();
}

export async function deleteMovie(id) {
    const res = await fetch(`${API_BASE}/movies/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete movie');
    return res.json();
}

export async function promoteFromWatchlist(id) {
    const res = await fetch(`${API_BASE}/movies/${id}/promote`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to promote movie from watchlist');
    return res.json();
}

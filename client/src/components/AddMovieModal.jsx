import { useState, useEffect, useRef } from 'react'
import { X, Film, Loader2, Plus, List, Bookmark, Search, ChevronRight } from 'lucide-react'
import { addMovie, bulkAddMovies, updateMovie, searchMovies } from '../api'
import StarRating from './StarRating'

export default function AddMovieModal({ onClose, onMovieAdded, defaultWatchlist = false }) {
    const [tab, setTab] = useState('single') // 'single' | 'bulk'

    // Single-add fields
    const [title, setTitle] = useState('')
    const [year, setYear] = useState('')
    const [rating, setRating] = useState(0)
    const [watchedInTheater, setWatchedInTheater] = useState(false)
    const [watchCount, setWatchCount] = useState(1)
    const [saveToWatchlist, setSaveToWatchlist] = useState(defaultWatchlist)

    // Search preview
    const [searchResults, setSearchResults] = useState(null) // null = not searched yet
    const [searching, setSearching] = useState(false)
    const [selectedMatch, setSelectedMatch] = useState(null) // the picked TMDB result

    // Bulk-add fields
    const [bulkText, setBulkText] = useState('')
    const [bulkYear, setBulkYear] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [bulkResults, setBulkResults] = useState(null)

    // Autofocus the title input when modal opens (single tab)
    const titleInputRef = useRef(null)
    useEffect(() => {
        if (tab === 'single') {
            const t = setTimeout(() => titleInputRef.current?.focus(), 50)
            return () => clearTimeout(t)
        }
    }, [tab])

    // Debounced search — fires 500ms after user stops typing
    const searchTimer = useRef(null)
    useEffect(() => {
        if (!title.trim()) {
            setSearchResults(null)
            setSelectedMatch(null)
            return
        }
        // If the user already picked a match and the title reflects it, don't re-search
        if (selectedMatch && selectedMatch.title === title) return

        clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(async () => {
            setSearching(true)
            setSelectedMatch(null)
            try {
                const results = await searchMovies(title.trim(), year || undefined)
                setSearchResults(results)
            } catch {
                setSearchResults([])
            } finally {
                setSearching(false)
            }
        }, 500)

        return () => clearTimeout(searchTimer.current)
    }, [title, year])

    function handlePickResult(result) {
        setSelectedMatch(result)
        setTitle(result.title)
        setSearchResults(null)
    }

    async function handleSingleSubmit(e) {
        e.preventDefault()
        if (!title.trim() && !selectedMatch) return
        setLoading(true)
        setError('')
        try {
            await addMovie({
                ...(selectedMatch
                    ? { tmdb_id: selectedMatch.tmdb_id }
                    : { title: title.trim(), year: year ? parseInt(year, 10) : undefined }),
                rating: saveToWatchlist ? 0 : rating,
                watched_in_theatre: saveToWatchlist ? 0 : (watchedInTheater ? 1 : 0),
                watch_count: saveToWatchlist ? 0 : watchCount,
                in_watchlist: saveToWatchlist ? 1 : 0,
            })
            onMovieAdded()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleBulkSubmit(e) {
        e.preventDefault()
        if (!bulkText.trim()) return
        setLoading(true)
        setError('')
        setBulkResults(null)
        try {
            const rawTitles = bulkText
                .split(/[,\n]+/)
                .map((t) => t.trim())
                .filter(Boolean)

            const parsedYear = bulkYear ? parseInt(bulkYear, 10) : null
            const titles = parsedYear
                ? rawTitles.map((t) => ({ title: t, year: parsedYear }))
                : rawTitles

            const result = await bulkAddMovies(titles, saveToWatchlist ? 1 : 0)
            setBulkResults(result.results)
            onMovieAdded()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleBulkRating(movieId, newRating) {
        try {
            await updateMovie(movieId, { rating: newRating })
            setBulkResults((prev) =>
                prev.map((r) => (r.id === movieId ? { ...r, rating: newRating } : r))
            )
            onMovieAdded()
        } catch (err) {
            console.error(err)
        }
    }

    const inputClass =
        'w-full px-4 py-3 bg-gray-800/80 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 transition-colors'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass-card w-full max-w-lg p-6 z-10 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold gradient-text-light flex items-center gap-2">
                        <Film size={22} />
                        Add Movie
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex mb-6 bg-gray-800/50 rounded-xl p-1">
                    <button
                        onClick={() => setTab('single')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'single'
                            ? 'bg-brand-700 text-white shadow-lg shadow-brand-900/30'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Plus size={16} /> Single
                    </button>
                    <button
                        onClick={() => setTab('bulk')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'bulk'
                            ? 'bg-brand-700 text-white shadow-lg shadow-brand-900/30'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <List size={16} /> Bulk Add
                    </button>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* ─── Single Add Form ─── */}
                {tab === 'single' && (
                    <form onSubmit={handleSingleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Movie Title
                            </label>
                            <div className="relative">
                                {/* Title input */}
                                <div className="relative">
                                    <input
                                        ref={titleInputRef}
                                        type="text"
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value)
                                            if (selectedMatch) setSelectedMatch(null)
                                        }}
                                        placeholder="e.g. Inception"
                                        className={inputClass}
                                        autoComplete="off"
                                    />
                                    {searching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={16} className="animate-spin text-brand-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Selected match confirmation badge */}
                                {selectedMatch && (
                                    <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-brand-700/20 border border-brand-700/40 rounded-lg text-sm text-brand-400">
                                        <Search size={13} />
                                        <span className="truncate">{selectedMatch.title}</span>
                                        {selectedMatch.release_year && (
                                            <span className="shrink-0 text-gray-500">({selectedMatch.release_year})</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedMatch(null)
                                                setTitle('')
                                                titleInputRef.current?.focus()
                                            }}
                                            className="ml-auto shrink-0 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                )}

                                {/* Search results dropdown */}
                                {searchResults && searchResults.length > 0 && !selectedMatch && (
                                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-gray-900 border border-gray-700/60 rounded-xl overflow-hidden shadow-2xl">
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.tmdb_id}
                                                type="button"
                                                onClick={() => handlePickResult(result)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800/80 transition-colors text-left border-b border-gray-800/60 last:border-0"
                                            >
                                                {/* Poster thumbnail */}
                                                <div className="shrink-0 w-9 h-14 rounded-md overflow-hidden bg-gray-800 flex items-center justify-center">
                                                    {result.poster_path ? (
                                                        <img
                                                            src={result.poster_path}
                                                            alt={result.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Film size={14} className="text-gray-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-200 truncate">{result.title}</p>
                                                    {result.release_year && (
                                                        <p className="text-xs text-brand-400 mt-0.5">{result.release_year}</p>
                                                    )}
                                                </div>
                                                <ChevronRight size={14} className="shrink-0 text-gray-600" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* No results hint */}
                                {searchResults && searchResults.length === 0 && !searching && title.trim() && !selectedMatch && (
                                    <p className="mt-1.5 text-xs text-gray-500">No TMDB matches — will attempt a direct search on submit.</p>
                                )}
                            </div>
                        </div>

                        {/* Year — only show when no match is selected yet */}
                        {!selectedMatch && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Year <span className="text-gray-500 font-normal">(optional, narrows the search)</span>
                                </label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    placeholder="e.g. 2010"
                                    className="w-32 px-4 py-3 bg-gray-800/80 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 transition-colors"
                                />
                            </div>
                        )}

                        {/* Watchlist toggle */}
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/40">
                            <div className="flex items-center gap-2">
                                <Bookmark size={16} className={saveToWatchlist ? 'text-brand-400' : 'text-gray-500'} />
                                <span className="text-sm font-medium text-gray-300">Add to Watch Later</span>
                                <span className="text-xs text-gray-500">(haven't watched yet)</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSaveToWatchlist(!saveToWatchlist)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${saveToWatchlist
                                    ? 'bg-brand-700/20 border-brand-700/50 text-brand-400'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'
                                    }`}
                            >
                                {saveToWatchlist ? 'Yes' : 'No'}
                            </button>
                        </div>

                        {/* Rating + theater + watch count only when NOT saving to watchlist */}
                        {!saveToWatchlist && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                        Your Rating
                                    </label>
                                    <StarRating
                                        rating={rating}
                                        size={24}
                                        interactive
                                        onChange={setRating}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-300">
                                        Watched in Theater?
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setWatchedInTheater(!watchedInTheater)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${watchedInTheater
                                            ? 'bg-brand-700/20 border-brand-700/50 text-brand-400'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'
                                            }`}
                                    >
                                        {watchedInTheater ? 'Yes' : 'No'}
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                        Watch Count
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={watchCount}
                                        onChange={(e) => setWatchCount(parseInt(e.target.value) || 1)}
                                        className="w-24 px-4 py-3 bg-gray-800/80 border border-gray-700/60 rounded-xl text-white focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 transition-colors"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (!title.trim() && !selectedMatch)}
                            className="w-full py-3 bg-gradient-to-r from-brand-900 to-brand-700 text-white font-semibold rounded-xl hover:from-brand-700 hover:to-brand-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-900/30"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : saveToWatchlist ? (
                                <Bookmark size={18} />
                            ) : (
                                <Plus size={18} />
                            )}
                            {loading
                                ? 'Adding...'
                                : saveToWatchlist
                                    ? 'Add to Watch Later'
                                    : 'Add Movie'}
                        </button>
                    </form>
                )}

                {/* ─── Bulk Add Form ─── */}
                {tab === 'bulk' && (
                    <form onSubmit={handleBulkSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Movie Titles
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                One title per line, or separated by commas.
                            </p>
                            <textarea
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                rows={6}
                                placeholder={"Inception\nThe Dark Knight\nInterstellar"}
                                className={`${inputClass} resize-none`}
                            />
                        </div>

                        {/* Optional year for bulk */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Year <span className="text-gray-500 font-normal">(optional, applied to all titles above)</span>
                            </label>
                            <input
                                type="number"
                                value={bulkYear}
                                onChange={(e) => setBulkYear(e.target.value)}
                                placeholder="e.g. 2010"
                                className="w-32 px-4 py-3 bg-gray-800/80 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !bulkText.trim()}
                            className="w-full py-3 bg-gradient-to-r from-brand-900 to-brand-700 text-white font-semibold rounded-xl hover:from-brand-700 hover:to-brand-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-900/30"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <List size={18} />
                            )}
                            {loading ? 'Processing...' : 'Bulk Add Movies'}
                        </button>

                        {/* Bulk Results with inline rating */}
                        {bulkResults && (
                            <div className="space-y-2 mt-4">
                                <h3 className="text-sm font-semibold text-gray-300">Results:</h3>
                                {bulkResults.map((r, i) => (
                                    <div
                                        key={i}
                                        className={`px-3 py-2.5 rounded-lg text-sm ${r.status === 'added'
                                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                                            : r.status === 'already_exists'
                                                ? 'bg-amber-500/10 border border-amber-500/20'
                                                : 'bg-red-500/10 border border-red-500/20'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`truncate mr-2 ${r.status === 'added'
                                                    ? 'text-emerald-400'
                                                    : r.status === 'already_exists'
                                                        ? 'text-amber-400'
                                                        : 'text-red-400'
                                                    }`}
                                            >
                                                {r.title}
                                            </span>
                                            <span
                                                className={`text-xs font-mono shrink-0 ${r.status === 'added'
                                                    ? 'text-emerald-400'
                                                    : r.status === 'already_exists'
                                                        ? 'text-amber-400'
                                                        : 'text-red-400'
                                                    }`}
                                            >
                                                {r.status === 'added'
                                                    ? '✓ Added'
                                                    : r.status === 'already_exists'
                                                        ? '● Exists'
                                                        : '✗ Not Found'}
                                            </span>
                                        </div>
                                        {/* Inline rating for newly added movies */}
                                        {r.status === 'added' && r.id && (
                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-500/10">
                                                <span className="text-xs text-gray-400">Rate:</span>
                                                <StarRating
                                                    rating={r.rating || 0}
                                                    size={14}
                                                    interactive
                                                    onChange={(newRating) => handleBulkRating(r.id, newRating)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    )
}

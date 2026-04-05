import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, SlidersHorizontal, ArrowUpDown, Film, X, Bookmark } from 'lucide-react'
import { fetchMovies } from '../api'
import MovieCard from '../components/MovieCard'
import AddMovieModal from '../components/AddMovieModal'
import SearchBar from '../components/SearchBar'

export default function HomePage() {
    const [movies, setMovies] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    // Search
    const [searchQuery, setSearchQuery] = useState('')

    // Sorting
    const [sortBy, setSortBy] = useState('date_added')
    const [sortDir, setSortDir] = useState('desc')

    // Filtering — seed from URL params
    const [showFilters, setShowFilters] = useState(false)
    const [filterGenre, setFilterGenre] = useState('')
    const [filterDirector, setFilterDirector] = useState('')
    const [filterActor, setFilterActor] = useState('')
    const [filterComposer, setFilterComposer] = useState('')

    // Initialise filters from URL on mount / param change
    useEffect(() => {
        const g = searchParams.get('genre') || ''
        const d = searchParams.get('director') || ''
        const a = searchParams.get('actor') || ''
        const c = searchParams.get('composer') || ''
        setFilterGenre(g)
        setFilterDirector(d)
        setFilterActor(a)
        setFilterComposer(c)
        if (g || d || a || c) setShowFilters(true)
    }, [searchParams])

    async function loadMovies() {
        try {
            const data = await fetchMovies()
            setMovies(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMovies()
    }, [])

    // Extract unique filter options
    const allGenres = useMemo(() => {
        const set = new Set()
        movies.forEach((m) =>
            m.genres?.split(', ').forEach((g) => g && set.add(g))
        )
        return [...set].sort()
    }, [movies])

    const allDirectors = useMemo(() => {
        const set = new Set()
        movies.forEach((m) => m.director && set.add(m.director))
        return [...set].sort()
    }, [movies])

    const allActors = useMemo(() => {
        const set = new Set()
        movies.forEach((m) =>
            m.actors?.split(', ').forEach((a) => a && set.add(a))
        )
        return [...set].sort()
    }, [movies])

    const allComposers = useMemo(() => {
        const set = new Set()
        movies.forEach((m) => m.music_composer && set.add(m.music_composer))
        return [...set].sort()
    }, [movies])

    // Filtered + Sorted
    const processedMovies = useMemo(() => {
        let result = [...movies]

        // Search filter (title, director, actors, composers)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            result = result.filter(
                (m) =>
                    m.title?.toLowerCase().includes(q) ||
                    m.director?.toLowerCase().includes(q) ||
                    m.actors?.toLowerCase().includes(q) ||
                    m.music_composer?.toLowerCase().includes(q)
            )
        }

        if (filterGenre) {
            result = result.filter((m) => m.genres?.includes(filterGenre))
        }
        if (filterDirector) {
            result = result.filter((m) => m.director === filterDirector)
        }
        if (filterActor) {
            result = result.filter((m) => m.actors?.includes(filterActor))
        }
        if (filterComposer) {
            result = result.filter((m) => m.music_composer === filterComposer)
        }

        result.sort((a, b) => {
            let valA, valB
            switch (sortBy) {
                case 'rating':
                    // Masterpieces always sort above regular 5-star movies
                    valA = a.is_masterpiece ? 6 : (a.rating || 0)
                    valB = b.is_masterpiece ? 6 : (b.rating || 0)
                    break
                case 'release_year':
                    valA = a.release_year || 0
                    valB = b.release_year || 0
                    break
                default:
                    valA = new Date(a.date_added).getTime()
                    valB = new Date(b.date_added).getTime()
            }
            return sortDir === 'desc' ? valB - valA : valA - valB
        })

        return result
    }, [movies, sortBy, sortDir, filterGenre, filterDirector, filterActor, filterComposer, searchQuery])

    const hasActiveFilters = filterGenre || filterDirector || filterActor || filterComposer
    function clearFilters() {
        setFilterGenre('')
        setFilterDirector('')
        setFilterActor('')
        setFilterComposer('')
        setSearchQuery('')
        setShowFilters(false)
        setSearchParams({})
    }

    // Build active-filter label for display
    const activeFilterLabel = [
        filterDirector && `Director: ${filterDirector}`,
        filterActor && `Actor: ${filterActor}`,
        filterComposer && `Composer: ${filterComposer}`,
        filterGenre && `Genre: ${filterGenre}`,
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-gray-800/70 bg-gray-950/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
                    {/* Logo + Title */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-900/40">
                            <Film size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold gradient-text-light tracking-tight">
                            Movie Tracker
                        </h1>
                    </div>

                    {/* Nav links */}
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-700/20 text-brand-400 border border-brand-700/40"
                        >
                            Library
                        </button>
                        <button
                            onClick={() => navigate('/watchlist')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-brand-400 hover:bg-gray-800 transition-all"
                        >
                            <Bookmark size={14} />
                            Watch Later
                        </button>
                    </div>

                    {/* Search bar */}
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />

                    {/* Add Movie button */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-900 to-brand-700 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-brand-400 transition-all duration-300 shadow-lg shadow-brand-900/30 hover:shadow-brand-700/30 shrink-0"
                    >
                        <Plus size={18} />
                        Add Movie
                    </button>
                </div>
            </header>

            {/* Controls */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                {/* Active filter banner */}
                {hasActiveFilters && (
                    <div className="flex items-center justify-between mb-4 px-4 py-2.5 glass-card text-sm">
                        <span className="text-brand-400 font-medium">{activeFilterLabel}</span>
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            <X size={12} /> Clear
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    {/* Sort */}
                    <div className="flex items-center gap-2 bg-gray-900/60 border border-gray-800/50 rounded-xl px-3 py-2">
                        <ArrowUpDown size={14} className="text-brand-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-transparent text-sm text-gray-300 focus:outline-none cursor-pointer"
                        >
                            <option value="date_added">Date Added</option>
                            <option value="rating">Rating</option>
                            <option value="release_year">Year</option>
                        </select>
                        <button
                            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                            className="text-xs text-brand-400 hover:text-brand-100 transition-colors font-medium"
                        >
                            {sortDir === 'desc' ? '↓' : '↑'}
                        </button>
                    </div>

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${showFilters || hasActiveFilters
                            ? 'bg-brand-700/20 border-brand-700/50 text-brand-400'
                            : 'bg-gray-900/60 border-gray-800/50 text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        <SlidersHorizontal size={14} />
                        Filters
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                        )}
                    </button>

                    {/* Movie count */}
                    <span className="ml-auto text-sm text-gray-500">
                        {processedMovies.length} movie{processedMovies.length !== 1 && 's'}
                    </span>
                </div>

                {/* Filter dropdowns */}
                {showFilters && (
                    <div className="flex flex-wrap gap-3 mt-4 p-4 glass-card">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Genre</label>
                            <select
                                value={filterGenre}
                                onChange={(e) => setFilterGenre(e.target.value)}
                                className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-700"
                            >
                                <option value="">All Genres</option>
                                {allGenres.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Director</label>
                            <select
                                value={filterDirector}
                                onChange={(e) => setFilterDirector(e.target.value)}
                                className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-700"
                            >
                                <option value="">All Directors</option>
                                {allDirectors.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Actor</label>
                            <select
                                value={filterActor}
                                onChange={(e) => setFilterActor(e.target.value)}
                                className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-700"
                            >
                                <option value="">All Actors</option>
                                {allActors.map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Composer</label>
                            <select
                                value={filterComposer}
                                onChange={(e) => setFilterComposer(e.target.value)}
                                className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-700"
                            >
                                <option value="">All Composers</option>
                                {allComposers.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Movie Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-brand-700/30 border-t-brand-400 rounded-full animate-spin" />
                    </div>
                ) : processedMovies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Film size={48} className="text-gray-700 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400">
                            {hasActiveFilters || searchQuery ? 'No movies match your search' : 'No movies yet'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {hasActiveFilters || searchQuery
                                ? 'Try adjusting your search or filters'
                                : 'Click "Add Movie" to get started!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {processedMovies.map((movie) => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                )}
            </main>

            {/* Add Movie Modal */}
            {showModal && (
                <AddMovieModal
                    onClose={() => setShowModal(false)}
                    onMovieAdded={loadMovies}
                />
            )}
        </div>
    )
}

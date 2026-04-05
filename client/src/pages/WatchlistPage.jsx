import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Film, Plus, ArrowRight, Loader2 } from 'lucide-react'
import { fetchWatchlist, promoteFromWatchlist } from '../api'
import MovieCard from '../components/MovieCard'
import AddMovieModal from '../components/AddMovieModal'

export default function WatchlistPage() {
    const navigate = useNavigate()
    const [movies, setMovies] = useState([])
    const [loading, setLoading] = useState(true)
    const [promoting, setPromoting] = useState(null) // id being promoted
    const [showModal, setShowModal] = useState(false)

    async function loadWatchlist() {
        try {
            const data = await fetchWatchlist()
            setMovies(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadWatchlist()
    }, [])

    async function handlePromote(id) {
        setPromoting(id)
        try {
            await promoteFromWatchlist(id)
            setMovies((prev) => prev.filter((m) => m.id !== id))
        } catch (err) {
            console.error(err)
        } finally {
            setPromoting(null)
        }
    }

    async function handleDelete(id) {
        try {
            await deleteMovie(id)
            setMovies((prev) => prev.filter((m) => m.id !== id))
        } catch (err) {
            console.error(err)
        }
    }

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
                            onClick={() => navigate('/')}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-brand-400 hover:bg-gray-800 transition-all"
                        >
                            Library
                        </button>
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-700/20 text-brand-400 border border-brand-700/40"
                        >
                            <Bookmark size={14} />
                            Watch Later
                        </button>
                    </div>

                    <div className="flex-1" />

                    {/* Add to Watch Later button */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-900 to-brand-700 text-white text-sm font-semibold rounded-xl hover:from-brand-700 hover:to-brand-400 transition-all duration-300 shadow-lg shadow-brand-900/30 shrink-0"
                    >
                        <Plus size={18} />
                        Add to Watch Later
                    </button>
                </div>
            </header>

            {/* Page title */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-3 mb-2">
                    <Bookmark size={22} className="text-brand-400" />
                    <h2 className="text-xl font-bold text-gray-100">Watch Later</h2>
                    <span className="px-2 py-0.5 bg-brand-700/20 text-brand-400 text-xs font-semibold rounded-full border border-brand-700/30">
                        {movies.length}
                    </span>
                </div>

            </div>

            {/* Watchlist grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-brand-700/30 border-t-brand-400 rounded-full animate-spin" />
                    </div>
                ) : movies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Bookmark size={48} className="text-gray-700 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400">Your Watch Later list is empty</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Add movies you haven't watched yet
                        </p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-700/20 border border-brand-700/40 rounded-xl text-brand-400 text-sm font-medium hover:bg-brand-700/30 transition-all"
                        >
                            <Plus size={15} /> Add a movie
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {movies.map((movie) => (
                            <div key={movie.id} className="relative group/wrap">
                                <MovieCard movie={movie} />

                                {/* Promote to watched overlay */}
                                <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover/wrap:opacity-100 transition-opacity duration-200 z-10 pointer-events-none group-hover/wrap:pointer-events-auto">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePromote(movie.id) }}
                                        disabled={promoting === movie.id}
                                        title="Mark as watched — move to library"
                                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-brand-700/90 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg backdrop-blur-sm border border-brand-400/30 transition-all disabled:opacity-50"
                                    >
                                        {promoting === movie.id ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Plus size={13} />
                                                Watched
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showModal && (
                <AddMovieModal
                    onClose={() => setShowModal(false)}
                    onMovieAdded={loadWatchlist}
                    defaultWatchlist
                />
            )}
        </div>
    )
}

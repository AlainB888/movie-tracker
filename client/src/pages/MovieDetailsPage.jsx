import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    Clapperboard,
    Users,
    Calendar,
    Eye,
    Film,
    Tag,
    Trash2,
    Minus,
    Plus,
    Crown,
    Music,
} from 'lucide-react'
import { fetchMovie, updateMovie, deleteMovie } from '../api'
import StarRating from '../components/StarRating'

export default function MovieDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [movie, setMovie] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    useEffect(() => {
        fetchMovie(id)
            .then(setMovie)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    async function handleUpdate(fields) {
        try {
            const updated = await updateMovie(id, fields)
            setMovie(updated)
        } catch (err) {
            console.error(err)
        }
    }

    async function handleDelete() {
        try {
            await deleteMovie(id)
            navigate('/')
        } catch (err) {
            console.error(err)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-brand-700/30 border-t-brand-400 rounded-full animate-spin" />
            </div>
        )
    }

    if (!movie) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-gray-400">
                <Film size={48} className="mb-4" />
                <p className="text-lg">Movie not found</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 text-brand-400 hover:text-brand-100 transition-colors text-sm"
                >
                    ← Back to Home
                </button>
            </div>
        )
    }

    const actors = movie.actors?.split(', ').filter(Boolean) || []
    const genres = movie.genres?.split(', ').filter(Boolean) || []
    const canBeMasterpiece = (movie.watch_count || 1) >= 2 && movie.rating === 5

    return (
        <div className="min-h-screen">
            {/* Top bar */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-400 transition-colors group"
                >
                    <ArrowLeft
                        size={16}
                        className="group-hover:-translate-x-1 transition-transform"
                    />
                    Back to Library
                </button>

                {/* Delete button */}
                <div className="relative">
                    {showDeleteConfirm ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-red-400">Delete this movie?</span>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
                            >
                                Yes, delete
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm font-medium hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
                        >
                            <Trash2 size={15} />
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Hero */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                    {/* Poster */}
                    <div className="shrink-0 mx-auto md:mx-0">
                        <div className="w-72 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-gray-800/50">
                            {movie.poster_path ? (
                                <div
                                    className="w-full aspect-[2/3] bg-cover bg-center"
                                    style={{ backgroundImage: `url(${movie.poster_path})` }}
                                    role="img"
                                    aria-label={movie.title}
                                />
                            ) : (
                                <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center">
                                    <Film size={48} className="text-gray-600" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-6">
                        {/* Title + Masterpiece crown */}
                        <div>
                            <div className="flex items-start gap-3">
                                <h1 className="text-4xl md:text-5xl font-extrabold gradient-text-light leading-tight">
                                    {movie.title}
                                </h1>
                                {movie.is_masterpiece === 1 && (
                                    <Crown
                                        size={32}
                                        className="mt-1 shrink-0 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                                    />
                                )}
                            </div>
                            {movie.release_year && (
                                <p className="text-lg text-gray-400 mt-2 flex items-center gap-2">
                                    <Calendar size={16} className="text-brand-400" />
                                    {movie.release_year}
                                </p>
                            )}
                        </div>

                        {/* Ratings row */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Your Rating */}
                            <div className="glass-card px-5 py-3">
                                <p className="text-xs text-gray-400 mb-1.5">Your Rating</p>
                                <StarRating
                                    rating={movie.rating}
                                    size={22}
                                    interactive
                                    isMasterpiece={movie.is_masterpiece === 1}
                                    onChange={(r) => {
                                        // Auto-clear masterpiece if rating drops below 5
                                        const extra = r < 5 && movie.is_masterpiece ? { is_masterpiece: 0 } : {}
                                        handleUpdate({ rating: r, ...extra })
                                    }}
                                />
                            </div>

                            {/* Masterpiece toggle — standalone button */}
                            <button
                                disabled={!canBeMasterpiece}
                                onClick={() => handleUpdate({ is_masterpiece: movie.is_masterpiece ? 0 : 1 })}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${movie.is_masterpiece
                                    ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/30 shadow-lg shadow-yellow-400/10'
                                    : canBeMasterpiece
                                        ? 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/40 hover:bg-yellow-400/10'
                                        : 'bg-gray-800/40 border-gray-800 text-gray-700 cursor-not-allowed'
                                    }`}
                            >
                                <Crown size={15} className={movie.is_masterpiece ? 'fill-yellow-400 text-yellow-400' : canBeMasterpiece ? 'text-gray-500 group-hover:text-yellow-400' : 'text-gray-700'} />
                                Masterpiece
                            </button>

                            {/* IMDb Rating */}
                            {movie.imdb_rating && (
                                <div className="glass-card px-5 py-3 flex items-center gap-3">
                                    <span className="text-xl font-bold text-brand-400">
                                        {movie.imdb_rating}
                                    </span>
                                    <div>
                                        <p className="text-xs text-gray-400">IMDb Rating</p>
                                        <p className="text-sm text-gray-300">/ 10</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Editable metadata cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Director — clickable */}
                            {movie.director && (
                                <div className="glass-card px-5 py-4">
                                    <div className="flex items-center gap-2 text-brand-400 mb-2">
                                        <Clapperboard size={16} />
                                        <span className="text-xs font-semibold uppercase tracking-wider">
                                            Director
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/?director=${encodeURIComponent(movie.director)}`)}
                                        className="text-gray-200 font-medium hover:text-brand-400 transition-colors text-left"
                                    >
                                        {movie.director}
                                    </button>
                                </div>
                            )}

                            {/* Music Composer — clickable */}
                            {movie.music_composer && (
                                <div className="glass-card px-5 py-4">
                                    <div className="flex items-center gap-2 text-brand-400 mb-2">
                                        <Music size={16} />
                                        <span className="text-xs font-semibold uppercase tracking-wider">
                                            Music Composer
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/?composer=${encodeURIComponent(movie.music_composer)}`)}
                                        className="text-gray-200 font-medium hover:text-brand-400 transition-colors text-left"
                                    >
                                        {movie.music_composer}
                                    </button>
                                </div>
                            )}

                            {!movie.music_composer && (
                                <div className="glass-card px-5 py-4">
                                    <div className="flex items-center gap-2 text-brand-400 mb-2">
                                        <Music size={16} />
                                        <span className="text-xs font-semibold uppercase tracking-wider">
                                            Music Composer
                                        </span>
                                    </div>
                                    <p className="text-gray-200 font-medium">—</p>
                                </div>
                            )}

                            {/* Watch Count — editable */}
                            <div className="glass-card px-5 py-4">
                                <div className="flex items-center gap-2 text-brand-400 mb-2">
                                    <Eye size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">
                                        Watch Count
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            const newCount = Math.max(1, (movie.watch_count || 1) - 1)
                                            // If reducing below 2 and masterpiece is set, clear it
                                            const extra = newCount < 2 && movie.is_masterpiece ? { is_masterpiece: 0 } : {}
                                            handleUpdate({ watch_count: newCount, ...extra })
                                        }}
                                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-gray-200 font-semibold text-lg min-w-[2ch] text-center">
                                        {movie.watch_count}
                                    </span>
                                    <button
                                        onClick={() =>
                                            handleUpdate({ watch_count: (movie.watch_count || 1) + 1 })
                                        }
                                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {(movie.watch_count || 1) < 2 && (
                                    <p className="text-xs text-gray-600 mt-1.5">Watch once more to unlock Masterpiece</p>
                                )}
                            </div>

                            <div className="glass-card px-5 py-4">
                                <div className="flex items-center gap-2 text-brand-400 mb-2">
                                    <Film size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">
                                        Watched in Theater
                                    </span>
                                </div>
                                <button
                                    onClick={() =>
                                        handleUpdate({ watched_in_theatre: movie.watched_in_theatre ? 0 : 1 })
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${movie.watched_in_theatre
                                        ? 'bg-brand-700/20 border-brand-700/50 text-brand-400'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'
                                        }`}
                                >
                                    {movie.watched_in_theatre ? 'Yes' : 'No'}
                                </button>
                            </div>
                        </div>

                        {/* Actors — clickable */}
                        {actors.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-brand-400 mb-3">
                                    <Users size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">
                                        Cast
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {actors.map((actor) => (
                                        <button
                                            key={actor}
                                            onClick={() => navigate(`/?actor=${encodeURIComponent(actor)}`)}
                                            className="px-3 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-sm text-gray-300 hover:border-brand-700/50 hover:text-brand-400 transition-all cursor-pointer"
                                        >
                                            {actor}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Genres — clickable */}
                        {genres.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-brand-400 mb-3">
                                    <Tag size={16} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">
                                        Genres
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {genres.map((genre) => (
                                        <button
                                            key={genre}
                                            onClick={() => navigate(`/?genre=${encodeURIComponent(genre)}`)}
                                            className="px-3 py-1.5 bg-brand-900/20 border border-brand-700/30 rounded-lg text-sm text-brand-400 hover:bg-brand-700/30 hover:border-brand-400/50 transition-all cursor-pointer"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

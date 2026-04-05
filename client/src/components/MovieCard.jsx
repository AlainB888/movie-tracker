import { useNavigate } from 'react-router-dom'
import { memo, useState, useEffect, useRef } from 'react'
import { Crown } from 'lucide-react'
import StarRating from './StarRating'

// Global cache for image URLs to ensure they are only processed once per session
const imageCache = new Set()

const MovieCard = memo(function MovieCard({ movie }) {
    const navigate = useNavigate()
    const [isVisible, setIsVisible] = useState(() => !movie.poster_path || imageCache.has(movie.poster_path))
    const cardRef = useRef(null)

    useEffect(() => {
        if (!movie.poster_path || isVisible) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    imageCache.add(movie.poster_path)
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '200px' }
        )

        if (cardRef.current) observer.observe(cardRef.current)

        return () => observer.disconnect()
    }, [movie.poster_path, isVisible])

    return (
        <div
            onClick={() => navigate(`/movie/${movie.id}`)}
            className="group relative cursor-pointer rounded-xl overflow-hidden shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-900/30"
            ref={cardRef}
        >
            {/* Poster */}
            <div className="aspect-[2/3] overflow-hidden bg-gray-900 flex items-center justify-center relative pointer-events-none">
                {movie.poster_path ? (
                    <>
                        {isVisible ? (
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 pointer-events-none"
                                style={{ backgroundImage: `url(${movie.poster_path})` }}
                            />
                        ) : (
                            <div className="w-8 h-8 border-4 border-brand-700/30 border-t-brand-400 rounded-full animate-spin" />
                        )}
                    </>
                ) : (
                    <span className="text-gray-500 text-sm text-center px-4 z-10">{movie.title}</span>
                )}
            </div>

            {/* Masterpiece badge */}
            {movie.is_masterpiece === 1 && (
                <div className="absolute top-2 left-2 bg-yellow-400/20 backdrop-blur-md rounded-lg px-2 py-1 border border-yellow-400/40 pointer-events-none flex items-center gap-1">
                    <Crown size={11} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-yellow-400 text-[10px] font-bold tracking-wide">MASTERPIECE</span>
                </div>
            )}

            {/* Rating Badge — hidden when masterpiece (crown badge takes over) */}
            {movie.rating > 0 && !movie.is_masterpiece && (
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 border border-gray-700/50 pointer-events-none">
                    <StarRating rating={movie.rating} size={12} />
                </div>
            )}

            {/* Hover overlay with title */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <h3 className="text-sm font-semibold text-white truncate">{movie.title}</h3>
                {movie.release_year && (
                    <p className="text-xs text-brand-400 mt-0.5">{movie.release_year}</p>
                )}
            </div>

            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
    )
})

export default MovieCard

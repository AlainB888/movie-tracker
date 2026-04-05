import { Star, Crown } from 'lucide-react'

export default function StarRating({ rating, size = 16, interactive = false, onChange, isMasterpiece = false }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && onChange?.(star)}
                    className={`${interactive ? 'cursor-pointer hover:scale-125' : 'cursor-default'} transition-transform duration-150`}
                >
                    <Star
                        size={size}
                        className={
                            star <= rating
                                ? 'fill-brand-400 text-brand-400'
                                : 'fill-none text-gray-600'
                        }
                    />
                </button>
            ))}
            {isMasterpiece && (
                <Crown
                    size={size}
                    className="ml-1 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.7)]"
                />
            )}
        </div>
    )
}

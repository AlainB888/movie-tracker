import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange }) {
    return (
        <div className="relative flex-1 max-w-md">
            <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search by title, actor, director, or composer…"
                className="w-full pl-9 pr-9 py-2 bg-gray-900/60 border border-gray-800/50 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 transition-colors"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    )
}

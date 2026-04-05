import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MovieDetailsPage from './pages/MovieDetailsPage'
import WatchlistPage from './pages/WatchlistPage'

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/movie/:id" element={<MovieDetailsPage />} />
                    <Route path="/watchlist" element={<WatchlistPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}

export default App

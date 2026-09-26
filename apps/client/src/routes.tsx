import { Routes, Route } from 'react-router-dom'
import { WatchPage } from './pages/WatchPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WatchPage />} />
      <Route path="*" element={<WatchPage />} />
    </Routes>
  )
}

import { Routes, Route } from 'react-router-dom'
import { WatchPage } from './pages/WatchPage'
import { CallbackPage } from './pages/CallbackPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WatchPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="*" element={<WatchPage />} />
    </Routes>
  )
}

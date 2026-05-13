import { BrowserRouter } from 'react-router-dom'
import { StreamProvider } from './context/StreamProvider'
import { FollowingProvider } from './context/FollowingProvider'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <StreamProvider>
        <FollowingProvider>
          <AppRoutes />
        </FollowingProvider>
      </StreamProvider>
    </BrowserRouter>
  )
}

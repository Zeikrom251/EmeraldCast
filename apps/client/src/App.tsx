import { BrowserRouter } from 'react-router-dom'
import { StreamProvider } from './context/StreamProvider'
import { StreamStatusProvider } from './context/StreamStatusProvider'
import { FollowingProvider } from './context/FollowingProvider'
import { CategoryBrowserProvider } from './context/CategoryBrowserProvider'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <StreamProvider>
        <StreamStatusProvider>
          <FollowingProvider>
            <CategoryBrowserProvider>
              <AppRoutes />
            </CategoryBrowserProvider>
          </FollowingProvider>
        </StreamStatusProvider>
      </StreamProvider>
    </BrowserRouter>
  )
}

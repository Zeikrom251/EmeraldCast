import { BrowserRouter } from 'react-router-dom'
import { StreamProvider } from './context/StreamProvider'
import { FollowingProvider } from './context/FollowingProvider'
import { CategoryBrowserProvider } from './context/CategoryBrowserProvider'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <StreamProvider>
        <FollowingProvider>
          <CategoryBrowserProvider>
            <AppRoutes />
          </CategoryBrowserProvider>
        </FollowingProvider>
      </StreamProvider>
    </BrowserRouter>
  )
}

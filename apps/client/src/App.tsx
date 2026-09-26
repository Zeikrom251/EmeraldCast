import { BrowserRouter } from 'react-router-dom'
import { StreamProvider } from './context/StreamProvider'
import { StreamStatusProvider } from './context/StreamStatusProvider'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <StreamProvider>
        <StreamStatusProvider>
          <AppRoutes />
        </StreamStatusProvider>
      </StreamProvider>
    </BrowserRouter>
  )
}

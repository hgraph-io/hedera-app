import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppWithV1 from './AppWithV1.tsx'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppWithV1 />
    </ErrorBoundary>
  </StrictMode>,
)

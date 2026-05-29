import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { initReadingRoomTheme } from './stores/readingRoomStore'

// Phase 12 — apply the persisted reading-room Tweaks (paper/accent) onto <html>
// before first render. The store's onRehydrateStorage also reapplies on load;
// this confirms the defaults for fresh visitors (matches the index.css baseline).
initReadingRoomTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

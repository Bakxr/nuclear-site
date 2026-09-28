import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { AccessProvider } from './features/access/context.jsx'

// Old addresses. Done in the page (not only a server redirect) because
// visitors who installed the offline cache there never reach the server.
const OLD_HOSTS = ['atomic-energy.vercel.app', 'nuclear-site.vercel.app']
if (OLD_HOSTS.includes(window.location.hostname)) {
  const { pathname, search, hash } = window.location
  window.location.replace(`https://thenuclearpulse.com${pathname}${search}${hash}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AccessProvider>
      <App />
      <Analytics />
    </AccessProvider>
  </StrictMode>,
)

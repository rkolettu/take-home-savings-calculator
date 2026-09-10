import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CompareView } from './components/CompareView.tsx'

function Root() {
  const [showCompare, setShowCompare] = useState(
    () => window.location.hash === '#compare',
  )

  useEffect(() => {
    const syncHash = () => setShowCompare(window.location.hash === '#compare')
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  return showCompare ? <CompareView /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

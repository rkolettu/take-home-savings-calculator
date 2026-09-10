import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { CompareModal } from './components/CompareModal.tsx'
import { DataFreshness } from './components/DataFreshness.tsx'

function Root() {
  const [hash, setHash] = useState(() => window.location.hash)
  const [showCompare, setShowCompare] = useState(
    () => window.location.hash === '#compare',
  )

  useEffect(() => {
    // Old shared #compare links now open the calculator with the comparison
    // overlay instead of routing to a separate page.
    if (window.location.hash === '#compare') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
      setHash('')
    }

    const syncHash = () => setHash(window.location.hash)
    const openCompare = () => setShowCompare(true)
    window.addEventListener('hashchange', syncHash)
    window.addEventListener('open-compare', openCompare)
    return () => {
      window.removeEventListener('hashchange', syncHash)
      window.removeEventListener('open-compare', openCompare)
    }
  }, [])

  const onProjection = hash === '#projection'

  return (
    <>
      <App />
      <DataFreshness />
      {!onProjection && showCompare && (
        <CompareModal onClose={() => setShowCompare(false)} />
      )}
      <Analytics />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

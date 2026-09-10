import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CompareModal } from './components/CompareModal.tsx'

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
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  const onProjection = hash === '#projection'

  return (
    <>
      <App onOpenCompare={() => setShowCompare(true)} />
      {!onProjection && showCompare && (
        <CompareModal onClose={() => setShowCompare(false)} />
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

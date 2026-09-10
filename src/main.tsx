import { ArrowLeftRight } from 'lucide-react'
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
      <App />

      {!onProjection && !showCompare && (
        <button
          type="button"
          onClick={() => setShowCompare(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
          aria-label="Compare up to three metro and income scenarios"
        >
          <ArrowLeftRight className="size-4" />
          Compare scenarios
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            up to 3
          </span>
        </button>
      )}

      {showCompare && <CompareModal onClose={() => setShowCompare(false)} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

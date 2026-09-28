import { useEffect, useRef, useState } from 'react'

interface HeaderActionsProps {
  onCopySummary: () => Promise<boolean>
  onDownloadCsv: () => boolean
  onResetAll: () => void
}

type Feedback = 'idle' | 'copied' | 'copy-failed' | 'downloaded' | 'download-failed'

/* Utilities set in mono, like Signal Dash's "CSV ↓": small, ink-2, and
   underlined on hover like the text links beside them. */
const utilClass = 'header-util'

/**
 * Export and reset. Reset is destructive of everything the user has typed,
 * so it confirms in place rather than firing on the first click — and the
 * pending confirmation times out so it cannot be left armed.
 */
export function HeaderActions({
  onCopySummary,
  onDownloadCsv,
  onResetAll,
}: HeaderActionsProps) {
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer)
    },
    [],
  )

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  async function copy() {
    const ok = await onCopySummary()
    setFeedback(ok ? 'copied' : 'copy-failed')
    later(() => setFeedback('idle'), 2200)
  }

  function download() {
    const ok = onDownloadCsv()
    setFeedback(ok ? 'downloaded' : 'download-failed')
    later(() => setFeedback('idle'), 2200)
  }

  function reset() {
    if (!confirmingReset) {
      setConfirmingReset(true)
      later(() => setConfirmingReset(false), 4000)
      return
    }
    onResetAll()
    setConfirmingReset(false)
  }

  const copyFailed = feedback === 'copy-failed'
  const copied = feedback === 'copied'
  const downloaded = feedback === 'downloaded'
  const downloadFailed = feedback === 'download-failed'

  return (
    <div className="header-utils">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy a text summary"
        className={utilClass}
        style={{
          color: copyFailed
            ? 'var(--status-critical)'
            : copied
              ? 'var(--status-good)'
              : undefined,
        }}
      >
        {copied ? 'Copied ✓' : copyFailed ? 'Copy blocked' : 'Copy'}
      </button>

      <button
        type="button"
        onClick={download}
        aria-label="Download the projection as CSV"
        className={utilClass}
        style={{
          color: downloadFailed
            ? 'var(--status-critical)'
            : downloaded
              ? 'var(--status-good)'
              : undefined,
        }}
      >
        {downloaded ? 'Saved ✓' : downloadFailed ? 'Unavailable' : 'CSV ↓'}
      </button>

      <a
        href="https://github.com/rkolettu/take-home-savings-calculator"
        target="_blank"
        rel="noreferrer"
        className={`${utilClass} util-github`}
        aria-label="View the source code on GitHub"
      >
        GitHub ↗
      </a>

      <button
        type="button"
        onClick={reset}
        aria-label={
          confirmingReset
            ? 'Confirm resetting all inputs to defaults'
            : 'Reset all inputs to defaults'
        }
        className={utilClass}
        style={{ color: confirmingReset ? 'var(--status-critical)' : 'var(--muted)' }}
      >
        {confirmingReset ? 'Confirm reset?' : 'Reset'}
      </button>
    </div>
  )
}

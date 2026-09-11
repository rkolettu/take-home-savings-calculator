import { Check, Clipboard, Download, RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface HeaderActionsProps {
  onCopySummary: () => Promise<boolean>
  onDownloadCsv: () => boolean
  onResetAll: () => void
}

type Feedback = 'idle' | 'copied' | 'copy-failed' | 'downloaded' | 'download-failed'

const buttonClass =
  'group flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all duration-150 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className={buttonClass}
        style={{
          borderColor: copyFailed ? 'var(--status-critical)' : 'var(--border)',
          background: 'var(--surface-2)',
          color: copyFailed
            ? 'var(--status-critical)'
            : copied
              ? 'var(--status-good)'
              : 'var(--text-secondary)',
        }}
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : copyFailed ? (
          <TriangleAlert className="size-3.5" />
        ) : (
          <Clipboard className="size-3.5" />
        )}
        <span className="hidden sm:inline">
          {copied ? 'Copied' : copyFailed ? 'Copy blocked' : 'Copy summary'}
        </span>
      </button>

      <button
        type="button"
        onClick={download}
        className={buttonClass}
        style={{
          borderColor: downloadFailed
            ? 'var(--status-critical)'
            : 'var(--border)',
          background: 'var(--surface-2)',
          color: downloadFailed
            ? 'var(--status-critical)'
            : downloaded
              ? 'var(--status-good)'
              : 'var(--text-secondary)',
        }}
      >
        {downloaded ? (
          <Check className="size-3.5" />
        ) : (
          <Download className="size-3.5" />
        )}
        <span className="hidden sm:inline">
          {downloaded
            ? 'Downloaded'
            : downloadFailed
              ? 'Unavailable'
              : 'Export CSV'}
        </span>
      </button>

      <a
        href="https://github.com/rkolettu/take-home-savings-calculator"
        target="_blank"
        rel="noreferrer"
        className={`${buttonClass} no-underline`}
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface-2)',
          color: 'var(--text-secondary)',
        }}
        aria-label="View the Take-Home Savings Calculator source code on GitHub"
      >
        <span className="font-semibold">&lt;/&gt;</span>
        <span className="hidden sm:inline">GitHub</span>
      </a>

      <button
        type="button"
        onClick={reset}
        aria-label={
          confirmingReset
            ? 'Confirm resetting all inputs to defaults'
            : 'Reset all inputs to defaults'
        }
        className={buttonClass}
        style={{
          borderColor: confirmingReset
            ? 'var(--status-critical)'
            : 'var(--border)',
          background: confirmingReset
            ? 'color-mix(in srgb, var(--status-critical) 12%, transparent)'
            : 'transparent',
          color: confirmingReset
            ? 'var(--status-critical)'
            : 'var(--text-muted)',
        }}
      >
        {confirmingReset ? (
          <TriangleAlert className="size-3.5" />
        ) : (
          <RotateCcw className="size-3.5" />
        )}
        <span className="hidden sm:inline">
          {confirmingReset ? 'Tap again to confirm' : 'Reset all'}
        </span>
      </button>
    </div>
  )
}

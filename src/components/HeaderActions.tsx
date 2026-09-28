import {
  ArrowUpRight,
  Check,
  Clipboard,
  Code,
  Download,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface HeaderActionsProps {
  onCopySummary: () => Promise<boolean>
  onDownloadCsv: () => boolean
  onResetAll: () => void
}

type Feedback = 'idle' | 'copied' | 'copy-failed' | 'downloaded' | 'download-failed'

/* Quiet text actions in the portfolio / EDGAR nav style: no box, ink on
   hover, an icon only where the label is dropped below desktop widths. */
const buttonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

/* Labels stay readable to screen readers where only icons show. */
const labelClass = 'sr-only lg:not-sr-only'
const iconClass = 'size-4 lg:hidden'

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
    <div className="flex items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={copy}
        className={buttonClass}
        style={{
          color: copyFailed
            ? 'var(--status-critical)'
            : copied
              ? 'var(--status-good)'
              : 'var(--ink-2)',
        }}
      >
        {copied ? (
          <Check className={iconClass} />
        ) : copyFailed ? (
          <TriangleAlert className={iconClass} />
        ) : (
          <Clipboard className={iconClass} />
        )}
        <span className={labelClass}>
          {copied ? 'Copied' : copyFailed ? 'Copy blocked' : 'Copy summary'}
        </span>
      </button>

      <button
        type="button"
        onClick={download}
        className={buttonClass}
        style={{
          color: downloadFailed
            ? 'var(--status-critical)'
            : downloaded
              ? 'var(--status-good)'
              : 'var(--ink-2)',
        }}
      >
        {downloaded ? (
          <Check className={iconClass} />
        ) : (
          <Download className={iconClass} />
        )}
        <span className={labelClass}>
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
        style={{ color: 'var(--ink-2)' }}
        aria-label="View the Take-Home Savings Calculator source code on GitHub"
      >
        <Code className={iconClass} />
        <span className="hidden lg:inline">GitHub</span>
        <ArrowUpRight aria-hidden className="hidden size-3.5 lg:inline" />
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
          background: confirmingReset
            ? 'color-mix(in srgb, var(--status-critical) 10%, transparent)'
            : undefined,
          color: confirmingReset
            ? 'var(--status-critical)'
            : 'var(--muted)',
        }}
      >
        {confirmingReset ? (
          <TriangleAlert className={iconClass} />
        ) : (
          <RotateCcw className={iconClass} />
        )}
        <span className="hidden lg:inline">
          {confirmingReset ? 'Tap again to confirm' : 'Reset'}
        </span>
      </button>
    </div>
  )
}

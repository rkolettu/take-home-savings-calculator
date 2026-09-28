import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

interface Status {
  num: string
  name: string
}

/**
 * "02 / 04  ONE PAYCHECK" — the portfolio's running chapter marker. Watches
 * every `[data-chapter]` section and names the one crossing the middle of
 * the viewport; outside the story it shows `fallback`.
 */
export function ChapterIndicator({ fallback }: { fallback: Status }) {
  const [chapter, setChapter] = useState<Status | null>(null)

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('[data-chapter]')]
    if (sections.length === 0 || !('IntersectionObserver' in window)) return
    const total = String(sections.length).padStart(2, '0')
    const visible = new Set<HTMLElement>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target as HTMLElement)
          else visible.delete(e.target as HTMLElement)
        }
        const current = sections.find((s) => visible.has(s))
        setChapter(
          current
            ? { num: `${current.dataset.chapter} / ${total}`, name: current.dataset.chapterName ?? '' }
            : null,
        )
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  const shown = chapter ?? fallback
  return (
    <span className="header-status relative h-[1.2em] overflow-hidden" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${shown.num} ${shown.name}`}
          className="flex items-baseline gap-[0.6rem]"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="status-num">{shown.num}</span>
          <span className="status-name">{shown.name}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

/**
 * "02 / 04 · 45 cities" — the portfolio's running chapter marker. Watches
 * every `[data-chapter]` section and names the one crossing the middle of
 * the viewport; outside the story it shows `fallback`.
 */
export function ChapterIndicator({ fallback }: { fallback: string }) {
  const [chapter, setChapter] = useState<{ num: string; name: string } | null>(null)

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

  const text = chapter ? `${chapter.num} · ${chapter.name}` : fallback
  return (
    <span className="relative block h-4 overflow-hidden font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="block whitespace-nowrap"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {chapter ? <span className="text-[var(--ink)]">{chapter.num}</span> : null}
          {chapter ? ` · ${chapter.name}` : fallback}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

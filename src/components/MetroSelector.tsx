import { Check, ChevronsUpDown, MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Metro } from '../data/metroData'
import { METROS, groupByRegion, monthlyCostOfLiving } from '../data/metroData'
import { usd } from '../lib/format'

interface MetroSelectorProps {
  metroId: string
  onChange: (metroId: string) => void
}

/**
 * Searchable metro combobox, grouped by region.
 *
 * Search matches city name, state code or region, so typing "midwest"
 * lists every Midwest metro and "tx" lists the Texas ones. Results keep
 * their region headers, and regions with no matches drop out entirely.
 */
export function MetroSelector({ metroId, onChange }: MetroSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  /* Scrolling the highlighted row into view is only correct for keyboard
     navigation. Doing it on hover moves the row out from under the pointer
     between mousedown and mouseup, which silently swallows the click. */
  const keyboardNav = useRef(false)

  const selected = METROS.find((m) => m.id === metroId) ?? METROS[0]

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groupByRegion()
    const matches = METROS.filter(
      (m) =>
        m.city.toLowerCase().includes(q) ||
        m.stateCode.toLowerCase().includes(q) ||
        m.region.toLowerCase().includes(q),
    )
    return groupByRegion(matches)
  }, [query])

  /* Arrow keys move through a flat list; the headers are not stops. */
  const flat = useMemo<Metro[]>(
    () => groups.flatMap((group) => group.metros),
    [groups],
  )

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    if (!open || !keyboardNav.current) return
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  function close() {
    setOpen(false)
    setQuery('')
    keyboardNav.current = false
  }

  function choose(id: string) {
    onChange(id)
    close()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      keyboardNav.current = true
      setHighlight((h) => Math.min(h + 1, flat.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      keyboardNav.current = true
      setHighlight((h) => Math.max(h - 1, 0))
      return
    }
    if (event.key === 'Enter' && flat[highlight]) {
      event.preventDefault()
      choose(flat[highlight].id)
    }
  }

  /* Running index across groups, so the keyboard cursor and the rendered
     rows agree even though the rows are nested under headers. */
  let cursor = -1

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        Metro
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border bg-[var(--surface-2)] px-3 py-2.5 text-left text-sm transition-colors hover:border-[var(--baseline)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent)]"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-[var(--text-muted)]" />
          <span className="truncate font-medium text-[var(--text-primary)]">
            {selected.city}, {selected.stateCode}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border bg-[var(--surface-1)] shadow-lg"
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <Search className="size-4 shrink-0 text-[var(--text-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                // Reset the cursor with the query that moved it, rather than
                // chasing the change in an effect.
                setQuery(e.target.value)
                setHighlight(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={`Search ${METROS.length} metros or a region…`}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>

          <ul ref={listRef} role="listbox" className="max-h-80 overflow-y-auto">
            {flat.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                No metro or region matches “{query}”.
              </li>
            )}

            {groups.map((group) => (
              <li key={group.region}>
                {/* Sticky so the region stays visible while its rows scroll. */}
                <div
                  className="sticky top-0 z-10 border-b px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {group.region}
                  <span className="ml-1.5 font-normal normal-case opacity-70">
                    ({group.metros.length})
                  </span>
                </div>
                <ul>
                  {group.metros.map((metro) => {
                    cursor += 1
                    const index = cursor
                    const isSelected = metro.id === metroId
                    return (
                      <li key={metro.id}>
                        <button
                          type="button"
                          data-index={index}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => {
                            keyboardNav.current = false
                            setHighlight(index)
                          }}
                          onClick={() => choose(metro.id)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                          style={{
                            background:
                              index === highlight
                                ? 'var(--surface-2)'
                                : 'transparent',
                          }}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Check
                              className="size-4 shrink-0"
                              style={{
                                color: isSelected
                                  ? 'var(--accent)'
                                  : 'transparent',
                              }}
                            />
                            <span className="truncate text-[var(--text-primary)]">
                              {metro.city}
                              <span className="text-[var(--text-muted)]">
                                , {metro.stateCode}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                            {usd(monthlyCostOfLiving(metro))}/mo
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

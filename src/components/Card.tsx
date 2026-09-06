import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** The one surface primitive: soft border, no heavy shadow, no nesting. */
export function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}: CardProps) {
  return (
    <section
      className={`rounded-[22px] border bg-[var(--surface-1)] ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      {(title || action) && (
        <header
          className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              {icon}
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

import { useState } from 'react'

const MAX_LINES = 5
const CHARS_PER_LINE = 45

export function SeeMoreText({ text, className = '' }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n')
  const needsTruncate = lines.length > MAX_LINES || text.length > MAX_LINES * CHARS_PER_LINE

  const showSeeMore = needsTruncate && !expanded
  const showSeeLess = needsTruncate && expanded

  const displayText = showSeeMore
    ? (lines.length > MAX_LINES ? lines.slice(0, MAX_LINES).join('\n') : text.slice(0, MAX_LINES * CHARS_PER_LINE))
    : text

  return (
    <span className={className}>
      {showSeeMore ? (
        <>
          {displayText}
          {(lines.length > MAX_LINES || text.length > MAX_LINES * CHARS_PER_LINE) && '...'}
          <button type="button" onClick={() => setExpanded(true)} className="text-zinc-500 hover:text-zinc-400 text-sm ml-1">
            more
          </button>
        </>
      ) : (
        <>
          {text}
          {showSeeLess && (
            <button type="button" onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-zinc-400 text-sm ml-1">
              less
            </button>
          )}
        </>
      )}
    </span>
  )
}

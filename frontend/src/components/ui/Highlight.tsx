/** Sets one phrase of a headline in italic copper, optionally with the apricot hand-drawn stroke (hero only). */
export function Highlight({ text, part, stroke = false }: { text: string; part: string; stroke?: boolean }) {
  const i = part ? text.indexOf(part) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className="mark relative whitespace-nowrap">
        {part}
        {stroke && (
          <svg
            aria-hidden="true"
            viewBox="0 0 300 18"
            preserveAspectRatio="none"
            className="absolute start-[-2%] -bottom-2.5 h-[0.28em] w-[104%] overflow-visible"
          >
            <path
              d="M4 12 C 70 4, 160 3, 296 9"
              fill="none"
              className="stroke-apricot"
              strokeWidth="6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </span>
      {text.slice(i + part.length)}
    </>
  )
}

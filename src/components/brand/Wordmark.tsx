type WordmarkProps = { compact?: boolean }

export function Wordmark({ compact = false }: WordmarkProps) {
  return (
    <a className="wordmark" href="#inicio" aria-label="F1 TECH, inicio">
      <span className="wordmark__mark" aria-hidden="true">F1</span>
      {!compact && <span>TECH</span>}
    </a>
  )
}

type SectionHeadingProps = { title: string; eyebrow?: string; children?: React.ReactNode }

export function SectionHeading({ title, eyebrow, children }: SectionHeadingProps) {
  return <div className="section-heading"><div>{eyebrow && <p className="section-kicker">{eyebrow}</p>}<h2>{title}</h2></div>{children}</div>
}

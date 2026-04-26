import DOMPurify from 'dompurify'
import { useEffect, useMemo, useRef } from 'react'
import { typesetMath } from '../lib/mathjax'

interface SafeHtmlProps {
  html: string
  className?: string
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sanitizedHtml = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
      }),
    [html],
  )

  useEffect(() => {
    void typesetMath(containerRef.current)
  }, [sanitizedHtml])

  return <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
}

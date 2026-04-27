import DOMPurify from 'dompurify'
import { useEffect, useMemo, useRef } from 'react'
import { typesetMath } from '../lib/mathjax'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof HTMLImageElement) {
    if (!node.getAttribute('loading')) node.setAttribute('loading', 'lazy')
    if (!node.getAttribute('decoding')) node.setAttribute('decoding', 'async')
  }
})

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

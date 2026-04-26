import { useEffect, useState } from 'react'
import { useDataContext } from './data-context'
import type { SubjectBundle } from '../types'

export function useSubjectBundle(subjectId: string | undefined) {
  const { manifest, loadSubjectBundle } = useDataContext()
  const [bundle, setBundle] = useState<SubjectBundle | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!subjectId || !manifest) {
      setBundle(null)
      return
    }

    async function load() {
      setStatus('loading')
      setError(null)
      const nextSubjectId = subjectId

      try {
        const nextBundle = await loadSubjectBundle(nextSubjectId!)

        if (!cancelled) {
          setBundle(nextBundle)
          setStatus('ready')
        }
      } catch (nextError) {
        if (!cancelled) {
          setStatus('error')
          setError(nextError instanceof Error ? nextError.message : 'Failed to load subject bundle')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [loadSubjectBundle, manifest, subjectId])

  return {
    bundle,
    status,
    error,
  }
}

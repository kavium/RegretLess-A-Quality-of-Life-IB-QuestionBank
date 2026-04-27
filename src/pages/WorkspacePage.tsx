import { CheckCircle2, ChevronDown, ChevronLeft, Flag, RefreshCw, Shuffle, SlidersHorizontal, BookOpen } from 'lucide-react'
import type React from 'react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SafeHtml } from '../components/SafeHtml'
import { loadQuestionDetail } from '../lib/data-client'
import { useDataContext } from '../lib/data-context'
import { applyQuestionFilters, buildCanonicalQuestionSequence, createQuestionMap, describeQuestion, getAvailableLevels, getAvailablePapers, orderQuestionIds } from '../lib/questions'
import { buildSyllabusIndex, getSelectionLabels } from '../lib/selection'
import { getResumeState, getUserQuestionState, setResumeState, setUserQuestionState } from '../lib/storage'
import { useSubjectBundle } from '../lib/use-subject-bundle'
import { buildWorkspacePath, parseSelection, parseWorkspaceFilters } from '../lib/url-state'
import type { LevelCode, PaperCode, QuestionDetail, WorkspaceFilterState } from '../types'
import './WorkspacePage.css'

const PAPER_TINTS: Record<string, 'rose' | 'butter' | 'sky'> = { '1A': 'rose', '1B': 'butter', '2': 'sky' }

interface VirtualQuestionListProps {
  questionIds: string[]
  renderRow: (questionId: string) => React.ReactNode
}

const VirtualRowInner = memo(function VirtualRowInner({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
})

function VirtualQuestionList({ questionIds, renderRow }: VirtualQuestionListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [parentOffset, setParentOffset] = useState(0)

  useEffect(() => {
    const update = () => {
      if (parentRef.current) {
        setParentOffset(parentRef.current.getBoundingClientRect().top + window.scrollY)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const virtualizer = useWindowVirtualizer({
    count: questionIds.length,
    estimateSize: () => 110,
    overscan: 6,
    scrollMargin: parentOffset,
  })

  if (!questionIds.length) {
    return <div className="ws__list"><div className="ws__empty">No questions match the current filters.</div></div>
  }

  return (
    <div ref={parentRef} className="ws__list" style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((vi) => {
        const questionId = questionIds[vi.index]
        return (
          <div
            key={questionId}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            <VirtualRowInner>{renderRow(questionId)}</VirtualRowInner>
          </div>
        )
      })}
    </div>
  )
}

function toggleValue<T extends string>(items: T[], value: T, fallback: T[]) {
  const next = items.includes(value) ? items.filter((x) => x !== value) : [...items, value]
  return next.length ? next : fallback
}

export function WorkspacePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { subjectId } = useParams()
  const { refreshPublishedData } = useDataContext()
  const { bundle, status, error } = useSubjectBundle(subjectId)
  const [searchParams] = useSearchParams()
  const [userState, setUserState] = useState(() => (subjectId ? getUserQuestionState(subjectId) : {}))
  const [revealedMs, setRevealedMs] = useState<Record<string, boolean>>({})
  const [details, setDetails] = useState<Record<string, QuestionDetail | 'loading' | 'error'>>({})
  const [refreshState, setRefreshState] = useState<'idle' | 'working'>('idle')
  const restoreAttempted = useRef(false)

  useEffect(() => {
    if (!subjectId) return
    setUserState(getUserQuestionState(subjectId))
  }, [subjectId])

  const expandedId = useMemo(() => parseWorkspaceFilters(searchParams).expandedQuestionId, [searchParams])
  useEffect(() => {
    if (!subjectId || !expandedId) return
    if (details[expandedId] && details[expandedId] !== 'error') return
    setDetails((cur) => ({ ...cur, [expandedId]: 'loading' }))
    loadQuestionDetail(subjectId, expandedId)
      .then((detail) => setDetails((cur) => ({ ...cur, [expandedId]: detail })))
      .catch(() => setDetails((cur) => ({ ...cur, [expandedId]: 'error' })))
  }, [subjectId, expandedId, details])

  const syllabusIndex = useMemo(() => (bundle ? buildSyllabusIndex(bundle.syllabus) : null), [bundle])
  const selection = useMemo(
    () => (syllabusIndex ? parseSelection(searchParams.get('units'), syllabusIndex) : null),
    [searchParams, syllabusIndex],
  )
  const filters = useMemo(() => parseWorkspaceFilters(searchParams), [searchParams])
  const questionMap = useMemo(() => (bundle ? createQuestionMap(bundle) : new Map()), [bundle])

  const canonicalQuestionIds = useMemo(() => {
    if (!bundle || !selection || !syllabusIndex) return []
    return buildCanonicalQuestionSequence(bundle, selection, syllabusIndex)
  }, [bundle, selection, syllabusIndex])

  const visibleQuestionIds = useMemo(() => {
    if (!bundle) return []
    return orderQuestionIds(
      applyQuestionFilters(bundle, canonicalQuestionIds, filters, userState),
      bundle,
      userState,
      filters.orderMode,
      filters.scrambleNonce,
    )
  }, [bundle, canonicalQuestionIds, filters, userState])

  const availablePapers = useMemo(() => (bundle ? getAvailablePapers(bundle) : []), [bundle])
  const availableLevels = useMemo(() => (bundle ? getAvailableLevels(bundle) : []), [bundle])
  const selectionLabels = useMemo(
    () => (selection && syllabusIndex ? getSelectionLabels(selection, syllabusIndex) : []),
    [selection, syllabusIndex],
  )

  useEffect(() => {
    if (!subjectId) return
    setUserQuestionState(subjectId, userState)
  }, [subjectId, userState])

  useEffect(() => {
    if (!bundle || !selection || !subjectId) return

    const summaryLabel = `${bundle.subject.name} -> ${selectionLabels.join(', ') || 'No units'} -> ${filters.paperFilters.join(', ')} + ${filters.levelFilters.join(', ')}${filters.onlyDifficult ? ' + Difficult only' : ''}`
    const workspaceUrl = buildWorkspacePath(subjectId, selection, filters)

    const persist = () => {
      setResumeState({
        subjectId,
        workspaceUrl,
        summaryLabel,
        selection,
        paperFilters: filters.paperFilters,
        levelFilters: filters.levelFilters,
        onlyDifficult: filters.onlyDifficult,
        orderMode: filters.orderMode,
        scrambleNonce: filters.scrambleNonce,
        expandedQuestionId: filters.expandedQuestionId,
        scrollY: window.scrollY,
        updatedAt: new Date().toISOString(),
      })
    }

    persist()

    let frame = 0
    const onScroll = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => persist())
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [bundle, filters, selection, selectionLabels, subjectId])

  useEffect(() => {
    if (restoreAttempted.current || !bundle || !selection || !subjectId) return

    const resume = getResumeState()
    const expandedId = filters.expandedQuestionId

    window.setTimeout(() => {
      if (expandedId) {
        const el = document.querySelector(`[data-qid="${CSS.escape(expandedId)}"]`) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' })
          return
        }
      }
      if (resume?.subjectId === subjectId && typeof resume.scrollY === 'number') {
        window.scrollTo({ top: resume.scrollY })
      }
    }, 80)

    restoreAttempted.current = true
  }, [bundle, filters.expandedQuestionId, location.pathname, location.search, selection, subjectId])

  if (status === 'loading' || status === 'idle') {
    return <div className="ws ws--empty"><span>— sautéing the questions —</span></div>
  }

  if (status === 'error' || !bundle || !subjectId || !selection || !syllabusIndex) {
    return <div className="ws ws--empty"><span>— could not load this workspace. {error} —</span></div>
  }

  function updateFilters(next: WorkspaceFilterState) {
    navigate(buildWorkspacePath(subjectId!, selection!, next), { replace: true })
  }

  async function handleRefresh() {
    setRefreshState('working')
    try {
      await refreshPublishedData(subjectId)
    } finally {
      setRefreshState('idle')
    }
  }

  const completedCount = visibleQuestionIds.filter((id) => userState[id]?.completed).length
  const difficultCount = visibleQuestionIds.filter((id) => userState[id]?.difficult).length
  const subjectShort = bundle.subject.name.split(':')[0].trim()

  return (
    <div className="ws">
      <div className="ws__grain" aria-hidden="true" />

      <header className="ws__masthead">
        <div className="ws__masthead-row">
          <div className="ws__brand">
            <span className="ws__brand-mark">RL</span>
            <span className="ws__brand-pipe" />
            <span className="ws__brand-name">RegretLess · Workspace</span>
          </div>
          <div className="ws__masthead-meta">
            <button
              type="button"
              className="ws__back"
              onClick={() => navigate(`/subject/${subjectId}?units=${encodeURIComponent(searchParams.get('units') ?? '')}`)}
            >
              <ChevronLeft size={14} /> back to question select
            </button>
            <span>·</span>
            <span>subj — {subjectShort}</span>
          </div>
        </div>
      </header>

      <section className="ws__hero">
        <div>
          <p className="ws__hero-eyebrow">— the question workspace —</p>
          <h2>{bundle.subject.name}</h2>
          <p className="ws__hero-summary">{selectionLabels.join(' · ')}</p>
        </div>
        <div className="ws__stats">
          <div className="ws__stat"><b>{visibleQuestionIds.length}</b><span>visible</span></div>
          <div className="ws__stat"><b>{completedCount}</b><span>completed</span></div>
          <div className="ws__stat"><b>{difficultCount}</b><span>difficult</span></div>
        </div>
      </section>

      <div className="ws__toolbar">
        <div className="ws__tool-group">
          <span className="ws__tool-label"><SlidersHorizontal size={14} /> paper</span>
          {availablePapers.map((paper) => (
            <button
              key={paper}
              type="button"
              className={`ws__chip${filters.paperFilters.includes(paper) ? ' is-active' : ''}`}
              onClick={() => updateFilters({ ...filters, paperFilters: toggleValue(filters.paperFilters, paper as PaperCode, availablePapers) })}
            >
              {paper === '2' ? 'Paper 2' : `Paper ${paper}`}
            </button>
          ))}
        </div>

        <div className="ws__tool-group">
          <span className="ws__tool-label">level</span>
          {availableLevels.map((level) => (
            <button
              key={level}
              type="button"
              className={`ws__chip${filters.levelFilters.includes(level) ? ' is-active' : ''}`}
              onClick={() => updateFilters({ ...filters, levelFilters: toggleValue(filters.levelFilters, level as LevelCode, availableLevels) })}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="ws__tool-group">
          <span className="ws__tool-label">flags</span>
          <button
            type="button"
            className={`ws__chip${filters.onlyDifficult ? ' is-active' : ''}`}
            onClick={() => updateFilters({ ...filters, onlyDifficult: !filters.onlyDifficult })}
          >
            <Flag size={12} /> Only difficult
          </button>
        </div>

        <div className="ws__tool-group">
          <span className="ws__tool-label">order</span>
          <button
            type="button"
            className={`ws__chip${filters.orderMode === 'source' ? ' is-active' : ''}`}
            onClick={() => updateFilters({ ...filters, orderMode: 'source' })}
          >
            Source order
          </button>
          <button
            type="button"
            className={`ws__chip${filters.orderMode === 'scrambled' ? ' is-active' : ''}`}
            onClick={() => updateFilters({ ...filters, orderMode: 'scrambled', scrambleNonce: filters.scrambleNonce + 1 })}
          >
            <Shuffle size={12} /> Scrambled
          </button>
        </div>

        <div className="ws__tool-end">
          <button type="button" className="ws__chip" onClick={handleRefresh}>
            <RefreshCw size={12} className={refreshState === 'working' ? 'spin' : ''} />
            {refreshState === 'working' ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      <VirtualQuestionList
        questionIds={visibleQuestionIds}
        renderRow={(questionId) => {
          const question = questionMap.get(questionId)
          if (!question) return null

          const expanded = filters.expandedQuestionId === questionId
          const qs = userState[questionId]
          const msRevealed = Boolean(revealedMs[questionId])
          const paperTint = PAPER_TINTS[question.paper] ?? 'rose'

          return (
            <article
              data-qid={questionId}
              className={`ws__q${expanded ? ' is-expanded' : ''}${qs?.difficult ? ' is-difficult' : ''}${qs?.completed ? ' is-completed' : ''}`}
            >
              <div className="ws__q-row">
                <button
                  type="button"
                  className="ws__q-toggle"
                  onClick={() => updateFilters({ ...filters, expandedQuestionId: expanded ? null : questionId })}
                >
                  <div className="ws__q-headline">
                    <span className="ws__q-ref">{question.referenceCode}</span>
                    <span className={`ws__q-tag ws__q-tag--${paperTint}`}>{question.paper === '2' ? 'Paper 2' : `Paper ${question.paper}`}</span>
                    <span className="ws__q-tag ws__q-tag--sage">{question.level}</span>
                    {qs?.completed ? <span className="ws__q-tag ws__q-tag--done"><CheckCircle2 size={10} />completed</span> : null}
                    {qs?.difficult ? <span className="ws__q-tag ws__q-tag--hard"><Flag size={10} />difficult</span> : null}
                  </div>
                  <p className="ws__q-crumbs">{describeQuestion(question)}</p>
                </button>

                <div className="ws__q-actions">
                  <button
                    type="button"
                    className={`ws__icon-btn${qs?.completed ? ' is-active' : ''}`}
                    title="Mark completed"
                    onClick={() =>
                      setUserState((cur) => ({
                        ...cur,
                        [questionId]: {
                          completed: !cur[questionId]?.completed,
                          difficult: cur[questionId]?.difficult ?? false,
                          updatedAt: new Date().toISOString(),
                        },
                      }))
                    }
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    type="button"
                    className={`ws__icon-btn is-danger${qs?.difficult ? ' is-active' : ''}`}
                    title="Toggle difficult"
                    onClick={() =>
                      setUserState((cur) => ({
                        ...cur,
                        [questionId]: {
                          completed: cur[questionId]?.completed ?? false,
                          difficult: !cur[questionId]?.difficult,
                          updatedAt: new Date().toISOString(),
                        },
                      }))
                    }
                  >
                    <Flag size={16} />
                  </button>
                  <button
                    type="button"
                    className="ws__icon-btn"
                    title={expanded ? 'Collapse' : 'Expand'}
                    onClick={() => updateFilters({ ...filters, expandedQuestionId: expanded ? null : questionId })}
                  >
                    <ChevronDown size={16} className={expanded ? 'ws__chev ws__chev--open' : 'ws__chev'} />
                  </button>
                </div>
              </div>

              {expanded ? (
                <div className="ws__q-detail">
                  {(() => {
                    const detail = details[questionId]
                    if (!detail || detail === 'loading') {
                      return <div className="ws__q-question">— loading question —</div>
                    }
                    if (detail === 'error') {
                      return <div className="ws__q-question">— failed to load question —</div>
                    }
                    return (
                      <>
                        <SafeHtml className="ws__q-question" html={detail.questionHtml} />
                        <button
                          type="button"
                          className="ws__q-reveal"
                          onClick={() => setRevealedMs((cur) => ({ ...cur, [questionId]: !cur[questionId] }))}
                        >
                          <BookOpen size={14} /> {msRevealed ? 'hide mark scheme' : 'reveal mark scheme'}
                        </button>
                        {msRevealed ? <SafeHtml className="ws__ms" html={detail.markschemeHtml} /> : null}
                      </>
                    )
                  })()}
                </div>
              ) : null}
            </article>
          )
        }}
      />

      <footer className="ws__foot">
        <span>RegretLess · IB Questionbank</span>
        <span className="ws__foot-rule" />
        <span>No regrets. Just marks. · M26</span>
      </footer>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Layers2, RefreshCw, RotateCcw, Stamp, Scissors } from 'lucide-react'
import { useSubjectBundle } from '../lib/use-subject-bundle'
import { useRefreshControl } from '../lib/use-refresh-control'
import { buildCanonicalQuestionSequence } from '../lib/questions'
import {
  buildSyllabusIndex,
  emptySelection,
  getNodeSelectionState,
  getSelectionLabels,
  selectAllUnits,
  toggleSelectionNode,
} from '../lib/selection'
import { buildWorkspacePath, parseSelection, serializeSelection } from '../lib/url-state'
import type { SyllabusIndex } from '../lib/selection'
import type { NormalizedSelection, SyllabusNode, WorkspaceFilterState } from '../types'
import './SubjectDesign1.css'

function ZineNode({
  node, index, selection, onToggle, depth = 0,
}: {
  node: SyllabusNode
  index: SyllabusIndex
  selection: NormalizedSelection
  onToggle: (id: string) => void
  depth?: number
}) {
  const ref = useRef<HTMLInputElement>(null)
  const state = getNodeSelectionState(selection, index, node.id)
  const children = node.childIds
    .map((id) => index.nodeMap.get(id))
    .filter((c): c is SyllabusNode => Boolean(c))

  useEffect(() => { if (ref.current) ref.current.indeterminate = state.partial }, [state.partial])

  return (
    <div className={`sd1-node sd1-node--d${depth}`} data-checked={state.checked} data-partial={state.partial}>
      <label className="sd1-node__row">
        <input ref={ref} type="checkbox" checked={state.checked} onChange={() => onToggle(node.id)} />
        <span className="sd1-node__box" aria-hidden="true">
          {state.checked ? '✕' : state.partial ? '–' : ''}
        </span>
        <span className="sd1-node__copy">
          <span className="sd1-node__title" data-text={node.label}>{node.label}</span>
          <span className="sd1-node__kind">{node.kind === 'umbrella' ? 'umbrella' : 'subunit'}</span>
        </span>
      </label>
      {children.length ? (
        <div className="sd1-node__children">
          {children.map((c) => (
            <ZineNode key={c.id} node={c} index={index} selection={selection} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SubjectDesign1() {
  const navigate = useNavigate()
  const { subjectId } = useParams()
  const [searchParams] = useSearchParams()
  const { bundle, status, error } = useSubjectBundle(subjectId)
  const { meta, refreshState, handleRefresh, label } = useRefreshControl()

  const syllabusIndex = useMemo(() => (bundle ? buildSyllabusIndex(bundle.syllabus) : null), [bundle])
  const [selection, setSelection] = useState<NormalizedSelection>(emptySelection())

  useEffect(() => {
    if (!bundle || !syllabusIndex) return
    setSelection(parseSelection(searchParams.get('units'), syllabusIndex))
  }, [bundle, searchParams, syllabusIndex])

  const questionCount = useMemo(() => {
    if (!bundle || !syllabusIndex) return 0
    return buildCanonicalQuestionSequence(bundle, selection, syllabusIndex).length
  }, [bundle, selection, syllabusIndex])

  const selectionLabels = useMemo(
    () => (syllabusIndex ? getSelectionLabels(selection, syllabusIndex) : []),
    [selection, syllabusIndex],
  )

  if (status === 'loading' || status === 'idle') {
    return <div className="sd1 sd1--empty"><span>loading the press run…</span></div>
  }
  if (status === 'error' || !bundle || !syllabusIndex || !subjectId) {
    return <div className="sd1 sd1--empty"><span>could not pull the bundle. {error}</span></div>
  }

  const defaultFilters: WorkspaceFilterState = {
    paperFilters: ['1A', '1B', '2'],
    levelFilters: ['SL', 'HL'],
    onlyDifficult: false,
    orderMode: 'source',
    scrambleNonce: 0,
    expandedQuestionId: null,
  }

  const rootNodes = syllabusIndex.rootIds
    .map((id) => syllabusIndex.nodeMap.get(id))
    .filter((n): n is SyllabusNode => Boolean(n))

  const total = bundle.questions.length

  return (
    <div className="sd1">
      <div className="sd1__halftone" aria-hidden="true" />
      <div className="sd1__paper-edge sd1__paper-edge--t" aria-hidden="true" />
      <div className="sd1__paper-edge sd1__paper-edge--b" aria-hidden="true" />

      <div className="sd1__strip">
        <Link to="/" className="sd1__back">
          <ChevronLeft size={14} /> back to the news-stand
        </Link>
        <span className="sd1__strip-meta">{meta ?? 'no manifest'}</span>
        <button type="button" className="sd1__strip-btn" onClick={handleRefresh}>
          <RefreshCw size={12} className={refreshState === 'working' ? 'spin' : ''} />
          {label}
        </button>
      </div>

      <header className="sd1__masthead">
        <div className="sd1__masthead-row">
          <span className="sd1__pill"><Stamp size={12} /> Special Issue · Physics</span>
          <span className="sd1__pill sd1__pill--alt"><Scissors size={12} /> tear here →</span>
        </div>
        <h1 className="sd1__title" data-text={bundle.subject.name}>{bundle.subject.name}</h1>
        <p className="sd1__deck">
          A two-color study set. Pick the units you want printed in this run; the
          press will gather every matching question for the workspace.
        </p>
      </header>

      <section className="sd1__board">
        <aside className="sd1__sidebar">
          <div className="sd1__card sd1__card--summary">
            <div className="sd1__card-stamp">
              <span>SET</span>
              <b>{questionCount}</b>
            </div>
            <div className="sd1__card-band">— current run —</div>
            <h3 className="sd1__card-name">In this issue</h3>
            <ul className="sd1__stats">
              <li><span>Selected units</span><b>{selectionLabels.length}</b></li>
              <li><span>Questions printed</span><b>{questionCount.toLocaleString()}</b></li>
              <li><span>Total in bank</span><b>{total.toLocaleString()}</b></li>
            </ul>

            <div className="sd1__chips">
              {selectionLabels.length
                ? selectionLabels.map((lbl) => <span key={lbl} className="sd1__chip">{lbl}</span>)
                : <span className="sd1__chip sd1__chip--empty">no units pinned yet</span>}
            </div>

            <button
              type="button"
              className="sd1__go"
              disabled={!selectionLabels.length}
              onClick={() =>
                navigate(buildWorkspacePath(subjectId, selection, defaultFilters), {
                  state: { selection: serializeSelection(selection) },
                })
              }
            >
              <span>SEND TO PRESS</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </aside>

        <div className="sd1__main">
          <div className="sd1__main-head">
            <div>
              <span className="sd1__eyebrow">— units —</span>
              <h2>Choose any combination</h2>
            </div>
            <div className="sd1__actions">
              <button type="button" className="sd1__action sd1__action--alt" onClick={() => setSelection(selectAllUnits(syllabusIndex))}>
                <Layers2 size={14} /> select all
              </button>
              <button type="button" className="sd1__action" onClick={() => setSelection(emptySelection())}>
                <RotateCcw size={14} /> clear
              </button>
            </div>
          </div>

          <div className="sd1__tree">
            {rootNodes.map((node, i) => (
              <div key={node.id} className={`sd1__sheet sd1__sheet--${(i % 3) + 1}`} style={{ '--i': i } as React.CSSProperties}>
                <ZineNode node={node} index={syllabusIndex} selection={selection} onToggle={(id) => setSelection((cur) => toggleSelectionNode(cur, syllabusIndex, id))} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="sd1__foot">
        <span>printed in two passes · peach &amp; teal · 2025</span>
      </footer>
    </div>
  )
}

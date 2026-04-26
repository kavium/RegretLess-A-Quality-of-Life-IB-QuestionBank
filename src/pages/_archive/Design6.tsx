import { Link } from 'react-router-dom'
import { Stamp, Scissors, MapPin, RefreshCw } from 'lucide-react'
import { useDataContext } from '../lib/data-context'
import { useRefreshControl } from '../lib/use-refresh-control'
import './Design6.css'

export function Design6() {
  const { manifest } = useDataContext()
  const { meta, refreshState, handleRefresh, label } = useRefreshControl()
  const subjects = manifest?.subjects ?? []

  return (
    <div className="d6">
      <div className="d6__halftone" aria-hidden="true" />
      <div className="d6__paper-edge d6__paper-edge--t" aria-hidden="true" />
      <div className="d6__paper-edge d6__paper-edge--b" aria-hidden="true" />

      <div className="d6__strip">
        <span className="d6__strip-meta">{meta ?? 'no postcards in the mail'}</span>
        <button type="button" className="d6__strip-btn" onClick={handleRefresh}>
          <RefreshCw size={12} className={refreshState === 'working' ? 'spin' : ''} />
          {label}
        </button>
      </div>

      <header className="d6__masthead">
        <div className="d6__masthead-row">
          <span className="d6__pill"><Stamp size={12} /> Issue 06</span>
          <span className="d6__pill d6__pill--alt"><MapPin size={12} /> from the study desk</span>
          <span className="d6__pill"><Scissors size={12} /> tear here →</span>
        </div>
        <h1 className="d6__title" data-text="QUESTIONBANK">
          QUESTIONBANK<br/>
          <span className="d6__title-sub">— a riso-printed zine —</span>
        </h1>
        <p className="d6__deck">
          Two-color print run. Slightly out of register, on purpose. Pick a subject postcard
          and pin it to your wall.
        </p>
      </header>

      <section className="d6__postcards">
        {subjects.map((s, i) => (
          <Link key={s.id} to={`/subject/${s.id}`} className={`d6__card d6__card--${(i % 3) + 1}`} style={{ '--i': i } as React.CSSProperties}>
            <div className="d6__card-stamp">
              <span>NO.</span>
              <b>{String(i + 1).padStart(2, '0')}</b>
            </div>
            <div className="d6__card-band">— greetings from —</div>
            <h3 className="d6__card-name" data-text={s.name}>{s.name}</h3>
            <div className="d6__card-foot">
              <span>{s.questionCount.toLocaleString()} q</span>
              <span className="d6__card-arrow">↗ post</span>
            </div>
          </Link>
        ))}
        {subjects.length === 0 ? (
          <div className="d6__empty">no postcards in the mail today.</div>
        ) : null}
      </section>

      <footer className="d6__foot">
        <span>printed in two passes · peach &amp; teal · 2025</span>
      </footer>
    </div>
  )
}

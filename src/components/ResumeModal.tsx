import { ArrowRight, RotateCcw, Trash2 } from 'lucide-react'
import type { WorkspaceState } from '../types'

interface ResumeModalProps {
  resume: WorkspaceState
  onDismiss: () => void
  onResume: () => void
  onForget: () => void
}

export function ResumeModal({ resume, onDismiss, onForget, onResume }: ResumeModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="resume-title">
        <div className="modal-card__icon">
          <RotateCcw size={20} />
        </div>

        <div className="modal-card__copy">
          <p className="eyebrow">— pick up where you left off —</p>
          <h2 id="resume-title">Resume your last session?</h2>
          <p className="modal-card__summary">You left at {resume.summaryLabel}.</p>
          <p className="modal-card__meta">Saved {new Date(resume.updatedAt).toLocaleString()}</p>
        </div>

        <div className="modal-card__actions">
          <button type="button" className="modal-btn" onClick={onDismiss}>
            Not now
          </button>
          <button type="button" className="modal-btn modal-btn--danger" onClick={onForget}>
            <Trash2 size={14} />
            Forget
          </button>
          <button type="button" className="modal-btn modal-btn--primary" onClick={onResume}>
            Resume <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

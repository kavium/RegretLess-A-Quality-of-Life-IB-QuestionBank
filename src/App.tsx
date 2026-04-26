import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DataProvider } from './lib/data-context'
import { SubjectPickerPage } from './pages/SubjectPickerPage'
import { StudySetupPage } from './pages/StudySetupPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { ResumeModal } from './components/ResumeModal'
import { clearResumeState, getResumeState } from './lib/storage'
import { ensureMathJax } from './lib/mathjax'

function AppFrame() {
  const location = useLocation()
  const navigate = useNavigate()
  const [resumeDismissed, setResumeDismissed] = useState(false)
  const [resumeSnapshot] = useState(() => getResumeState())

  useEffect(() => {
    void ensureMathJax()
  }, [])

  const currentPath = `${location.pathname}${location.search}`
  const onWorkspaceRoute = location.pathname.endsWith('/workspace')
  const shouldOfferResume = Boolean(
    resumeSnapshot &&
      !resumeDismissed &&
      !onWorkspaceRoute &&
      resumeSnapshot.workspaceUrl !== currentPath,
  )
  return (
    <div className="app-shell">
      <main className="app-main app-main--bleed">
        <Routes>
          <Route path="/" element={<SubjectPickerPage />} />
          <Route path="/subject/:subjectId" element={<StudySetupPage />} />
          <Route path="/subject/:subjectId/workspace" element={<WorkspacePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {shouldOfferResume && resumeSnapshot ? (
        <ResumeModal
          resume={resumeSnapshot}
          onDismiss={() => setResumeDismissed(true)}
          onResume={() => {
            setResumeDismissed(true)
            navigate(resumeSnapshot.workspaceUrl)
          }}
          onForget={() => {
            clearResumeState()
            setResumeDismissed(true)
          }}
        />
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <AppFrame />
      </DataProvider>
    </HashRouter>
  )
}

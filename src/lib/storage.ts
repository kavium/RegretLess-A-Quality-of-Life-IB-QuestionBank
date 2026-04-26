import type { UserQuestionStateMap, WorkspaceState } from '../types'

const RESUME_KEY = 'qol-ib-qb:resume'
const USER_STATE_KEY_PREFIX = 'qol-ib-qb:user-state:'

function readJson<T>(key: string): T | null {
  try {
    const rawValue = window.localStorage.getItem(key)

    if (!rawValue) {
      return null
    }

    return JSON.parse(rawValue) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getResumeState() {
  return readJson<WorkspaceState>(RESUME_KEY)
}

export function setResumeState(state: WorkspaceState) {
  writeJson(RESUME_KEY, state)
}

export function clearResumeState() {
  window.localStorage.removeItem(RESUME_KEY)
}

export function getUserQuestionState(subjectId: string) {
  return readJson<UserQuestionStateMap>(`${USER_STATE_KEY_PREFIX}${subjectId}`) ?? {}
}

export function setUserQuestionState(subjectId: string, state: UserQuestionStateMap) {
  writeJson(`${USER_STATE_KEY_PREFIX}${subjectId}`, state)
}

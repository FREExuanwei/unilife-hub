import type { TimeSegment } from '../study/studyTypes'
export type PomodoroMode = 'focus' | 'break'
export interface PomodoroSettings { focusMinutes: number; breakMinutes: number }
export interface PomodoroState {
  mode: PomodoroMode; status: 'idle'|'running'|'paused'; cycleId: string|null
  title: string; courseId: string|null; semesterId: string|null; courseNameSnapshot: string
  startedAt: number|null; resumedAt: number|null; targetEndTime: number|null
  remainingMs: number; plannedMs: number; segments: TimeSegment[]
}
export interface PomodoroData { version: 1; settings: PomodoroSettings; state: PomodoroState; notice: string|null }
export type PomodoroAction =
  | { type: 'settings'; settings: PomodoroSettings }
  | { type: 'mode'; mode: PomodoroMode }
  | { type: 'start'; cycleId: string; title: string; courseId: string|null; semesterId: string|null; courseNameSnapshot: string }
  | { type: 'pause'|'resume'|'complete'; cycleId: string }
  | { type: 'finish'; cycleId: string; save: boolean }
  | { type: 'dismiss' }

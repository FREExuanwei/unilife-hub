export interface Semester { id: string; name: string; startDate: string; totalWeeks: number }
export type SemesterDraft = Omit<Semester, 'id'>
export type SemesterErrors = Partial<Record<keyof SemesterDraft, string>>
export type SemesterWeek = { status: 'active'; week: number } | { status: 'unset' | 'before' | 'after'; week: null }

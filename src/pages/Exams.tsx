import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarRange, History, Plus, Search, Sparkles, Timer } from 'lucide-react'
import { useCurrentDate } from '../hooks/useCurrentDate'
import { useCourses } from '../features/courses/useCourses'
import { useExams } from '../features/exams/useExams'
import { useViewedSemester } from '../features/semester/useViewedSemester'
import SemesterSelector from '../features/semester/components/SemesterSelector'
import ExamCard from '../features/exams/components/ExamCard'
import ExamFilters from '../features/exams/components/ExamFilters'
import ExamModal from '../features/exams/components/ExamModal'
import type { ExamDialog } from '../features/exams/components/ExamModal'
import ExamStats from '../features/exams/components/ExamStats'
import NextExamCard from '../features/exams/components/NextExamCard'
import type { ExamFilters as Filters } from '../features/exams/examTypes'
import { filterExams, getExamStatus, nextExam, sortEndedExams, sortUpcomingExams } from '../features/exams/examUtils'

export default function Exams() {
  const now = useCurrentDate()
  const { data } = useCourses()
  const { exams, storageError } = useExams()
  const [params, setParams] = useSearchParams()
  const linkedExam = exams.find(exam => exam.id === params.get('exam'))
  const { semester, automatic, onSelect } = useViewedSemester(now, linkedExam?.semesterId)
  const [status, setStatus] = useState<Filters['status']>('upcoming')
  const [type, setType] = useState<Filters['type']>('all')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<ExamDialog | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const examId = params.get('exam')
    if (!examId && params.get('action') !== 'add') return
    if (examId) {
      const exam = exams.find(item => item.id === examId)
      if (exam) onSelect(exam.semesterId)
      setDialog({ mode: 'details', id: examId })
    } else {
      setDialog({ mode: 'add' })
    }
    const next = new URLSearchParams(params)
    next.delete('exam')
    next.delete('action')
    setParams(next, { replace: true })
  }, [exams, onSelect, params, setParams])

  const filters: Filters = { semesterId: semester?.id ?? null, status, type, search }
  const scoped = semester ? exams.filter(exam => exam.semesterId === semester.id) : []
  const visible = semester ? filterExams(exams, filters, data.courses, now) : []
  const upcoming = sortUpcomingExams(visible.filter(exam => getExamStatus(exam, now) !== 'ended'))
  const ended = sortEndedExams(visible.filter(exam => getExamStatus(exam, now) === 'ended'))
  const next = nextExam(scoped, now)

  function filterChange(value: Filters) {
    setStatus(value.status)
    setType(value.type)
    setSearch(value.search)
  }

  function configureSemester() {
    const selector = document.getElementById('exam-semester')
    selector?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    selector?.querySelector<HTMLButtonElement>('button')?.focus()
  }

  function renderList(items: typeof visible, title: string, history = false) {
    if (!items.length) return null
    return <section className="exam-list-section" aria-label={title}>
      <div className="exam-list-heading">
        <h2>{history && <History size={18} aria-hidden="true" />}{title} <span>{items.length}</span></h2>
        <p>{history ? '最近结束的考试排在前面，记录会一直保留。' : '按考试日期与时间，从近到远排列。'}</p>
      </div>
      <div className="exam-grid">{items.map(exam => <ExamCard key={exam.id} exam={exam}
        courseName={data.courses.find(course => course.id === exam.courseId)?.name} now={now}
        onOpen={() => setDialog({ mode: 'details', id: exam.id })}
        onEdit={() => setDialog({ mode: 'edit', id: exam.id })}
        onDelete={() => setDialog({ mode: 'delete', id: exam.id })} />)}</div>
    </section>
  }

  return <div className="exams-page">
    <div className="schedule-heading">
      <div><p className="eyebrow">A LITTLE PREPARATION, MORE PEACE OF MIND</p><h1>考试倒计时 <span className="schedule-title-icon"><Timer size={24} aria-hidden="true" /></span></h1><p>记下每一场考试，让准备有条不紊。</p></div>
      <button type="button" className="primary-button" disabled={!semester} onClick={() => setDialog({ mode: 'add' })}><Plus size={18} aria-hidden="true" />添加考试</button>
    </div>
    {storageError && <p className="storage-notice" role="alert">{storageError}</p>}
    <p className="bookmark-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
    <div id="exam-semester"><SemesterSelector semester={semester} onSelect={id => { onSelect(id); setDialog(null) }} isWithin={automatic.isWithin} onFeedback={setFeedback} /></div>
    {semester ? <>
      <ExamStats exams={scoped} now={now} />
      <NextExamCard exam={next} courseName={data.courses.find(course => course.id === next?.courseId)?.name} now={now} onOpen={() => { if (next) setDialog({ mode: 'details', id: next.id }) }} onAdd={() => setDialog({ mode: 'add' })} />
      <ExamFilters filters={filters} onChange={filterChange} />
      {visible.length ? <>{renderList(upcoming, status === 'today' ? '今天的考试' : status === 'week' ? '7 天内的考试' : '即将到来')}{renderList(ended, '历史考试', true)}</>
        : <section className="exam-empty"><span><Search size={34} aria-hidden="true" /></span>
          <h2>{scoped.length ? (status === 'upcoming' && !search && type === 'all' ? '接下来，暂时没有考试。' : '没有符合条件的考试') : '还没有添加考试'}</h2>
          <p>{scoped.length ? '可以查看历史记录，或调整类型与搜索关键词。' : '添加考试后，这里会自动为你计算倒计时。考试只会显示在所属学期。'}</p>
          <button type="button" className="primary-button" onClick={() => scoped.length ? filterChange({ ...filters, status: 'all', type: 'all', search: '' }) : setDialog({ mode: 'add' })}>{scoped.length ? '查看全部考试' : '添加第一场考试'}</button>
        </section>}
    </> : <section className="exam-empty exam-no-semester"><span><CalendarRange size={36} aria-hidden="true" /></span><h2>先为考试设置一个学期</h2><p>每场考试都需要所属学期。点击上方「新建学期」，设置日期范围后就可以添加考试。</p><button type="button" className="primary-button" onClick={configureSemester}>设置学期</button></section>}
    <p className="exam-footnote"><Sparkles size={13} aria-hidden="true" />考试保存在当前浏览器中 · 按设备本地时间自动更新 · 已结束记录继续保留</p>
    <ExamModal dialog={dialog} semesterId={semester?.id ?? null} now={now} onDialog={setDialog} onFeedback={setFeedback} />
  </div>
}

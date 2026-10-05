import { CalendarRange } from 'lucide-react'
import { Link } from 'react-router'
import { useCourses } from '../../courses/useCourses'
import { calculateCurrentWeek, weekStatusLabel } from '../weekUtils'
import { selectDefaultSemester } from '../semesterUtils'
export default function SemesterBadge({ now }: { now: Date }) {
  const { data, storageError } = useCourses()
  const {semester,isWithin}=selectDefaultSemester(data.semesters,now)
  return <Link to="/settings" className="semester-badge"><CalendarRange size={16} aria-hidden="true" /><span>{storageError ? '学期数据暂时无法读取' : semester?.name ?? '设置你的第一个学期'}</span>{!storageError && <strong>{semester && !isWithin ? '当前日期不在已设置学期范围内' : weekStatusLabel(calculateCurrentWeek(semester, now))}</strong>}</Link>
}

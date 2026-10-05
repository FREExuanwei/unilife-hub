import { GraduationCap } from 'lucide-react'

export default function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon"><GraduationCap size={25} strokeWidth={1.8} aria-hidden="true" /></span>
      <span><strong>UniLife <span>Hub</span></strong><small>你的大学生活助手</small></span>
    </div>
  )
}

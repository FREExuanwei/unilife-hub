import type { LucideIcon } from 'lucide-react'

export type CardTone = 'blue' | 'orange' | 'purple' | 'cyan' | 'pink' | 'neutral'
interface DashboardCardProps {
  title: string
  value: string
  unit?: string
  description: string
  icon: LucideIcon
  tone: CardTone
  numeric?: boolean
}

export default function DashboardCard({ title, value, unit, description, icon: Icon, tone, numeric }: DashboardCardProps) {
  return <article className={`dashboard-card tone-${tone}`}><div className="card-top"><h3>{title}</h3><span className="card-icon"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span></div><p className={`card-value${numeric ? ' numeric' : ''}`}>{value}{unit && <span className="card-unit">{unit}</span>}</p><p className="card-description">{description}</p></article>
}

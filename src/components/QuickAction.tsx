import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { CardTone } from './DashboardCard'

interface QuickActionProps { title: string; description: string; to: string; icon: LucideIcon; tone: CardTone }

export default function QuickAction({ title, description, to, icon: Icon, tone }: QuickActionProps) {
  return <Link to={to} className={`quick-action tone-${tone}`}><span className="quick-icon"><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span><span className="quick-text"><strong>{title}</strong><small>{description}</small></span><ArrowUpRight className="quick-arrow" size={19} aria-hidden="true" /></Link>
}

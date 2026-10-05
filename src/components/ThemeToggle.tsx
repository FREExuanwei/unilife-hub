import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../utils/theme'

interface ThemeToggleProps { theme: Theme; onToggle: () => void }

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const Icon = theme === 'light' ? Moon : Sun
  return <button type="button" className="theme-toggle" onClick={onToggle} aria-label={`切换到${theme === 'light' ? '深色' : '浅色'}模式`} title={`切换到${theme === 'light' ? '深色' : '浅色'}模式`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></button>
}

import { categoryTone } from '../bookmarkUtils'

interface CategoryFilterProps { categories: string[]; selected: string; onChange: (category: string) => void; counts: Record<string, number>; total: number }

export default function CategoryFilter({ categories, selected, onChange, counts, total }: CategoryFilterProps) {
  return (
    <div className="category-filter" role="group" aria-label="按分类筛选网站">
      <button type="button" className={`category-chip${selected === '__all__' ? ' selected' : ''}`} aria-pressed={selected === '__all__'} onClick={() => onChange('__all__')}>全部<span>{total}</span></button>
      {categories.map((category) => <button type="button" key={category} className={`category-chip tone-${categoryTone(category)}${selected === category ? ' selected' : ''}`} aria-pressed={selected === category} onClick={() => onChange(category)}><span className="category-dot" />{category}<span>{counts[category] ?? 0}</span></button>)}
    </div>
  )
}

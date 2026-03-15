import type { FilterState } from '../pages/BoardPage'
import { LABELS } from '../types'

interface Props {
  filter: FilterState
  onChange: (f: FilterState) => void
}

export default function FilterBar({ filter, onChange }: Props) {
  const active = filter.search || filter.labels.length || filter.dueSoon

  const toggleLabel = (id: string) => {
    const labels = filter.labels.includes(id)
      ? filter.labels.filter((l) => l !== id)
      : [...filter.labels, id]
    onChange({ ...filter, labels })
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-black/10 shrink-0 flex-wrap">
      <input
        className="bg-white/20 text-white placeholder-white/60 text-sm rounded px-2 py-1 focus:outline-none focus:bg-white/30 w-40"
        placeholder="Search cards…"
        value={filter.search}
        onChange={(e) => onChange({ ...filter, search: e.target.value })}
      />
      <div className="flex gap-1">
        {LABELS.map((l) => (
          <button
            key={l.id}
            onClick={() => toggleLabel(l.id)}
            className={`${l.color} w-5 h-5 rounded-sm transition ${filter.labels.includes(l.id) ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'}`}
          />
        ))}
      </div>
      <button
        onClick={() => onChange({ ...filter, dueSoon: !filter.dueSoon })}
        className={`text-xs px-2 py-1 rounded transition ${filter.dueSoon ? 'bg-white text-sky-700 font-medium' : 'text-white/70 hover:text-white bg-white/10'}`}
      >
        Due soon
      </button>
      {active && (
        <button
          onClick={() => onChange({ search: '', labels: [], dueSoon: false, assignedToMe: false })}
          className="text-white/60 hover:text-white text-xs"
        >
          Clear
        </button>
      )}
    </div>
  )
}

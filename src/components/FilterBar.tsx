import type { FilterState } from '../pages/BoardPage'
import type { BoardLabel } from '../types'

interface Props {
  filter: FilterState
  onChange: (f: FilterState) => void
  boardLabels: BoardLabel[]
}

export default function FilterBar({ filter, onChange, boardLabels }: Props) {
  const active = filter.search || filter.labels.length || filter.dueSoon

  const toggleLabel = (id: number) => {
    const sid = String(id)
    const labels = filter.labels.includes(sid)
      ? filter.labels.filter((l) => l !== sid)
      : [...filter.labels, sid]
    onChange({ ...filter, labels })
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-black/15 backdrop-blur-sm border-b border-white/10 shrink-0 flex-wrap">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="bg-white/10 text-white placeholder-white/40 text-sm rounded-lg pl-7 pr-2.5 py-1 focus:outline-none focus:bg-white/20 w-36 transition border border-transparent focus:border-white/20"
          placeholder="Search cards…"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
        />
      </div>

      {/* Label pills */}
      {boardLabels.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {boardLabels.map((l) => (
            <button
              key={l.id}
              onClick={() => toggleLabel(l.id)}
              title={l.name || l.color}
              className={`${l.color} h-5 rounded-full px-2.5 text-xs font-medium text-white/90 transition-all ${filter.labels.includes(String(l.id)) ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-105' : 'opacity-55 hover:opacity-90'}`}
            >
              {l.name || ''}
            </button>
          ))}
        </div>
      )}

      {/* Due soon */}
      <button
        onClick={() => onChange({ ...filter, dueSoon: !filter.dueSoon })}
        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition font-medium ${filter.dueSoon ? 'bg-white text-sky-700' : 'text-white/65 hover:text-white bg-white/10 hover:bg-white/15'}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Due soon
      </button>

      {/* Clear */}
      {active && (
        <button
          onClick={() => onChange({ search: '', labels: [], dueSoon: false, assignedToMe: false })}
          className="text-white/50 hover:text-white text-xs transition flex items-center gap-0.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      )}
    </div>
  )
}

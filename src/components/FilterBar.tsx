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
    <div className="flex items-center gap-2 px-4 py-1.5 bg-black/10 shrink-0 flex-wrap">
      <input
        className="bg-white/20 text-white placeholder-white/60 text-sm rounded px-2 py-1 focus:outline-none focus:bg-white/30 w-40"
        placeholder="Search cards…"
        value={filter.search}
        onChange={(e) => onChange({ ...filter, search: e.target.value })}
      />
      <div className="flex gap-1 flex-wrap">
        {boardLabels.map((l) => (
          <button
            key={l.id}
            onClick={() => toggleLabel(l.id)}
            title={l.name || l.color}
            className={`${l.color} h-5 rounded px-2 text-xs font-medium text-white/90 transition ${filter.labels.includes(String(l.id)) ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'}`}
          >
            {l.name || ''}
          </button>
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

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { useStore } from '../store'

interface Props {
  card: Card
  canEdit: boolean
  dimmed: boolean
  onClick: () => void
  onDelete: () => void
  onToggleComplete: () => void
}

export default function SortableCard({ card, canEdit, dimmed, onClick, onDelete, onToggleComplete }: Props) {
  const boardLabels = useStore((s) => s.boardLabels)
  const labelsExpanded = useStore((s) => s.labelsExpanded)
  const toggleLabelsExpanded = useStore((s) => s.toggleLabelsExpanded)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : dimmed ? 0.35 : 1,
  }

  const cardLabels = boardLabels.filter((l) => card.labels?.includes(String(l.id)))

  return (
    <div ref={setNodeRef} style={style} className="bg-white/85 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group select-none">
      {card.cover_color && <div className={`${card.cover_color} h-9 w-full`} />}

      <div className="p-3">
        {cardLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {cardLabels.map((l) => (
              <button
                key={l.id}
                onClick={(e) => { e.stopPropagation(); toggleLabelsExpanded() }}
                title={labelsExpanded ? 'Hide label names' : l.name || l.color}
                className={`${l.color} rounded-full transition-all duration-150 cursor-pointer ${labelsExpanded ? 'h-5 px-2 text-xs font-medium text-white/90' : 'h-1.5 px-1 min-w-[2rem]'}`}
              >
                {labelsExpanded ? (l.name || '') : ''}
              </button>
            ))}
          </div>
        )}

        {/* Drag handle strip + complete toggle + title row */}
        <div className="flex items-start gap-1.5">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0 touch-none leading-none transition-colors"
          >
            ⠿
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete() }}
            className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${card.completed ? 'bg-emerald-500 border-emerald-500 opacity-100' : 'border-gray-300 opacity-0 group-hover:opacity-100 hover:border-emerald-400'}`}
            title={card.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {card.completed && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <p className={`text-sm leading-snug flex-1 cursor-pointer ${card.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`} onClick={onClick}>
            {card.title}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 gap-1">
          <div className="flex items-center gap-1.5">
            {card.due_date && (() => {
              const due = new Date(card.due_date + 'T00:00:00')
              const now = new Date()
              const overdue = due < now
              const soon = due < new Date(now.getTime() + 2 * 24 * 3600 * 1000)
              return (
                <span className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${overdue ? 'bg-red-100 text-red-600' : soon ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )
            })()}
            {card.checklist_total > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${card.checklist_done === card.checklist_total ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                {card.checklist_done}/{card.checklist_total}
              </span>
            )}
            {card.description && (
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h8" />
              </svg>
            )}
          </div>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onClick() }} className="text-gray-400 hover:text-sky-600 text-xs transition-colors">Edit</button>
            {canEdit && (
              <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-gray-400 hover:text-red-500 text-xs transition-colors">✕</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

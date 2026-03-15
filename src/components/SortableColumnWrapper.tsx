import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

interface Props {
  id: number
  children: (dragHandleProps: Record<string, any>) => ReactNode
}

export default function SortableColumnWrapper({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="shrink-0"
    >
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

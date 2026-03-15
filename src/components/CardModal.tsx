import { useState, useEffect } from 'react'
import type { Card, ChecklistItem } from '../types'
import { getChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem } from '../api'

const LABEL_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
const LABEL_BG: Record<string, string> = {
  red: 'bg-red-400', orange: 'bg-orange-400', yellow: 'bg-yellow-400',
  green: 'bg-emerald-400', blue: 'bg-sky-400', purple: 'bg-violet-400'
}

interface Props {
  card: Card
  boardId: number
  canEdit: boolean
  onClose: () => void
  onSave: (data: Partial<Card>) => Promise<void>
  onDelete: () => void
}

export default function CardModal({ card, boardId, canEdit, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [dueDate, setDueDate] = useState(card.due_date?.slice(0, 10) || '')
  const [labelColor, setLabelColor] = useState(card.label_color || '')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getChecklist(boardId, card.id).then((r) => setChecklist(r.data))
  }, [card.id])

  const save = async () => {
    setSaving(true)
    await onSave({ title, description, due_date: dueDate || null, label_color: labelColor || null })
    setSaving(false)
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    const r = await addChecklistItem(boardId, card.id, newItem.trim())
    setChecklist([...checklist, r.data])
    setNewItem('')
  }

  const toggleItem = async (item: ChecklistItem) => {
    await updateChecklistItem(boardId, card.id, item.id, { checked: !item.checked })
    setChecklist(checklist.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
  }

  const removeItem = async (item: ChecklistItem) => {
    await deleteChecklistItem(boardId, card.id, item.id)
    setChecklist(checklist.filter((i) => i.id !== item.id))
  }

  const done = checklist.filter((i) => i.checked).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <input
            className="text-lg font-semibold text-gray-800 flex-1 focus:outline-none border-b border-transparent focus:border-sky-300"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
        </div>

        {/* Label */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">Label</p>
          <div className="flex gap-2">
            <button
              onClick={() => setLabelColor('')}
              className={`w-6 h-6 rounded-full border-2 ${!labelColor ? 'border-gray-700' : 'border-gray-200'} bg-gray-100`}
            />
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => canEdit && setLabelColor(c)}
                className={`${LABEL_BG[c]} w-6 h-6 rounded-full ${labelColor === c ? 'ring-2 ring-offset-1 ring-gray-600' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">Due Date</p>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!canEdit}
          />
        </div>

        {/* Description */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
          <textarea
            className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300 resize-none"
            rows={3}
            placeholder="Add a description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
          />
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 font-medium">Checklist</p>
            {checklist.length > 0 && (
              <span className="text-xs text-gray-400">{done}/{checklist.length}</span>
            )}
          </div>
          {checklist.length > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
              <div
                className="bg-emerald-500 h-1 rounded-full transition-all"
                style={{ width: `${(done / checklist.length) * 100}%` }}
              />
            </div>
          )}
          <div className="space-y-1">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item)}
                  className="rounded"
                  disabled={!canEdit}
                />
                <span className={`text-sm flex-1 ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {item.text}
                </span>
                {canEdit && (
                  <button
                    onClick={() => removeItem(item)}
                    className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <form onSubmit={addItem} className="flex gap-2 mt-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                placeholder="Add item…"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
              />
              <button className="bg-sky-600 text-white text-xs rounded px-2 py-1 hover:bg-sky-700">Add</button>
            </form>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center justify-between pt-2 border-t">
            <button
              onClick={onDelete}
              className="text-red-500 text-sm hover:text-red-700"
            >Delete card</button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-sky-600 text-white text-sm rounded-lg px-4 py-1.5 hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

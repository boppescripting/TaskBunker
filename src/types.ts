export interface User {
  id: number
  username: string
  email: string
}

export interface Board {
  id: number
  title: string
  color: string
  owner_id: number
  role: 'owner' | 'admin' | 'member' | 'viewer'
  column_ids: number[]
}

export interface Column {
  id: number
  board_id: number
  title: string
  card_ids: number[]
  wip_limit: number | null
}

export interface Card {
  id: number
  column_id: number
  board_id: number
  title: string
  description: string
  due_date: string | null
  labels: string[]
  cover_color: string | null
  archived: boolean
  position: number
}

export interface ChecklistItem {
  id: number
  card_id: number
  text: string
  checked: boolean
}

export interface Comment {
  id: number
  card_id: number
  user_id: number
  username: string
  text: string
  created_at: string
}

export interface Assignee {
  user_id: number
  username: string
  email: string
}

export interface ActivityEntry {
  id: number
  card_id: number
  user_id: number
  username: string
  action: string
  created_at: string
}

export const LABELS = [
  { id: 'red', color: 'bg-red-400', text: 'text-red-700' },
  { id: 'orange', color: 'bg-orange-400', text: 'text-orange-700' },
  { id: 'yellow', color: 'bg-yellow-400', text: 'text-yellow-700' },
  { id: 'green', color: 'bg-emerald-400', text: 'text-emerald-700' },
  { id: 'blue', color: 'bg-sky-400', text: 'text-sky-700' },
  { id: 'purple', color: 'bg-violet-400', text: 'text-violet-700' },
  { id: 'pink', color: 'bg-pink-400', text: 'text-pink-700' },
  { id: 'teal', color: 'bg-teal-400', text: 'text-teal-700' },
]

export const COVER_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400',
  'bg-sky-400', 'bg-violet-400', 'bg-pink-400', 'bg-teal-400',
  'bg-slate-400', 'bg-gray-600',
]

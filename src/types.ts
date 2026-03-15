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

export interface BoardLabel {
  id: number
  board_id: number
  name: string
  color: string
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

export const LABEL_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400',
  'bg-sky-400', 'bg-violet-400', 'bg-pink-400', 'bg-teal-400',
  'bg-rose-500', 'bg-indigo-400', 'bg-lime-400', 'bg-cyan-400',
]

export const COVER_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400',
  'bg-sky-400', 'bg-violet-400', 'bg-pink-400', 'bg-teal-400',
  'bg-slate-400', 'bg-gray-600',
]

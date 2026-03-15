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
}

export interface Card {
  id: number
  column_id: number
  board_id: number
  title: string
  description: string
  due_date: string | null
  label_color: string | null
  position: number
}

export interface ChecklistItem {
  id: number
  card_id: number
  text: string
  checked: boolean
}

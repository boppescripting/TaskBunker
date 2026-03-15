import { create } from 'zustand'
import type { User, Board, Column, Card, BoardLabel } from './types'

interface AppState {
  user: User | null
  boards: Board[]
  currentBoard: Board | null
  columns: Column[]
  cards: Card[]
  boardLabels: BoardLabel[]
  setUser: (u: User | null) => void
  setBoards: (b: Board[]) => void
  setCurrentBoard: (b: Board | null) => void
  setColumns: (c: Column[] | ((prev: Column[]) => Column[])) => void
  setCards: (c: Card[] | ((prev: Card[]) => Card[])) => void
  setBoardLabels: (l: BoardLabel[]) => void
  updateColumn: (col: Column) => void
  updateCard: (card: Card) => void
  removeCard: (cardId: number) => void
  removeColumn: (colId: number) => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  boards: [],
  currentBoard: null,
  columns: [],
  cards: [],
  boardLabels: [],
  setUser: (user) => set({ user }),
  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (currentBoard) => set({ currentBoard }),
  setColumns: (c) => set((s) => ({ columns: typeof c === 'function' ? c(s.columns) : c })),
  setCards: (c) => set((s) => ({ cards: typeof c === 'function' ? c(s.cards) : c })),
  setBoardLabels: (boardLabels) => set({ boardLabels }),
  updateColumn: (col) =>
    set((s) => ({ columns: s.columns.map((c) => (c.id === col.id ? col : c)) })),
  updateCard: (card) =>
    set((s) => ({ cards: s.cards.map((c) => (c.id === card.id ? card : c)) })),
  removeCard: (cardId) =>
    set((s) => ({ cards: s.cards.filter((c) => c.id !== cardId) })),
  removeColumn: (colId) =>
    set((s) => ({ columns: s.columns.filter((c) => c.id !== colId) }))
}))

import axios from 'axios'
import type { Card } from './types'

const api = axios.create({ baseURL: '/api', withCredentials: true })

// Auth
export const register = (username: string, email: string, password: string) =>
  api.post('/auth/register', { username, email, password })
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me')

// Boards
export const getBoards = () => api.get('/boards')
export const createBoard = (title: string, color: string) => api.post('/boards', { title, color })
export const updateBoard = (id: number, data: Partial<{ title: string; color: string; column_ids: number[] }>) =>
  api.patch(`/boards/${id}`, data)
export const deleteBoard = (id: number) => api.delete(`/boards/${id}`)
export const getBoardMembers = (id: number) => api.get(`/boards/${id}/members`)
export const addBoardMember = (boardId: number, email: string, role: string) =>
  api.post(`/boards/${boardId}/members`, { email, role })
export const removeBoardMember = (boardId: number, userId: number) =>
  api.delete(`/boards/${boardId}/members/${userId}`)

// Columns
export const getColumns = (boardId: number) => api.get(`/boards/${boardId}/columns`)
export const createColumn = (boardId: number, title: string) =>
  api.post(`/boards/${boardId}/columns`, { title })
export const updateColumn = (boardId: number, colId: number, data: Partial<{ title: string; card_ids: number[]; wip_limit: number | null }>) =>
  api.patch(`/boards/${boardId}/columns/${colId}`, data)
export const deleteColumn = (boardId: number, colId: number) =>
  api.delete(`/boards/${boardId}/columns/${colId}`)

// Cards
export const getCards = (boardId: number, archived = false) =>
  api.get(`/boards/${boardId}/cards`, { params: { archived } })
export const createCard = (boardId: number, columnId: number, title: string) =>
  api.post(`/boards/${boardId}/cards`, { column_id: columnId, title })
export const updateCard = (boardId: number, cardId: number, data: Partial<Card>) =>
  api.patch(`/boards/${boardId}/cards/${cardId}`, data)
export const deleteCard = (boardId: number, cardId: number) =>
  api.delete(`/boards/${boardId}/cards/${cardId}`)
export const moveCard = (boardId: number, cardId: number, targetColumnId: number, targetBoardId?: number) =>
  api.post(`/boards/${boardId}/cards/${cardId}/move`, { target_column_id: targetColumnId, target_board_id: targetBoardId })
export const copyCard = (boardId: number, cardId: number, targetColumnId: number, title?: string) =>
  api.post(`/boards/${boardId}/cards/${cardId}/copy`, { target_column_id: targetColumnId, title })

// Checklist
export const getChecklist = (boardId: number, cardId: number) =>
  api.get(`/boards/${boardId}/cards/${cardId}/checklist`)
export const addChecklistItem = (boardId: number, cardId: number, text: string) =>
  api.post(`/boards/${boardId}/cards/${cardId}/checklist`, { text })
export const updateChecklistItem = (boardId: number, cardId: number, itemId: number, data: { text?: string; checked?: boolean }) =>
  api.patch(`/boards/${boardId}/cards/${cardId}/checklist/${itemId}`, data)
export const deleteChecklistItem = (boardId: number, cardId: number, itemId: number) =>
  api.delete(`/boards/${boardId}/cards/${cardId}/checklist/${itemId}`)

// Comments
export const getComments = (boardId: number, cardId: number) =>
  api.get(`/boards/${boardId}/cards/${cardId}/comments`)
export const addComment = (boardId: number, cardId: number, text: string) =>
  api.post(`/boards/${boardId}/cards/${cardId}/comments`, { text })
export const deleteComment = (boardId: number, cardId: number, commentId: number) =>
  api.delete(`/boards/${boardId}/cards/${cardId}/comments/${commentId}`)

// Assignees
export const getAssignees = (boardId: number, cardId: number) =>
  api.get(`/boards/${boardId}/cards/${cardId}/assignees`)
export const addAssignee = (boardId: number, cardId: number, userId: number) =>
  api.post(`/boards/${boardId}/cards/${cardId}/assignees/${userId}`)
export const removeAssignee = (boardId: number, cardId: number, userId: number) =>
  api.delete(`/boards/${boardId}/cards/${cardId}/assignees/${userId}`)

// Activity
export const getCardActivity = (boardId: number, cardId: number) =>
  api.get(`/boards/${boardId}/cards/${cardId}/activity`)

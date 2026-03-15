import { useEffect, useState } from 'react'
import { getBoardMembers, addBoardMember, removeBoardMember } from '../api'

interface Member { user_id: number; username: string; email: string; role: string }

interface Props { boardId: number; role: string; onClose: () => void }

export default function MembersModal({ boardId, role, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [error, setError] = useState('')

  const canManage = role === 'owner' || role === 'admin'

  useEffect(() => {
    getBoardMembers(boardId).then((r) => setMembers(r.data))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await addBoardMember(boardId, email, memberRole)
      const r = await getBoardMembers(boardId)
      setMembers(r.data)
      setEmail('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member')
    }
  }

  const handleRemove = async (userId: number) => {
    await removeBoardMember(boardId, userId)
    setMembers(members.filter((m) => m.user_id !== userId))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Board Members</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-2 mb-4">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">{m.username}</span>
                <span className="text-xs text-gray-400 ml-2">{m.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 capitalize">{m.role}</span>
                {canManage && m.role !== 'owner' && (
                  <button onClick={() => handleRemove(m.user_id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <form onSubmit={handleAdd} className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Add Member</p>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <input
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
              type="email" placeholder="Email address"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
            <div className="flex gap-2">
              <select
                className="border rounded px-2 py-1 text-sm flex-1 focus:outline-none"
                value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="bg-sky-600 text-white text-sm rounded px-3 py-1 hover:bg-sky-700">Add</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

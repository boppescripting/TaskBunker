import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, getMe } from '../api'
import { useStore } from '../store'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { setUser } = useStore()
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await register(username, email, password)
      const me = await getMe()
      setUser(me.data)
      nav('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-700">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-sky-700 mb-6 text-center">Create Account</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Username" value={username}
            onChange={(e) => setUsername(e.target.value)} required
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            type="password" placeholder="Password (min 8 chars)" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={8} required
          />
          <button className="w-full bg-sky-600 text-white rounded-lg py-2 font-semibold hover:bg-sky-700 transition">
            Register
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-gray-500">
          Have an account? <Link to="/login" className="text-sky-600 font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  )
}

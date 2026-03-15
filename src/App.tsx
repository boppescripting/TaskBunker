import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import { getMe } from './api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BoardsPage from './pages/BoardsPage'
import BoardPage from './pages/BoardPage'

export default function App() {
  const { user, setUser } = useStore()

  useEffect(() => {
    getMe()
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <BoardsPage /> : <Navigate to="/login" />} />
        <Route path="/board/:id" element={user ? <BoardPage /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

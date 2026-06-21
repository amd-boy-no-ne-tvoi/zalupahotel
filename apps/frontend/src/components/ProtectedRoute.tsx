import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'
import Layout from './Layout'

interface Props {
  allowedRoles: Role[]
  children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
        Загрузка...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />

  return <Layout>{children}</Layout>
}

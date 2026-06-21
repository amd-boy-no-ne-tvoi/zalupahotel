import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import styles from './LoginPage.module.css'

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  employee: '/employee',
  owner: '/owner',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? ''
      setError(msg === 'Invalid credentials' || !msg ? t('login.error') : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.card} glass`}>
        <div className={styles.logo}>🐾</div>
        <h1 className={styles.title}>{t('login.title')}</h1>
        <p className={styles.subtitle}>{t('login.subtitle')}</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <label className={styles.field}>
            <span>{t('login.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label className={styles.field}>
            <span>{t('login.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? t('login.loading') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

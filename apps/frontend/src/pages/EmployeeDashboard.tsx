import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import NotificationBanner from '../components/NotificationBanner'
import s from './AdminDashboard.module.css'

interface Stats { myStays: number; reportsToday: number; pendingToday: number }

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/stats/employee').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 18 ? t('dashboard.greetingDay') : t('dashboard.greetingEvening')

  return (
    <div className={s.page}>
      <NotificationBanner />
      <div className={s.hero}>
        <div>
          <p className={s.greeting}>{greeting},</p>
          <h1 className={s.name}>{user?.name}</h1>
        </div>
        <p className={s.date}>{new Date().toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {stats && (
        <div className={s.statsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 32 }}>
          <Link to="/employee/stays" className={`${s.statCard} glass`}>
            <div className={s.statValue}>{stats.myStays}</div>
            <div className={s.statLabel}>{t('dashboard.myGuests')}</div>
          </Link>
          <Link to="/employee/stays" className={`${s.statCard} glass`}>
            <div className={s.statValue} style={{ color: stats.pendingToday > 0 ? '#fbbf24' : '#86efac' }}>
              {stats.pendingToday}
            </div>
            <div className={s.statLabel}>{t('dashboard.withoutReport')}</div>
            {stats.pendingToday === 0 && <div className={s.statSub}>{t('dashboard.allFilled')}</div>}
          </Link>
          <Link to="/employee/reports" className={`${s.statCard} glass`}>
            <div className={s.statValue}>{stats.reportsToday}</div>
            <div className={s.statLabel}>{t('dashboard.reportsToday')}</div>
          </Link>
        </div>
      )}

      <div className={s.section}>
        <h2>Действия</h2>
        <div className={s.quickGrid}>
          {[
            { icon: '🐶', label: 'Постояльцы', desc: 'Мои активные заселения', to: '/employee/stays' },
            { icon: '📋', label: 'История отчётов', desc: 'Ранее созданные отчёты', to: '/employee/reports' },
          ].map((c) => (
            <Link key={c.label} to={c.to} className={`${s.quickCard} glass`}>
              <div className={s.quickIcon}>{c.icon}</div>
              <div>
                <div className={s.quickLabel}>{c.label}</div>
                <div className={s.quickDesc}>{c.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

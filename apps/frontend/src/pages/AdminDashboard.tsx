import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import NotificationBanner from '../components/NotificationBanner'
import styles from './Dashboard.module.css'
import s from './AdminDashboard.module.css'

interface Stats {
  activeStays: number
  totalPets: number
  freeCages: number
  totalCages: number
  reportsToday: number
  staysWithoutReportToday: number
  recentReports: {
    id: string
    date: string
    dayStatus: string
    stay: { pet: { name: string; species: string } }
    employee: { name: string }
  }[]
}

const STATUS_LABEL: Record<string, string> = {
  adaptation: 'Адаптация', calm: 'Спокойный', active: 'Активный', needs_control: 'Контроль',
}
const STATUS_COLOR: Record<string, string> = {
  adaptation: '#fbbf24', calm: '#86efac', active: '#a5f3fc', needs_control: '#fca5a5',
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/stats/admin').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 18 ? t('dashboard.greetingDay') : t('dashboard.greetingEvening')

  return (
    <div className={styles.page}>
      <NotificationBanner />
      <div className={s.hero}>
        <div>
          <p className={s.greeting}>{greeting},</p>
          <h1 className={s.name}>{user?.name}</h1>
        </div>
        <p className={s.date}>{new Date().toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Статистика */}
      {stats && (
        <>
          <div className={s.statsGrid}>
            <Link to="/admin/stays" className={`${s.statCard} glass`}>
              <div className={s.statValue}>{stats.activeStays}</div>
              <div className={s.statLabel}>{t('dashboard.activeStays')}</div>
              {stats.staysWithoutReportToday > 0 && (
                <div className={s.statAlert}>⚠ {stats.staysWithoutReportToday} {t('dashboard.withoutReport')}</div>
              )}
            </Link>

            <Link to="/admin/reports" className={`${s.statCard} glass`}>
              <div className={s.statValue}>{stats.reportsToday}</div>
              <div className={s.statLabel}>{t('dashboard.reportsToday')}</div>
              <div className={s.statSub}>из {stats.activeStays} заселений</div>
            </Link>

            <Link to="/admin/cages" className={`${s.statCard} glass`}>
              <div className={s.statValue}>{stats.freeCages}</div>
              <div className={s.statLabel}>{t('dashboard.freeCages')}</div>
              <div className={s.statSub}>из {stats.totalCages} всего</div>
            </Link>

            <Link to="/admin/pets" className={`${s.statCard} glass`}>
              <div className={s.statValue}>{stats.totalPets}</div>
              <div className={s.statLabel}>{t('dashboard.totalPets')}</div>
            </Link>
          </div>

          {/* Последние отчёты */}
          {stats.recentReports.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionHeader}>
                <h2>{t('dashboard.recentReports')}</h2>
                <Link to="/admin/reports" className={s.seeAll}>{t('common.seeAll')}</Link>
              </div>
              <div className={`${s.recentList} glass`}>
                {stats.recentReports.map((r) => (
                  <div key={r.id} className={s.recentItem}>
                    <span className={s.recentPet}>🐾 {r.stay.pet.name}</span>
                    <span className={s.recentMeta}>{r.stay.pet.species}</span>
                    <span
                      className={s.recentStatus}
                      style={{ color: STATUS_COLOR[r.dayStatus] }}
                    >
                      {STATUS_LABEL[r.dayStatus]}
                    </span>
                    <span className={s.recentEmployee}>{r.employee.name}</span>
                    <span className={s.recentDate}>
                      {new Date(r.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Быстрые действия */}
      <div className={s.section}>
        <h2>{t('dashboard.quickActions')}</h2>
        <div className={styles.grid}>
          {[
            { icon: '🏠', label: 'Заселить питомца', desc: 'Оформить новое заселение', to: '/admin/stays' },
            { icon: '📝', label: 'Заполнить отчёт', desc: 'Ежедневный отчёт сотрудника', to: '/employee/stays' },
            { icon: '👥', label: 'Пользователи', desc: 'Добавить сотрудника или владельца', to: '/admin/users' },
            { icon: '🔲', label: 'Клетки', desc: 'Управление местами', to: '/admin/cages' },
          ].map((c) => (
            <Link key={c.label} to={c.to} className={`${styles.card} glass`}>
              <div className={styles.cardIcon}>{c.icon}</div>
              <div>
                <div className={styles.cardLabel}>{c.label}</div>
                <div className={styles.cardDesc}>{c.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

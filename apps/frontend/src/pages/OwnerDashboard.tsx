import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import NotificationBanner from '../components/NotificationBanner'
import styles from './OwnerDashboard.module.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface Stay {
  id: string
  checkIn: string
  cage: { number: string; zone: string }
  pet: { id: string; name: string; species: string; breed?: string; photoUrl?: string }
  reports: { id: string; date: string }[]
}

interface Report {
  id: string
  date: string
  dayStatus: string
  stay: { pet: { name: string } }
}

const STATUS_LABEL: Record<string, string> = {
  adaptation: 'Адаптация',
  calm: 'Спокойный день',
  active: 'Активный день',
  needs_control: 'Нужен контроль',
}

function nightsCount(checkIn: string) {
  const diff = Date.now() - new Date(checkIn).getTime()
  return Math.floor(diff / 86400000)
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [stays, setStays] = useState<Stay[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/stays?status=active'),
      api.get('/reports'),
    ]).then(([s, r]) => {
      setStays(s.data)
      setReports(r.data.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  const firstName = user?.name?.split(' ')[0] ?? t('roles.owner')

  return (
    <div className={styles.page}>
      <NotificationBanner />
      <div className={styles.hero}>
        <div>
          <h1>Привет, {firstName}!</h1>
          <p>Следите за вашими питомцами в режиме реального времени</p>
        </div>
      </div>

      {/* Быстрые ссылки */}
      <div className={styles.quickLinks}>
        <Link to="/owner/pets" className={`${styles.quickCard} glass`}>
          <span className={styles.quickIcon}>🐾</span>
          <div>
            <div className={styles.quickLabel}>Мои питомцы</div>
            <div className={styles.quickDesc}>Карточки и фото</div>
          </div>
        </Link>
        <Link to="/owner/reports" className={`${styles.quickCard} glass`}>
          <span className={styles.quickIcon}>📋</span>
          <div>
            <div className={styles.quickLabel}>Все отчёты</div>
            <div className={styles.quickDesc}>История и подробности</div>
          </div>
        </Link>
        <Link to="/owner/stays" className={`${styles.quickCard} glass`}>
          <span className={styles.quickIcon}>🏠</span>
          <div>
            <div className={styles.quickLabel}>Заселения</div>
            <div className={styles.quickDesc}>Текущие и прошлые</div>
          </div>
        </Link>
      </div>

      {loading ? (
        <div className={styles.loader}>Загрузка...</div>
      ) : (
        <div className={styles.columns}>
          {/* Активные заселения */}
          <section className={styles.col}>
            <h2 className={styles.sectionTitle}>
              {t('dashboard.inHotel')}
              {stays.length > 0 && <span className={styles.badge}>{stays.length}</span>}
            </h2>

            {stays.length === 0 ? (
              <div className={`${styles.emptyCard} glass`}>
                <span>🏨</span>
                <p>Нет активных заселений</p>
              </div>
            ) : (
              <div className={styles.stayList}>
                {stays.map((s) => {
                  const nights = nightsCount(s.checkIn)
                  const lastReport = s.reports[0]
                  return (
                    <div key={s.id} className={`${styles.stayCard} glass`}>
                      <div className={styles.petAvatar}>
                        {s.pet.photoUrl
                          ? <img src={s.pet.photoUrl.startsWith('http') ? s.pet.photoUrl : `${API_BASE}${s.pet.photoUrl}`} alt={s.pet.name} />
                          : <span>🐾</span>
                        }
                      </div>
                      <div className={styles.stayInfo}>
                        <div className={styles.petName}>{s.pet.name}</div>
                        <div className={styles.petMeta}>
                          {s.pet.species}{s.pet.breed ? ` · ${s.pet.breed}` : ''}
                        </div>
                        <div className={styles.stayMeta}>
                          Клетка {s.cage.number} · {s.cage.zone}
                        </div>
                      </div>
                      <div className={styles.stayRight}>
                        <div className={styles.nights}>
                          <span className={styles.nightsNum}>{nights}</span>
                          <span className={styles.nightsLabel}>
                            {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}
                          </span>
                        </div>
                        {lastReport && (
                          <Link
                            to={`/owner/reports?petId=${s.pet.id}`}
                            className={styles.reportLink}
                          >
                            Отчёты →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Последние отчёты */}
          <section className={styles.col}>
            <h2 className={styles.sectionTitle}>{t('dashboard.recentReports')}</h2>

            {reports.length === 0 ? (
              <div className={`${styles.emptyCard} glass`}>
                <span>📋</span>
                <p>Отчётов пока нет</p>
              </div>
            ) : (
              <div className={styles.reportList}>
                {reports.map((r) => (
                  <Link
                    key={r.id}
                    to="/owner/reports"
                    className={`${styles.reportRow} glass`}
                  >
                    <div className={styles.reportLeft}>
                      <span className={styles.reportPet}>{r.stay.pet.name}</span>
                      <span className={`${styles.statusDot} ${styles[r.dayStatus]}`}>
                        {STATUS_LABEL[r.dayStatus]}
                      </span>
                    </div>
                    <span className={styles.reportDate}>
                      {new Date(r.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                    </span>
                  </Link>
                ))}
                <Link to="/owner/reports" className={styles.seeAll}>Посмотреть все →</Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import styles from './OwnerStays.module.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface Stay {
  id: string
  checkIn: string
  checkOut?: string
  status: 'active' | 'completed'
  cage: { number: string; zone: string }
  pet: { id: string; name: string; species: string; breed?: string; photoUrl?: string }
  reports: { id: string; date: string }[]
}

function nightsCount(checkIn: string, checkOut?: string) {
  const end = checkOut ? new Date(checkOut) : new Date()
  const diff = end.getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

export default function OwnerStaysPage() {
  const [stays, setStays] = useState<Stay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const { t } = useTranslation()

  useEffect(() => {
    api.get('/stays').then(({ data }) => setStays(data)).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? stays : stays.filter((s) => s.status === filter)
  const active = stays.filter((s) => s.status === 'active').length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>{t('owner.stays.title')}</h1>
          <p className={styles.subtitle}>{t('owner.stays.subtitle')}</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {([['all', t('common.all')], ['active', t('common.active')], ['completed', t('common.completed')]] as const).map(([val, label]) => (
          <button
            key={val}
            className={`${styles.tab} ${filter === val ? styles.tabActive : ''}`}
            onClick={() => setFilter(val)}
          >
            {label}
            {val === 'active' && active > 0 && <span className={styles.tabBadge}>{active}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loader}>{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className={`${styles.empty} glass`}>
          <span>🏨</span>
          <p>{filter === 'active' ? t('owner.stays.noActive') : filter === 'completed' ? t('owner.stays.noCompleted') : t('owner.stays.noAll')}</p>
        </div>
      ) : (
        <div className={styles.list} data-tour="owner-stays-list">
          {filtered.map((s) => {
            const nights = nightsCount(s.checkIn, s.checkOut)
            return (
              <div key={s.id} className={`${styles.card} glass`}>
                <div className={styles.avatar}>
                  {s.pet.photoUrl
                    ? <img src={s.pet.photoUrl.startsWith('http') ? s.pet.photoUrl : `${API_BASE}${s.pet.photoUrl}`} alt={s.pet.name} />
                    : <span>🐾</span>
                  }
                </div>
                <div className={styles.info}>
                  <div className={styles.petName}>{s.pet.name}</div>
                  <div className={styles.petMeta}>
                    {s.pet.species}{s.pet.breed ? ` · ${s.pet.breed}` : ''}
                  </div>
                  <div className={styles.cageMeta}>
                    Клетка {s.cage.number} · {s.cage.zone}
                  </div>
                  <div className={styles.dates}>
                    {new Date(s.checkIn).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {s.checkOut && ` — ${new Date(s.checkOut).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                  </div>
                </div>
                <div className={styles.right}>
                  <span className={`${styles.statusBadge} ${styles[s.status]}`}>
                    {s.status === 'active' ? t('owner.stays.statusActive') : t('owner.stays.statusDone')}
                  </span>
                  <div className={styles.nights}>
                    <span className={styles.nightsNum}>{nights}</span>
                    <span className={styles.nightsLabel}>{t('common.nights', { count: nights }).replace(String(nights), '').trim()}</span>
                  </div>
                  {s.reports.length > 0 && (
                    <Link to={`/owner/reports?petId=${s.pet.id}`} className={styles.reportsLink}>
                      {t('common.reports', { count: s.reports.length })}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

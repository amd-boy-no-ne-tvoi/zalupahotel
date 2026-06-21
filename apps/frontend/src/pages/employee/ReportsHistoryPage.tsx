import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import styles from './Employee.module.css'

interface Report {
  id: string
  date: string
  dayStatus: string
  stay: { pet: { name: string; species: string } }
  metrics: { category: string; value: string; comment?: string }[]
  observations: { observation: string; notifyOwner: boolean }[]
}

export default function ReportsHistoryPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const stayId = params.get('stayId')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = stayId ? `/reports?stayId=${stayId}` : '/reports'
    api.get(url).then(({ data }) => setReports(data)).finally(() => setLoading(false))
  }, [stayId])

  if (loading) return <div className={styles.loading}>{t('common.loading')}</div>

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('employee.history.title')}</h1>
          <p className={styles.subtitle}>{reports.length} записей</p>
        </div>
        <button className={styles.btnSecondary} onClick={() => navigate('/employee/stays')}>{t('employee.history.back')}</button>
      </div>

      {reports.length === 0 && (
        <div className={`${styles.empty} glass`}><span>📋</span><p>{t('employee.history.empty')}</p></div>
      )}

      <div className={styles.reportList} data-tour="employee-reports-list">
        {reports.map((r) => (
          <div key={r.id} className={`${styles.reportCard} glass`}>
            <div className={styles.reportCardHeader}>
              <div>
                <span className={styles.reportPet}>{r.stay.pet.name}</span>
                <span className={styles.reportMeta}> · {r.stay.pet.species}</span>
              </div>
              <div className={styles.reportRight}>
                <span className={styles.reportDate}>{new Date(r.date).toLocaleDateString('ru')}</span>
                <span className={`${styles.statusBadge} ${styles[r.dayStatus]}`}>{t(`status.${r.dayStatus}`) || r.dayStatus}</span>
                <Link to={`/employee/reports/${r.id}/edit`} className={styles.editLink}>✏️ {t('employee.history.edit')}</Link>
              </div>
            </div>

            <div className={styles.metricRow}>
              {r.metrics.map((m) => (
                <span key={m.category} className={styles.metricChip}>
                  <b>{m.category}:</b> {m.value}
                </span>
              ))}
            </div>

            {r.observations.filter((o) => o.notifyOwner).length > 0 && (
              <div className={styles.alertRow}>
                ⚠ {r.observations.filter((o) => o.notifyOwner).map((o) => o.observation).join('; ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

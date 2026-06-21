import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import Pagination from '../../components/Pagination'
import Lightbox from '../../components/Lightbox'
import styles from './Owner.module.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function toSrc(url: string) {
  return url.startsWith('http') ? url : `${API_BASE}${url}`
}

interface Report {
  id: string
  date: string
  dayStatus: string
  photoUrls: string[]
  ownerText?: string
  employee: { name: string }
  stay: {
    cage: { number: string; zone: string }
    pet: { id: string; name: string; species: string; breed?: string }
  }
  metrics: { category: string; value: string; comment?: string }[]
  activities: { activityType: string; completed: boolean }[]
  observations: { observation: string; action?: string; notifyOwner: boolean }[]
}

export default function OwnerReportsPage() {
  const [params] = useSearchParams()
  const { t } = useTranslation()
  const petFilter = params.get('petId')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  async function downloadPDF(r: Report) {
    setDownloading(r.id)
    try {
      const [{ pdf }, { default: ReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../components/ReportPDF'),
      ])
      const blob = await pdf(<ReportPDF report={r} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `отчёт-${r.stay.pet.name}-${r.date.slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  useEffect(() => {
    setLoading(true)
    api.get('/reports').then(({ data }) => setReports(data)).finally(() => setLoading(false))
  }, [])

  function setDateFromAndReset(v: string) { setDateFrom(v); setPage(1) }
  function setDateToAndReset(v: string) { setDateTo(v); setPage(1) }

  const filtered = reports.filter((r) => {
    if (petFilter && r.stay.pet.id !== petFilter) return false
    if (dateFrom && r.date.slice(0, 10) < dateFrom) return false
    if (dateTo && r.date.slice(0, 10) > dateTo) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (loading) return <div className={styles.loading}>{t('common.loading')}</div>

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('owner.reports.title')}</h1>
          <p className={styles.subtitle}>{t('owner.reports.subtitle')}</p>
        </div>
        <div className={styles.dateFilter}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFromAndReset(e.target.value)} className={styles.dateInput} />
          <span style={{ color: 'var(--text-muted)' }}>—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateToAndReset(e.target.value)} className={styles.dateInput} />
        </div>
      </div>

      {reports.length === 0 && (
        <div className={`${styles.empty} glass`}>
          <span>📋</span><p>{t('owner.reports.empty')}</p>
        </div>
      )}

      {reports.length > 0 && filtered.length === 0 && (
        <div className={`${styles.empty} glass`}>
          <span>🔍</span><p>{t('owner.reports.emptyFiltered')}</p>
        </div>
      )}

      <div className={styles.reportList} data-tour="owner-reports-list">
        {paginated.map((r) => {
          const isOpen = expanded === r.id
          const alerts = r.observations.filter((o) => o.notifyOwner)
          return (
            <div key={r.id} className={`${styles.reportCard} glass`}>
              {/* Шапка карточки — всегда видна */}
              <div className={styles.cardHeader} onClick={() => setExpanded(isOpen ? null : r.id)}>
                <div className={styles.cardLeft}>
                  <div className={styles.petEmoji}>🐾</div>
                  <div>
                    <div className={styles.petName}>{r.stay.pet.name}</div>
                    <div className={styles.cardMeta}>
                      {r.stay.pet.species}{r.stay.pet.breed ? ` · ${r.stay.pet.breed}` : ''}
                      &nbsp;·&nbsp; Клетка {r.stay.cage.number} · {r.stay.cage.zone}
                    </div>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  {alerts.length > 0 && <span className={styles.alertDot}>⚠</span>}
                  <span className={`${styles.statusBadge} ${styles[r.dayStatus]}`}>{t(`status.${r.dayStatus}`) || r.dayStatus}</span>
                  <span className={styles.date}>{new Date(r.date).toLocaleDateString('ru', { day: 'numeric', month: 'long' })}</span>
                  <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Развёрнутый контент */}
              {isOpen && (
                <div className={styles.cardBody}>
                  <div className={styles.cardBodyHeader}>
                    <p className={styles.employeeLabel}>{t('owner.reports.employee')}: {r.employee.name}</p>
                    <button
                      className={styles.btnPdf}
                      onClick={() => downloadPDF(r)}
                      disabled={downloading === r.id}
                    >
                      {downloading === r.id ? '...' : '↓ PDF'}
                    </button>
                  </div>

                  {/* Текст для владельца */}
                  {r.ownerText && (
                    <div className={`${styles.section} ${styles.ownerTextSection}`}>
                      <h3>{t('owner.reports.ownerMsg')}</h3>
                      <p className={styles.ownerTextBody}>{r.ownerText}</p>
                    </div>
                  )}

                  {/* Метрики */}
                  <div className={styles.section}>
                    <h3>{t('owner.reports.metrics')}</h3>
                    <div className={styles.metricsGrid}>
                      {r.metrics.map((m) => (
                        <div key={m.category} className={styles.metricItem}>
                          <span className={styles.metricName}>{t(`metrics.${m.category}`) || m.category}</span>
                          <span className={styles.metricValue}>{m.value}</span>
                          {m.comment && <span className={styles.metricComment}>{m.comment}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Активности */}
                  {r.activities.filter((a) => a.completed).length > 0 && (
                    <div className={styles.section}>
                      <h3>{t('owner.reports.activities')}</h3>
                      <div className={styles.activityList}>
                        {r.activities.filter((a) => a.completed).map((a) => (
                          <span key={a.activityType} className={styles.activityChip}>✓ {a.activityType}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Важные наблюдения для владельца */}
                  {alerts.length > 0 && (
                    <div className={`${styles.section} ${styles.alertSection}`}>
                      <h3>{t('owner.reports.important')}</h3>
                      {alerts.map((o, i) => (
                        <div key={i} className={styles.alertItem}>
                          <p>{o.observation}</p>
                          {o.action && <p className={styles.actionText}>{t('owner.reports.action')}: {o.action}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Фото и видео */}
                  {r.photoUrls.length > 0 && (
                    <div className={styles.section}>
                      <h3>{t('owner.reports.media')}</h3>
                      <div className={styles.photoGrid}>
                        {r.photoUrls.map((url, i) =>
                          url.endsWith('.mp4')
                            ? (
                              <div
                                key={i}
                                className={styles.videoThumb}
                                onClick={() => setLightbox({ urls: r.photoUrls, index: i })}
                              >▶</div>
                            ) : (
                              <div
                                key={i}
                                className={styles.photoThumb}
                                onClick={() => setLightbox({ urls: r.photoUrls, index: i })}
                              >
                                <img src={toSrc(url)} alt="" className={styles.photo} />
                              </div>
                            )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Pagination total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onChange={setPage} />

      {lightbox && (
        <Lightbox
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNav={(i) => setLightbox({ urls: lightbox.urls, index: i })}
        />
      )}
    </div>
  )
}

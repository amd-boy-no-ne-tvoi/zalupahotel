import { useEffect, useState, useMemo } from 'react'
import api from '../../lib/api'
import Pagination from '../../components/Pagination'
import SearchableSelect from '../../components/SearchableSelect'
import { useTableSort, SortIcon } from '../../hooks/useTableSort'
import styles from '../AdminPages.module.css'
import rStyles from './ReportsPage.module.css'
import pStyles from '../owner/Owner.module.css'

const STATUS_LABEL: Record<string, string> = {
  adaptation: 'Адаптация',
  calm: 'Спокойный день',
  active: 'Активный день',
  needs_control: 'Нужен контроль',
}

const METRIC_LABEL: Record<string, string> = {
  appetite: 'Аппетит', water: 'Вода', toilet: 'Туалет',
  activity: 'Активность', mood: 'Настроение', contact: 'Контакт',
}

interface Report {
  id: string
  date: string
  dayStatus: string
  ownerText?: string
  photoUrls?: string[]
  employee: { id: string; name: string }
  stay: {
    pet: { name: string; species: string; breed?: string; owner: { name: string } }
    cage: { number: string; zone: string }
  }
  metrics: { category: string; value: string; comment?: string }[]
  activities: { activityType: string; completed: boolean }[]
  observations: { observation: string; action?: string; notifyOwner: boolean }[]
}

interface User { id: string; name: string }

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [downloading, setDownloading] = useState<string | null>(null)

  async function downloadPDF(r: Report) {
    setDownloading(r.id)
    try {
      const [{ pdf }, { default: ReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../components/ReportPDF'),
      ])
      const data = { ...r, stay: { ...r.stay, pet: { id: r.id, ...r.stay.pet } }, photoUrls: r.photoUrls ?? [] }
      const blob = await pdf(<ReportPDF report={data} />).toBlob()
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
    api.get('/users').then(({ data }) =>
      setEmployees(data.filter((u: { role: string }) => u.role === 'employee'))
    )
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get('/reports').then(({ data }) => setReports(data)).finally(() => setLoading(false))
  }, [])

  function setSearchAndReset(v: string) { setSearch(v); setPage(1) }
  function setEmployeeAndReset(v: string) { setEmployeeId(v); setPage(1) }
  function setDateFromAndReset(v: string) { setDateFrom(v); setPage(1) }
  function setDateToAndReset(v: string) { setDateTo(v); setPage(1) }
  function resetAll() { setSearch(''); setEmployeeId(''); setDateFrom(''); setDateTo(''); setPage(1) }

  const reportsFlat = useMemo(() =>
    reports.map(r => ({
      ...r,
      petName: r.stay.pet.name,
      employeeName: r.employee.name,
    })),
  [reports])

  const filtered = useMemo(() => {
    return reportsFlat.filter((r) => {
      if (employeeId && r.employee.id !== employeeId) return false
      if (dateFrom && r.date.slice(0, 10) < dateFrom) return false
      if (dateTo && r.date.slice(0, 10) > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.stay.pet.name.toLowerCase().includes(q) ||
          r.stay.pet.owner.name.toLowerCase().includes(q) ||
          r.employee.name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [reportsFlat, employeeId, dateFrom, dateTo, search])

  const { sorted, toggleSort, sortKey, sortDir } = useTableSort(filtered as unknown as Record<string, unknown>[])

  type ReportFlat = (typeof reportsFlat)[number]

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = (sorted as unknown as ReportFlat[]).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const employeeOptions = useMemo(() => [
    { value: '', label: 'Все сотрудники' },
    ...employees.map(e => ({ value: e.id, label: e.name })),
  ], [employees])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Отчёты</h1>
          <p className={styles.subtitle}>Всего: {reports.length} · Показано: {filtered.length}</p>
        </div>
      </div>

      {/* Фильтры */}
      <div className={`${rStyles.filters} glass`}>
        <input
          className={rStyles.searchInput}
          type="text"
          placeholder="🔍 Питомец, владелец, сотрудник..."
          value={search}
          onChange={(e) => setSearchAndReset(e.target.value)}
        />
        <SearchableSelect
          value={employeeId}
          onChange={setEmployeeAndReset}
          options={employeeOptions}
          placeholder="Сотрудник"
          className={styles.filterSelectWrap}
        />
        <div className={rStyles.dateRange}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFromAndReset(e.target.value)} className={rStyles.dateInput} />
          <span className={rStyles.dateSep}>—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateToAndReset(e.target.value)} className={rStyles.dateInput} />
        </div>
        {(search || employeeId || dateFrom || dateTo) && (
          <button className={rStyles.resetBtn} onClick={resetAll}>
            Сбросить
          </button>
        )}
      </div>

      {/* Сортировка */}
      <div className={styles.filterBar} style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Сортировка:</span>
        <button className={styles.thSort} onClick={() => toggleSort('petName')}>Питомец <SortIcon active={sortKey === 'petName'} dir={sortDir} /></button>
        <button className={styles.thSort} onClick={() => toggleSort('date')}>Дата <SortIcon active={sortKey === 'date'} dir={sortDir} /></button>
        <button className={styles.thSort} onClick={() => toggleSort('dayStatus')}>Статус дня <SortIcon active={sortKey === 'dayStatus'} dir={sortDir} /></button>
        <button className={styles.thSort} onClick={() => toggleSort('employeeName')}>Сотрудник <SortIcon active={sortKey === 'employeeName'} dir={sortDir} /></button>
      </div>

      {loading && <div className={rStyles.loading}>Загрузка...</div>}

      {!loading && reports.length === 0 && (
        <div className={rStyles.loading}>Отчётов пока нет</div>
      )}

      {!loading && reports.length > 0 && filtered.length === 0 && (
        <div className={rStyles.loading}>🔍 Нет отчётов по выбранным фильтрам</div>
      )}

      <div className={rStyles.list} data-tour="reports-list">
        {paginated.map((r) => {
          const isOpen = expanded === r.id
          const alerts = r.observations.filter((o) => o.notifyOwner)
          return (
            <div key={r.id} className={`${rStyles.card} glass`}>
              <div className={rStyles.cardHeader} onClick={() => setExpanded(isOpen ? null : r.id)}>
                <div className={rStyles.cardLeft}>
                  <span className={rStyles.petName}>{r.stay.pet.name}</span>
                  <span className={rStyles.cardMeta}>
                    {r.stay.pet.species} · {r.stay.cage.number} · {r.stay.pet.owner.name}
                  </span>
                </div>
                <div className={rStyles.cardRight}>
                  {alerts.length > 0 && <span className={rStyles.alertDot} title="Есть важные наблюдения">⚠</span>}
                  <span className={`${rStyles.statusBadge} ${rStyles[r.dayStatus]}`}>{STATUS_LABEL[r.dayStatus]}</span>
                  <span className={rStyles.meta}>{r.employee.name}</span>
                  <span className={rStyles.date}>{new Date(r.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
                  <span className={rStyles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className={rStyles.cardBody}>
                  <div className={pStyles.cardBodyHeader} style={{ marginBottom: 14 }}>
                    <span />
                    <button
                      className={pStyles.btnPdf}
                      onClick={() => downloadPDF(r)}
                      disabled={downloading === r.id}
                    >
                      {downloading === r.id ? '...' : '↓ PDF'}
                    </button>
                  </div>
                  <div className={rStyles.metricsGrid}>
                    {r.metrics.map((m) => (
                      <div key={m.category} className={rStyles.metricItem}>
                        <span className={rStyles.metricName}>{METRIC_LABEL[m.category] ?? m.category}</span>
                        <span className={rStyles.metricValue}>{m.value}</span>
                        {m.comment && <span className={rStyles.metricComment}>{m.comment}</span>}
                      </div>
                    ))}
                  </div>

                  {r.activities.filter((a) => a.completed).length > 0 && (
                    <div className={rStyles.activitiesRow}>
                      {r.activities.filter((a) => a.completed).map((a) => (
                        <span key={a.activityType} className={rStyles.actChip}>✓ {a.activityType}</span>
                      ))}
                    </div>
                  )}

                  {r.observations.length > 0 && (
                    <div className={rStyles.observations}>
                      {r.observations.map((o, i) => (
                        <div key={i} className={`${rStyles.obsItem} ${o.notifyOwner ? rStyles.obsAlert : ''}`}>
                          <span>{o.observation}</span>
                          {o.action && <span className={rStyles.obsAction}>→ {o.action}</span>}
                          {o.notifyOwner && <span className={rStyles.notifyBadge}>Владелец</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Pagination total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}

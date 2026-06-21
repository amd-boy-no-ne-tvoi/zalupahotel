import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/api'
import PhotoUpload from '../../components/PhotoUpload'
import { useToast } from '../../context/ToastContext'
import styles from './ReportForm.module.css'

type DayStatus = 'adaptation' | 'calm' | 'active' | 'needs_control'
type MetricCategory = 'appetite' | 'water' | 'toilet' | 'activity' | 'mood' | 'contact'

interface Metric { category: MetricCategory; value: string; comment: string }
interface Activity { activityType: string; completed: boolean }
interface Observation { observation: string; action: string; notifyOwner: boolean }

const METRIC_CONFIG: { key: MetricCategory; label: string; options: string[] }[] = [
  { key: 'appetite',  label: 'Аппетит',    options: ['хорошо', 'умеренно', 'отказ'] },
  { key: 'water',     label: 'Вода',        options: ['норма', 'мало', 'много'] },
  { key: 'toilet',    label: 'Туалет',      options: ['норма', 'особенности', 'нет данных'] },
  { key: 'activity',  label: 'Активность',  options: ['низкая', 'средняя', 'высокая'] },
  { key: 'mood',      label: 'Настроение',  options: ['спокоен', 'тревожен', 'активен', 'устал'] },
  { key: 'contact',   label: 'Контакт',     options: ['хороший', 'осторожный', 'избегает'] },
]

const ACTIVITY_OPTIONS = [
  'Прогулка / игровая сессия',
  'Спокойная активность / нюхательная игра',
  'Индивидуальное внимание',
  'Фото / видео подготовлены для владельца',
]

const STATUS_OPTIONS: { value: DayStatus; label: string }[] = [
  { value: 'adaptation',    label: 'Адаптация' },
  { value: 'calm',          label: 'Спокойный день' },
  { value: 'active',        label: 'Активный день' },
  { value: 'needs_control', label: 'Нужен контроль' },
]

export default function EditReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [petName, setPetName] = useState('')
  const [petMeta, setPetMeta] = useState('')
  const [date, setDate] = useState('')
  const [dayStatus, setDayStatus] = useState<DayStatus>('calm')
  const [metrics, setMetrics] = useState<Metric[]>(
    METRIC_CONFIG.map((m) => ({ category: m.key, value: '', comment: '' }))
  )
  const [activities, setActivities] = useState<Activity[]>(
    ACTIVITY_OPTIONS.map((a) => ({ activityType: a, completed: false }))
  )
  const [observations, setObservations] = useState<Observation[]>([
    { observation: '', action: '', notifyOwner: false },
  ])
  const [photoUrls, setPhotoUrls] = useState<string[]>([''])
  const [ownerText, setOwnerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    api.get(`/reports/${id}`).then(({ data }) => {
      setDate(data.date.slice(0, 10))
      setDayStatus(data.dayStatus)
      setPetName(data.stay.pet.name)
      setPetMeta(`${data.stay.pet.species}${data.stay.pet.breed ? ` · ${data.stay.pet.breed}` : ''} · Клетка ${data.stay.cage.number}`)
      setOwnerText(data.ownerText ?? '')

      const filled = METRIC_CONFIG.map((cfg) => {
        const existing = data.metrics.find((m: { category: string }) => m.category === cfg.key)
        return { category: cfg.key, value: existing?.value ?? '', comment: existing?.comment ?? '' }
      })
      setMetrics(filled)

      const filledActs = ACTIVITY_OPTIONS.map((opt) => {
        const existing = data.activities.find((a: { activityType: string }) => a.activityType === opt)
        return { activityType: opt, completed: existing?.completed ?? false }
      })
      const extraActs = data.activities.filter(
        (a: { activityType: string }) => !ACTIVITY_OPTIONS.includes(a.activityType)
      )
      setActivities([...filledActs, ...extraActs])

      if (data.observations.length > 0) {
        setObservations(data.observations.map((o: { observation: string; action?: string; notifyOwner: boolean }) => ({
          observation: o.observation,
          action: o.action ?? '',
          notifyOwner: o.notifyOwner,
        })))
      }

      const urls = data.photoUrls.length > 0 ? data.photoUrls : ['']
      setPhotoUrls(urls)
    }).catch(() => setNotFound(true)).finally(() => setLoading(false))
  }, [id])

  function setMetricValue(cat: MetricCategory, value: string) {
    setMetrics((prev) => prev.map((m) => m.category === cat ? { ...m, value } : m))
  }
  function setMetricComment(cat: MetricCategory, comment: string) {
    setMetrics((prev) => prev.map((m) => m.category === cat ? { ...m, comment } : m))
  }
  function toggleActivity(type: string) {
    setActivities((prev) => prev.map((a) => a.activityType === type ? { ...a, completed: !a.completed } : a))
  }
  function updateObservation(i: number, field: keyof Observation, value: string | boolean) {
    setObservations((prev) => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }
  function addObservation() {
    setObservations((prev) => [...prev, { observation: '', action: '', notifyOwner: false }])
  }
  function setPhotoUrl(index: number, url: string) {
    setPhotoUrls((prev) => prev.map((u, i) => i === index ? url : u))
  }

  async function handleSave() {
    if (!id) return
    const filledPhotos = photoUrls.filter(Boolean)
    setSaving(true); setError('')
    try {
      await api.patch(`/reports/${id}`, {
        date,
        dayStatus,
        metrics: metrics.filter((m) => m.value),
        activities,
        observations: observations.filter((o) => o.observation),
        photoUrls: filledPhotos,
        ownerText: ownerText || undefined,
      })
      showToast('Отчёт обновлён', 'success')
      navigate(-1)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка сохранения'
      setError(msg)
      showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>Загрузка...</div>

  if (notFound) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <span style={{ fontSize: 48 }}>📋</span>
      <p style={{ color: 'var(--text-muted)' }}>Отчёт не найден</p>
      <button style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', borderRadius: 12, color: '#fff', padding: '10px 20px', cursor: 'pointer' }} onClick={() => navigate(-1)}>← Назад</button>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={`${styles.hero} glass`}>
        <div>
          <div className={styles.badge}>✏️ Редактирование отчёта</div>
          <h1 className={styles.heroTitle}>{petName}</h1>
          <p className={styles.heroMeta}>{petMeta}</p>
        </div>
        <div className={styles.heroIcon}>📋</div>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>

          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>ℹ️</span>
              <div><h2>Основная информация</h2><p className={styles.sectionSub}>Дата и статус дня</p></div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.field}>
                <span>Дата отчёта</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Статус дня</span>
                <select value={dayStatus} onChange={(e) => setDayStatus(e.target.value as DayStatus)}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📊</span>
              <div><h2>Показатели дня</h2><p className={styles.sectionSub}>Отметьте значение и добавьте комментарий</p></div>
            </div>
            <div className={styles.metricList}>
              {METRIC_CONFIG.map(({ key, label, options }) => {
                const m = metrics.find((x) => x.category === key)!
                return (
                  <div key={key} className={styles.metric}>
                    <div className={styles.metricLabel}>{label}</div>
                    <div className={styles.metricRight}>
                      <div className={styles.pills}>
                        {options.map((opt) => (
                          <button key={opt} type="button"
                            className={`${styles.pill} ${m.value === opt ? styles.pillActive : ''}`}
                            onClick={() => setMetricValue(key, m.value === opt ? '' : opt)}
                          >{opt}</button>
                        ))}
                      </div>
                      <input className={styles.commentInput} type="text" placeholder="Комментарий..." value={m.comment} onChange={(e) => setMetricComment(key, e.target.value)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎾</span>
              <div><h2>Активности</h2><p className={styles.sectionSub}>Что было проведено сегодня</p></div>
            </div>
            <div className={styles.activityList}>
              {activities.map((a) => (
                <label key={a.activityType} className={`${styles.activityRow} ${a.completed ? styles.activityChecked : ''}`}>
                  <input type="checkbox" checked={a.completed} onChange={() => toggleActivity(a.activityType)} />
                  <span>{a.activityType}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>👀</span>
              <div><h2>Важные наблюдения</h2><p className={styles.sectionSub}>Фиксация особенностей и действий сотрудника</p></div>
            </div>
            <div className={styles.observationList}>
              {observations.map((o, i) => (
                <div key={i} className={styles.observationRow}>
                  <input type="text" placeholder="Что заметили" value={o.observation} onChange={(e) => updateObservation(i, 'observation', e.target.value)} />
                  <input type="text" placeholder="Что сделали" value={o.action} onChange={(e) => updateObservation(i, 'action', e.target.value)} />
                  <label className={styles.notifyCheck}>
                    <input type="checkbox" checked={o.notifyOwner} onChange={(e) => updateObservation(i, 'notifyOwner', e.target.checked)} />
                    <span>Сообщить владельцу</span>
                  </label>
                </div>
              ))}
            </div>
            <button className={styles.btnAdd} onClick={addObservation}>+ Добавить наблюдение</button>
          </section>

          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📷</span>
              <div><h2>Фото и видео</h2><p className={styles.sectionSub}>Для отправки владельцу</p></div>
            </div>
            <div className={styles.photoGrid}>
              {photoUrls.map((url, i) => (
                <PhotoUpload key={i} value={url} onChange={(u) => setPhotoUrl(i, u)} label="" />
              ))}
            </div>
            <button className={styles.btnAdd} onClick={() => setPhotoUrls((p) => [...p, ''])}>+ Добавить фото</button>
          </section>
        </div>

        <aside className={styles.right}>
          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>✉️</span>
              <div><h2>Текст для владельца</h2><p className={styles.sectionSub}>Редактируйте вручную</p></div>
            </div>
            <textarea className={styles.ownerTextarea} value={ownerText} onChange={(e) => setOwnerText(e.target.value)} placeholder="Введите сообщение для владельца..." />
            <div className={styles.btnRow}>
              <button className={styles.btnSecondary} onClick={() => navigator.clipboard.writeText(ownerText)} disabled={!ownerText}>Скопировать</button>
            </div>
          </section>

          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📌</span>
              <div><h2>Сводка</h2><p className={styles.sectionSub}>Перед сохранением</p></div>
            </div>
            <div className={styles.summary}>
              <div className={styles.summaryRow}><b>Питомец</b><span>{petName}</span></div>
              <div className={styles.summaryRow}><b>Дата</b><span>{date}</span></div>
              <div className={styles.summaryRow}><b>Статус</b><span>{STATUS_OPTIONS.find((s) => s.value === dayStatus)?.label}</span></div>
              <div className={styles.summaryRow}><b>Метрик заполнено</b><span>{metrics.filter((m) => m.value).length} / {metrics.length}</span></div>
              <div className={styles.summaryRow}><b>Активностей</b><span>{activities.filter((a) => a.completed).length}</span></div>
              <div className={styles.summaryRow}><b>Наблюдений</b><span>{observations.filter((o) => o.observation).length}</span></div>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.btnRow} style={{ marginTop: 20 }}>
              <button className={styles.btnSecondary} onClick={() => navigate(-1)}>Отмена</button>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить изменения'}</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

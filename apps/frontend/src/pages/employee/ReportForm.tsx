import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'

import { useToast } from '../../context/ToastContext'
import styles from './ReportForm.module.css'

const DEFAULT_WA_TEMPLATE = `Здравствуйте! 🐾\n\nЕжедневный отчёт о питомце *{petName}* за {date} готов.\n{warningLine}\nПосмотрите его в личном кабинете:\n{url}\n\nС уважением, команда Pet Hotel 🏨`
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type DayStatus = 'adaptation' | 'calm' | 'active' | 'needs_control'
type MetricCategory = 'appetite' | 'water' | 'toilet' | 'activity' | 'mood' | 'contact'

interface Stay {
  id: string
  pet: { name: string; species: string; breed?: string; owner: { name: string; phone?: string } }
  cage: { number: string; zone: string }
}

interface Metric { category: MetricCategory; value: string; comment: string }
interface Activity { activityType: string; completed: boolean }
interface Observation { observation: string; action: string; notifyOwner: boolean }

const METRIC_CONFIG: { key: MetricCategory; options: string[] }[] = [
  { key: 'appetite',  options: ['хорошо', 'умеренно', 'отказ'] },
  { key: 'water',     options: ['норма', 'мало', 'много'] },
  { key: 'toilet',    options: ['норма', 'особенности', 'нет данных'] },
  { key: 'activity',  options: ['низкая', 'средняя', 'высокая'] },
  { key: 'mood',      options: ['спокоен', 'тревожен', 'активен', 'устал'] },
  { key: 'contact',   options: ['хороший', 'осторожный', 'избегает'] },
]

const ACTIVITY_OPTIONS = [
  'Прогулка / игровая сессия',
  'Спокойная активность / нюхательная игра',
  'Индивидуальное внимание',
  'Фото / видео подготовлены для владельца',
]

const STATUS_VALUES: DayStatus[] = ['adaptation', 'calm', 'active', 'needs_control']

function generateOwnerText(stay: Stay | null, dayStatus: string, metrics: Metric[], statusLabel: string) {
  if (!stay) return ''
  const pet = stay.pet.name
  const status = statusLabel || dayStatus
  const get = (cat: MetricCategory) => metrics.find((m) => m.category === cat)
  const appetite = get('appetite')?.value ?? '—'
  const mood = get('mood')?.value ?? '—'
  const activity = get('activity')?.value ?? '—'
  const comments = metrics.map((m) => m.comment).filter(Boolean).join('; ')

  return `Добрый день! Сегодня у ${pet} статус: «${status}».\nАппетит: ${appetite}. Настроение: ${mood}. Активность: ${activity}.${comments ? `\nОсобенности: ${comments}.` : ''}\nФото/видео прикрепляем ниже 🐾`
}

export default function ReportForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const stayId = params.get('stayId') ?? ''

  const [stay, setStay] = useState<Stay | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
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
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoProgress, setPhotoProgress] = useState<{ done: number; total: number } | null>(null)
  const [ownerText, setOwnerText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [whatsappModal, setWhatsappModal] = useState<{ phone: string; message: string } | null>(null)
  const { showToast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    if (!stayId) { setNotFound(true); return }
    api.get(`/stays/${stayId}`)
      .then(({ data }) => setStay(data))
      .catch(() => setNotFound(true))
  }, [stayId])

  if (notFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <span style={{ fontSize: 48 }}>🐾</span>
        <p style={{ color: 'var(--text-muted)' }}>{t('employee.report.notFound')}</p>
        <button
          style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text)', padding: '10px 20px', cursor: 'pointer' }}
          onClick={() => navigate('/employee/stays')}
        >
          {t('employee.report.backBtn')}
        </button>
      </div>
    )
  }

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

  function removePhoto(index: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadPhotoFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    if (!arr.length) return
    setPhotoUploading(true)
    setPhotoProgress({ done: 0, total: arr.length })
    for (const file of arr) {
      try {
        const form = new FormData()
        form.append('file', file)
        const { data } = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        setPhotoUrls((prev) => [...prev, data.url as string])
        setPhotoProgress((p) => p ? { ...p, done: p.done + 1 } : null)
      } catch { /* пропускаем битый файл */ }
    }
    setPhotoUploading(false)
    setPhotoProgress(null)
  }

  async function handleSubmit() {
    if (!stayId) return
    const filledMetrics = metrics.filter((m) => m.value)
    const filledPhotos = photoUrls.filter(Boolean)
    setSaving(true); setError('')
    try {
      await api.post('/reports', {
        stayId,
        date,
        dayStatus,
        metrics: filledMetrics,
        activities,
        observations: observations.filter((o) => o.observation),
        photoUrls: filledPhotos,
        ownerText: ownerText || undefined,
      })
      showToast(t('employee.report.saved'), 'success')

      // Build WhatsApp message
      const ownerPhone = stay?.pet?.owner?.phone
      const hasWarning = dayStatus === 'needs_control' || observations.some((o) => o.notifyOwner)
      const petName = stay?.pet?.name ?? ''
      const dateStr = new Date(date).toLocaleDateString('ru', { day: 'numeric', month: 'long' })
      const url = window.location.origin

      const tmplData = await api.get('/settings/whatsapp_template').catch(() => ({ data: { value: DEFAULT_WA_TEMPLATE } }))
      const template = tmplData?.data?.value ?? DEFAULT_WA_TEMPLATE

      const warningLine = hasWarning
        ? '⚠️ *Пожалуйста, обязательно ознакомьтесь с отчётом* — есть важные наблюдения, требующие вашего внимания.\n'
        : ''

      const message = template
        .replace('{petName}', petName)
        .replace('{date}', dateStr)
        .replace('{url}', url)
        .replace('{warningLine}', warningLine)

      if (ownerPhone) {
        setWhatsappModal({ phone: ownerPhone, message })
      } else {
        navigate(-1)
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('profile.saveError')
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={`${styles.hero} glass`}>
        <div>
          <div className={styles.badge}>🐾 {t('employee.report.badge')}</div>
          <h1 className={styles.heroTitle}>
            {stay ? stay.pet.name : t('common.loading')}
          </h1>
          {stay && (
            <p className={styles.heroMeta}>
              {stay.pet.species}{stay.pet.breed ? ` · ${stay.pet.breed}` : ''} &nbsp;·&nbsp;
              Клетка {stay.cage.number} ({stay.cage.zone}) &nbsp;·&nbsp;
              {t('admin.stays.ownerCol')}: {stay.pet.owner.name}
            </p>
          )}
        </div>
        <div className={styles.heroIcon}>📋</div>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>

          {/* Основная информация */}
          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>ℹ️</span>
              <div>
                <h2>{t('employee.report.mainSection')}</h2>
                <p className={styles.sectionSub}>{t('employee.report.mainSub')}</p>
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.field}>
                <span>{t('employee.report.dateLabel')}</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{t('employee.report.statusLabel')}</span>
                <select value={dayStatus} onChange={(e) => setDayStatus(e.target.value as DayStatus)}>
                  {STATUS_VALUES.map((v) => <option key={v} value={v}>{t(`status.${v}`)}</option>)}
                </select>
              </label>
            </div>
          </section>

          {/* Показатели дня */}
          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📊</span>
              <div>
                <h2>{t('employee.report.metricsSection')}</h2>
                <p className={styles.sectionSub}>{t('employee.report.metricsSub')}</p>
              </div>
            </div>
            <div className={styles.metricList}>
              {METRIC_CONFIG.map(({ key, options }) => {
                const m = metrics.find((x) => x.category === key)!
                return (
                  <div key={key} className={styles.metric}>
                    <div className={styles.metricLabel}>{t(`metrics.${key}`)}</div>
                    <div className={styles.metricRight}>
                      <div className={styles.pills}>
                        {options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`${styles.pill} ${m.value === opt ? styles.pillActive : ''}`}
                            onClick={() => setMetricValue(key, m.value === opt ? '' : opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <input
                        className={styles.commentInput}
                        type="text"
                        placeholder={t('employee.report.commentPlaceholder')}
                        value={m.comment}
                        onChange={(e) => setMetricComment(key, e.target.value)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Активности */}
          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎾</span>
              <div>
                <h2>{t('employee.report.activitiesSection')}</h2>
                <p className={styles.sectionSub}>{t('employee.report.activitiesSub')}</p>
              </div>
            </div>
            <div className={styles.activityList}>
              {activities.map((a) => (
                <label key={a.activityType} className={`${styles.activityRow} ${a.completed ? styles.activityChecked : ''}`}>
                  <input
                    type="checkbox"
                    checked={a.completed}
                    onChange={() => toggleActivity(a.activityType)}
                  />
                  <span>{a.activityType}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Наблюдения */}
          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>👀</span>
              <div>
                <h2>{t('employee.report.obsSection')}</h2>
                <p className={styles.sectionSub}>{t('employee.report.obsSub')}</p>
              </div>
            </div>
            <div className={styles.observationList}>
              {observations.map((o, i) => (
                <div key={i} className={styles.observationRow}>
                  <input
                    type="text"
                    placeholder={t('employee.report.obsWhat')}
                    value={o.observation}
                    onChange={(e) => updateObservation(i, 'observation', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('employee.report.obsAction')}
                    value={o.action}
                    onChange={(e) => updateObservation(i, 'action', e.target.value)}
                  />
                  <label className={styles.notifyCheck}>
                    <input
                      type="checkbox"
                      checked={o.notifyOwner}
                      onChange={(e) => updateObservation(i, 'notifyOwner', e.target.checked)}
                    />
                    <span>{t('employee.report.notifyOwner')}</span>
                  </label>
                </div>
              ))}
            </div>
            <button className={styles.btnAdd} onClick={addObservation}>{t('employee.report.addObs')}</button>
          </section>

          {/* Фото и видео */}
          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📷</span>
              <div>
                <h2>{t('employee.report.photoSection')}</h2>
                <p className={styles.sectionSub}>{t('employee.report.photoSub')}</p>
              </div>
            </div>
            <div
              className={`${styles.photoDropzone} ${photoUploading ? styles.photoDropzoneUploading : ''}`}
              onDrop={(e) => { e.preventDefault(); uploadPhotoFiles(e.dataTransfer.files) }}
              onDragOver={(e) => e.preventDefault()}
            >
              {photoUrls.length > 0 && (
                <div className={styles.photoThumbs}>
                  {photoUrls.map((url, i) => {
                    const src = url.startsWith('http') ? url : `${API_BASE}${url}`
                    return (
                      <div key={i} className={styles.photoThumb}>
                        {url.endsWith('.mp4')
                          ? <div className={styles.videoThumb}>▶</div>
                          : <img src={src} alt="" />}
                        <button type="button" className={styles.photoRemove} onClick={() => removePhoto(i)}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
              <label className={styles.photoAddLabel}>
                {photoUploading && photoProgress
                  ? `⏳ ${photoProgress.done} / ${photoProgress.total}...`
                  : `📷 ${t('employee.report.addPhoto')}`}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files?.length) { uploadPhotoFiles(e.target.files); e.target.value = '' } }}
                />
              </label>
              {photoUrls.length === 0 && !photoUploading && (
                <p className={styles.photoHint}>или перетащите файлы сюда</p>
              )}
            </div>
          </section>
        </div>

        {/* Правая колонка */}
        <aside className={styles.right}>
          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>✉️</span>
              <div>
                <h2>{t('employee.report.ownerTextSection')}</h2>
                <p className={styles.sectionSub}>{t('employee.report.ownerTextSub')}</p>
              </div>
            </div>
            <textarea
              className={styles.ownerTextarea}
              value={ownerText}
              onChange={(e) => setOwnerText(e.target.value)}
              placeholder={t('employee.report.ownerTextPlaceholder')}
            />
            <div className={styles.btnRow}>
              <button
                className={styles.btnPrimary}
                onClick={() => setOwnerText(generateOwnerText(stay, dayStatus, metrics, t(`status.${dayStatus}`)))}
              >
                {t('employee.report.generate')}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => navigator.clipboard.writeText(ownerText)}
                disabled={!ownerText}
              >
                {t('employee.report.copy')}
              </button>
            </div>
          </section>

          <section className={`${styles.card} glass`}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📌</span>
              <div>
                <h2>{t('employee.report.summarySection')}</h2>
                <p className={styles.sectionSub}>{t('employee.report.summarySub')}</p>
              </div>
            </div>
            <div className={styles.summary}>
              <div className={styles.summaryRow}><b>{t('employee.report.summaryPet')}</b><span>{stay?.pet.name ?? '—'}</span></div>
              <div className={styles.summaryRow}><b>{t('employee.report.summaryDate')}</b><span>{date}</span></div>
              <div className={styles.summaryRow}><b>{t('employee.report.summaryStatus')}</b><span>{t(`status.${dayStatus}`)}</span></div>
              <div className={styles.summaryRow}><b>{t('employee.report.summaryMetrics')}</b><span>{metrics.filter((m) => m.value).length} / {metrics.length}</span></div>
              <div className={styles.summaryRow}><b>{t('employee.report.summaryActivities')}</b><span>{activities.filter((a) => a.completed).length}</span></div>
              <div className={styles.summaryRow}><b>{t('employee.report.summaryObs')}</b><span>{observations.filter((o) => o.observation).length}</span></div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.btnRow} style={{ marginTop: 20 }}>
              <button className={styles.btnSecondary} onClick={() => navigate('/employee/stays')}>
                {t('common.cancel')}
              </button>
              <button className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
                {saving ? t('employee.report.saving') : t('employee.report.saveBtn')}
              </button>
            </div>
          </section>
        </aside>
      </div>

      {whatsappModal && (
        <div className={styles.waOverlay}>
          <div className={styles.waModal}>
            <div className={styles.waIcon}>✅</div>
            <h3 className={styles.waTitle}>Отчёт сохранён!</h3>
            <p className={styles.waSub}>Хотите уведомить владельца через WhatsApp?</p>
            <div className={styles.waMessage}>{whatsappModal.message}</div>
            <div className={styles.waBtns}>
              <a
                href={`https://wa.me/${whatsappModal.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappModal.message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.waBtn}
                onClick={() => { setWhatsappModal(null); navigate(-1) }}
              >
                📲 Отправить в WhatsApp
              </a>
              <button className={styles.waSkip} onClick={() => { setWhatsappModal(null); navigate(-1) }}>
                Пропустить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

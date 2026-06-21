import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import SearchableSelect from '../../components/SearchableSelect'
import styles from './Employee.module.css'
import s from '../admin/StaysPage.module.css'

interface Owner { id: string; name: string; email: string }
interface Pet { id: string; name: string; species: string; breed?: string; owner: Owner }
interface Cage { id: string; number: string; zone: string; type: string }
interface Stay {
  id: string
  checkIn: string
  cage: { number: string; zone: string }
  pet: { id: string; name: string; species: string; breed?: string; owner: { name: string } }
  reports: { id?: string; dayStatus: string; date: string }[]
}

interface Note {
  id: string
  content: string
  createdAt: string
  author: { name: string; role: string }
}

const STATUS_COLOR: Record<string, string> = {
  adaptation: '#fbbf24',
  calm: '#86efac',
  active: '#a5f3fc',
  needs_control: '#f87171',
}

export default function EmployeeStaysPage() {
  const [stays, setStays] = useState<Stay[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()

  // Модалка заселения
  const [showModal, setShowModal] = useState(false)
  const [pets, setPets] = useState<Pet[]>([])
  const [freeCages, setFreeCages] = useState<Cage[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [form, setForm] = useState({ petId: '', cageId: '', checkIn: new Date().toISOString().slice(0, 16) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Inline: новый питомец
  const [showNewPet, setShowNewPet] = useState(false)
  const [newPet, setNewPet] = useState({ name: '', species: '', breed: '', ownerId: '' })
  const [savingPet, setSavingPet] = useState(false)
  const [petError, setPetError] = useState('')

  // Inline: новый владелец
  const [showNewOwner, setShowNewOwner] = useState(false)
  const [newOwner, setNewOwner] = useState({ name: '', email: '', password: '', phone: '' })
  const [savingOwner, setSavingOwner] = useState(false)
  const [ownerError, setOwnerError] = useState('')

  // Notes
  const [notesOpen, setNotesOpen] = useState<string | null>(null)
  const [notesData, setNotesData] = useState<Record<string, Note[]>>({})
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => { loadStays() }, [])

  async function loadStays() {
    setLoading(true)
    api.get('/stays?status=active')
      .then(({ data }) => setStays(data))
      .finally(() => setLoading(false))
  }

  async function openCreate() {
    const [p, c, o] = await Promise.all([
      api.get('/pets'),
      api.get('/cages?free=true'),
      api.get('/users/owners/list'),
    ])
    setPets(p.data)
    setFreeCages(c.data)
    setOwners(o.data)
    setForm({ petId: p.data[0]?.id ?? '', cageId: c.data[0]?.id ?? '', checkIn: new Date().toISOString().slice(0, 16) })
    setError(''); setPetError(''); setOwnerError('')
    setShowNewPet(false); setShowNewOwner(false)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.petId) return setError('Выберите питомца')
    if (!form.cageId) return setError('Нет свободных клеток')
    if (!user?.id) return setError('Не определён пользователь')
    setSaving(true); setError('')
    try {
      await api.post('/stays', {
        petId: form.petId,
        cageId: form.cageId,
        employeeId: user.id,
        checkIn: new Date(form.checkIn).toISOString(),
      })
      showToast(t('admin.stays.checkedIn'), 'success')
      setShowModal(false)
      await loadStays()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSaving(false) }
  }

  async function handleCreateOwner() {
    if (!newOwner.name || !newOwner.email || !newOwner.password) return setOwnerError(t('common.required'))
    setSavingOwner(true); setOwnerError('')
    try {
      const { data } = await api.post('/users/owners', newOwner)
      setOwners((prev) => [...prev, data])
      setNewPet((prev) => ({ ...prev, ownerId: data.id }))
      setNewOwner({ name: '', email: '', password: '', phone: '' })
      setShowNewOwner(false)
    } catch (e: unknown) {
      setOwnerError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSavingOwner(false) }
  }

  async function handleCreatePet() {
    if (!newPet.name || !newPet.species || !newPet.ownerId) return setPetError(t('common.required'))
    setSavingPet(true); setPetError('')
    try {
      const { data } = await api.post('/pets', {
        name: newPet.name, species: newPet.species,
        breed: newPet.breed || undefined, ownerId: newPet.ownerId,
      })
      setPets((prev) => [...prev, data])
      setForm((prev) => ({ ...prev, petId: data.id }))
      setNewPet({ name: '', species: '', breed: '', ownerId: owners[0]?.id ?? '' })
      setShowNewPet(false)
    } catch (e: unknown) {
      setPetError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSavingPet(false) }
  }

  async function openNotes(stayId: string) {
    if (notesOpen === stayId) {
      setNotesOpen(null)
      return
    }
    setNotesOpen(stayId)
    setNoteInput('')
    if (!notesData[stayId]) {
      const { data } = await api.get(`/stays/${stayId}/notes`)
      setNotesData(prev => ({ ...prev, [stayId]: data }))
    }
  }

  async function submitNote(stayId: string) {
    if (!noteInput.trim()) return
    try {
      const { data } = await api.post(`/stays/${stayId}/notes`, { content: noteInput.trim() })
      setNotesData(prev => ({ ...prev, [stayId]: [data, ...(prev[stayId] ?? [])] }))
      setNoteInput('')
    } catch {
      showToast(t('common.error'), 'error')
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  function hasReportToday(stay: Stay) {
    return stay.reports?.some((r) => r.date.slice(0, 10) === todayStr)
  }
  const nights = (checkIn: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(checkIn).getTime()) / 86400000))

  if (loading) return <div className={styles.loading}>{t('common.loading')}</div>

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('employee.stays.title')}</h1>
          <p className={styles.subtitle}>
            {stays.length > 0
              ? `${stays.length} активных · ${stays.filter(s => !hasReportToday(s)).length} без отчёта сегодня`
              : t('admin.stays.empty')}
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate} data-tour="employee-checkin-btn">{t('employee.stays.addBtn')}</button>
      </div>

      {stays.length === 0 && (
        <div className={`${styles.empty} glass`}>
          <span>🐾</span>
          <p>{t('employee.stays.noGuests')}</p>
        </div>
      )}

      <div className={styles.cards} data-tour="employee-stays-list">
        {stays.map((stay, index) => {
          const reported = hasReportToday(stay)
          const n = nights(stay.checkIn)
          const lastReport = stay.reports?.[0]
          return (
            <div key={stay.id} className={`${styles.stayCard} glass`} data-tour={index === 0 ? 'employee-stay-card' : undefined}>
              <div className={styles.cardTop}>
                <div className={styles.petIcon}>🐾</div>
                <div className={styles.petInfo}>
                  <div className={styles.petName} style={{ display: 'flex', alignItems: 'center' }}>
                    {stay.pet.name}
                    {lastReport && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: STATUS_COLOR[lastReport.dayStatus] ?? '#888',
                          marginLeft: 6,
                          verticalAlign: 'middle',
                          flexShrink: 0,
                        }}
                        title={lastReport.dayStatus}
                      />
                    )}
                  </div>
                  <div className={styles.petMeta}>
                    {stay.pet.species}{stay.pet.breed ? ` · ${stay.pet.breed}` : ''}
                  </div>
                  <div className={styles.petOwner}>{t('admin.stays.ownerCol')}: {stay.pet.owner.name}</div>
                </div>
                <div className={styles.cageBadge}>
                  <span>{stay.cage.number}</span>
                  <span className={styles.cageZone}>{stay.cage.zone}</span>
                </div>
              </div>

              <div className={styles.cardMeta}>
                <span>🌙 {t('common.nights', { count: n })}</span>
                <span>📅 с {new Date(stay.checkIn).toLocaleDateString('ru')}</span>
                <span className={reported ? styles.reported : styles.notReported}>
                  {reported ? t('employee.stays.reportDone') : t('employee.stays.reportMissing')}
                </span>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.btnReport}
                  data-tour={index === 0 ? 'employee-report-btn' : undefined}
                  onClick={() => navigate(`/employee/reports/new?stayId=${stay.id}`)}
                  disabled={reported}
                >
                  {reported ? t('employee.stays.reportDone') : t('employee.stays.fillReport')}
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => navigate(`/employee/reports?stayId=${stay.id}`)}
                >
                  {t('employee.stays.history')}
                </button>
                <button
                  className={styles.btnSecondary}
                  data-tour={index === 0 ? 'employee-notes-btn' : undefined}
                  onClick={() => openNotes(stay.id)}
                >
                  📝
                </button>
              </div>

              {notesOpen === stay.id && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--item-border)', paddingTop: 12 }}>
                  {(notesData[stay.id] ?? []).map(n => (
                    <div key={n.id} style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-sub)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{n.author.name}:</span> {n.content}
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(n.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {(notesData[stay.id] ?? []).length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Заметок пока нет</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--item-border)', borderRadius: 10, color: 'var(--input-text)', padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                      placeholder="Быстрая заметка..."
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitNote(stay.id) }}
                    />
                    <button
                      style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, color: 'var(--accent)', padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={() => submitNote(stay.id)}
                    >→</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <Modal title={t('employee.stays.addBtn')} onClose={() => setShowModal(false)}>
          <div className={s.stayForm}>

            {/* Выбор питомца */}
            <div className={s.fieldRow}>
              <div className={s.fieldWithBtn}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>{t('admin.stays.petLabel')}</div>
                  <SearchableSelect
                    value={form.petId}
                    onChange={(v) => setForm({ ...form, petId: v })}
                    options={pets.map((p) => ({
                      value: p.id,
                      label: p.name,
                      sub: `${p.species}${p.breed ? ' · ' + p.breed : ''} — ${p.owner.name}`,
                    }))}
                    placeholder={pets.length === 0 ? t('admin.stays.noPets') : 'Выберите питомца...'}
                  />
                </div>
                <button
                  className={s.inlineBtn}
                  title={t('admin.stays.addPetBtn')}
                  onClick={() => { setShowNewPet((v) => !v); setShowNewOwner(false) }}
                >
                  {showNewPet ? '✕' : '+'}
                </button>
              </div>
            </div>

            {/* Inline: новый питомец */}
            {showNewPet && (
              <div className={s.inlineForm}>
                <div className={s.inlineTitle}>{t('admin.stays.newPet')}</div>
                <div className={s.inlineGrid}>
                  <FormField label={t('admin.pets.nameLabel')} value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })} placeholder="Барсик" />
                  <FormField label={t('admin.pets.speciesLabel')} value={newPet.species} onChange={(e) => setNewPet({ ...newPet, species: e.target.value })} placeholder="Кот / Собака" />
                  <FormField label={t('admin.pets.breedLabel')} value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })} placeholder="Необязательно" />
                  <div className={s.fieldWithBtn}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>{t('admin.stays.ownerLabel')}</div>
                      <SearchableSelect
                        value={newPet.ownerId}
                        onChange={(v) => setNewPet({ ...newPet, ownerId: v })}
                        options={owners.map((o) => ({ value: o.id, label: o.name, sub: o.email }))}
                        placeholder={owners.length === 0 ? t('admin.stays.noOwners') : 'Выберите владельца...'}
                      />
                    </div>
                    <button
                      className={s.inlineBtn}
                      title={t('admin.stays.addOwnerBtn')}
                      onClick={() => setShowNewOwner((v) => !v)}
                    >
                      {showNewOwner ? '✕' : '+'}
                    </button>
                  </div>
                </div>

                {/* Inline: новый владелец */}
                {showNewOwner && (
                  <div className={s.innerForm}>
                    <div className={s.inlineTitle}>{t('admin.stays.newOwner')}</div>
                    <div className={s.inlineGrid}>
                      <FormField label={`${t('admin.users.nameCol')} *`} value={newOwner.name} onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })} placeholder="Иван Иванов" />
                      <FormField label={`${t('admin.users.emailCol')} *`} type="email" value={newOwner.email} onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })} placeholder="ivan@example.com" />
                      <FormField label={`Пароль *`} type="password" value={newOwner.password} onChange={(e) => setNewOwner({ ...newOwner, password: e.target.value })} placeholder={t('admin.users.passwordMin')} />
                      <FormField label="Телефон" type="tel" value={newOwner.phone} onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })} placeholder="+7 (700) 000-00-00" />
                    </div>
                    {ownerError && <p className={s.inlineError}>{ownerError}</p>}
                    <button className={s.inlineSave} onClick={handleCreateOwner} disabled={savingOwner}>
                      {savingOwner ? t('common.creating') : t('admin.stays.addOwnerBtn')}
                    </button>
                  </div>
                )}

                {petError && <p className={s.inlineError}>{petError}</p>}
                <button className={s.inlineSave} onClick={handleCreatePet} disabled={savingPet}>
                  {savingPet ? t('common.creating') : t('admin.stays.addPetBtn')}
                </button>
              </div>
            )}

            {/* Клетка и дата */}
            <div className={s.inlineGrid}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>{t('admin.stays.cageLabel')}</div>
                <SearchableSelect
                  value={form.cageId}
                  onChange={(v) => setForm({ ...form, cageId: v })}
                  options={freeCages.map((c) => ({ value: c.id, label: `Клетка ${c.number}`, sub: `${c.zone} · ${c.type}` }))}
                  placeholder={freeCages.length === 0 ? t('admin.stays.noCages') : 'Выберите клетку...'}
                />
              </div>
              <FormField
                label={t('admin.stays.checkInDate')} type="datetime-local"
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
              />
            </div>

            <p className={s.inlineTitle} style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              {t('admin.stays.employeeCol')}: <b style={{ color: '#fff' }}>{user?.name}</b>
            </p>

            {error && <p className={s.inlineError}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className={styles.btnSecondary} onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
              <button className={styles.btnReport} onClick={handleSave} disabled={saving} style={{ flex: 'none', padding: '10px 24px' }}>
                {saving ? t('admin.stays.checkingIn') : t('admin.stays.checkIn')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

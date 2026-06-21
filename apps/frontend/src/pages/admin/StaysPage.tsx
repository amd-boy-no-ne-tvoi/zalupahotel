import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../context/ToastContext'
import { useTableSort, SortIcon } from '../../hooks/useTableSort'
import styles from '../AdminPages.module.css'
import s from './StaysPage.module.css'

interface Owner { id: string; name: string; email: string }
interface Pet { id: string; name: string; species: string; breed?: string; owner: Owner }
interface Cage { id: string; number: string; zone: string; type: string }
interface Employee { id: string; name: string }
interface Stay {
  id: string; status: string; checkIn: string; checkOut?: string; plannedCheckOut?: string
  pet: Pet; cage: Cage; employee: Employee
  reports?: { dayStatus: string; date: string }[]
}

const fmt = (d: string) =>
  new Date(d).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })

function nights(checkIn: string, checkOut?: string) {
  const end = checkOut ? new Date(checkOut) : new Date()
  return Math.max(0, Math.floor((end.getTime() - new Date(checkIn).getTime()) / 86400000))
}

const STATUS_COLOR: Record<string, string> = {
  adaptation: '#fbbf24',
  calm: '#86efac',
  active: '#a5f3fc',
  needs_control: '#f87171',
}

export default function StaysPage() {
  const [stays, setStays] = useState<Stay[]>([])
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active')
  const [search, setSearch] = useState('')
  const [cageFilter, setCageFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [pets, setPets] = useState<Pet[]>([])
  const [freeCages, setFreeCages] = useState<Cage[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [showModal, setShowModal] = useState(false)
  const { showToast } = useToast()
  const { t } = useTranslation()

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })
  const [calendarStays, setCalendarStays] = useState<Stay[]>([])
  const [calLoading, setCalLoading] = useState(false)

  // Основная форма заселения
  const [form, setForm] = useState({ petId: '', cageId: '', employeeId: '', checkIn: new Date().toISOString().slice(0, 16), plannedCheckOut: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Inline создание питомца
  const [showNewPet, setShowNewPet] = useState(false)
  const [newPet, setNewPet] = useState({ name: '', species: '', breed: '', ownerId: '' })
  const [savingPet, setSavingPet] = useState(false)
  const [petError, setPetError] = useState('')

  // Inline создание владельца
  const [showNewOwner, setShowNewOwner] = useState(false)
  const [newOwner, setNewOwner] = useState({ name: '', email: '', password: '', phone: '' })
  const [savingOwner, setSavingOwner] = useState(false)
  const [ownerError, setOwnerError] = useState('')

  useEffect(() => { loadStays(statusFilter) }, [statusFilter])

  useEffect(() => {
    if (viewMode !== 'calendar') return
    setCalLoading(true)
    // Грузим все заселения (active + completed) для отображения в календаре
    api.get('/stays')
      .then(({ data }) => {
        // Оставляем только те, что пересекаются с calMonth
        const monthStart = calMonth.getTime()
        const monthEnd = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1).getTime()
        setCalendarStays((data as Stay[]).filter(s => {
          const cin = new Date(s.checkIn).getTime()
          // Выезд: реальный checkOut или plannedCheckOut или "ещё живёт" (далёкое будущее)
          const cout = s.checkOut
            ? new Date(s.checkOut).getTime()
            : s.plannedCheckOut
              ? new Date(s.plannedCheckOut).getTime()
              : monthEnd + 1
          return cin < monthEnd && cout > monthStart
        }))
      })
      .finally(() => setCalLoading(false))
  }, [viewMode, calMonth])

  async function loadStays(filter = statusFilter) {
    const params = filter !== 'all' ? `?status=${filter}` : ''
    const { data } = await api.get(`/stays${params}`)
    setStays(data)
  }

  async function openCreate() {
    const [p, c, u] = await Promise.all([
      api.get('/pets'),
      api.get('/cages?free=true'),
      api.get('/users'),
    ])
    setPets(p.data)
    setFreeCages(c.data)
    const emps = u.data.filter((u: { role: string }) => u.role === 'employee' || u.role === 'admin')
    const own = u.data.filter((u: { role: string }) => u.role === 'owner')
    setEmployees(emps)
    setOwners(own)
    setForm({ petId: p.data[0]?.id ?? '', cageId: c.data[0]?.id ?? '', employeeId: emps[0]?.id ?? '', checkIn: new Date().toISOString().slice(0, 16), plannedCheckOut: '' })
    setError(''); setShowNewPet(false); setShowNewOwner(false)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.petId) return setError('Выберите питомца')
    if (!form.cageId) return setError('Нет свободных клеток')
    if (!form.employeeId) return setError('Выберите сотрудника')
    setSaving(true); setError('')
    try {
      await api.post('/stays', {
        petId: form.petId,
        cageId: form.cageId,
        employeeId: form.employeeId,
        checkIn: new Date(form.checkIn).toISOString(),
        plannedCheckOut: form.plannedCheckOut ? new Date(form.plannedCheckOut).toISOString() : undefined,
      })
      setStatusFilter('active')
      await loadStays('active'); setShowModal(false)
      showToast(t('admin.stays.checkedIn'), 'success')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSaving(false) }
  }

  async function handleCheckout(id: string) {
    if (!confirm(t('admin.stays.checkoutConfirm'))) return
    try {
      await api.post(`/stays/${id}/checkout`)
      await loadStays()
      showToast(t('admin.stays.checkedOut'), 'success')
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'), 'error')
    }
  }

  // --- Inline: создать владельца ---
  async function handleCreateOwner() {
    if (!newOwner.name || !newOwner.email || !newOwner.password) return setOwnerError(t('common.required'))
    setSavingOwner(true); setOwnerError('')
    try {
      const { data } = await api.post('/users', { ...newOwner, role: 'owner' })
      const updatedOwners = [...owners, data]
      setOwners(updatedOwners)
      setNewPet((prev) => ({ ...prev, ownerId: data.id }))
      setNewOwner({ name: '', email: '', password: '', phone: '' })
      setShowNewOwner(false)
    } catch (e: unknown) {
      setOwnerError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSavingOwner(false) }
  }

  // --- Inline: создать питомца ---
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
      setNewPet({ name: '', species: '', breed: '', ownerId: '' })
      setShowNewPet(false)
    } catch (e: unknown) {
      setPetError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSavingPet(false) }
  }

  const staysFlat = useMemo(() =>
    stays.map(s => ({
      ...s,
      petName: s.pet.name,
      ownerName: s.pet.owner.name,
      cageNum: s.cage.number,
      employeeName: s.employee.name,
      nightsCount: nights(s.checkIn, s.checkOut),
    })),
  [stays])

  const cageOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'Все клетки' }]
    stays.forEach(s => { if (!seen.has(s.cage.id)) { seen.add(s.cage.id); opts.push({ value: s.cage.id, label: `Клетка ${s.cage.number} · ${s.cage.zone}` }) } })
    return opts
  }, [stays])

  const employeeOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'Все сотрудники' }]
    stays.forEach(s => { if (!seen.has(s.employee.id)) { seen.add(s.employee.id); opts.push({ value: s.employee.id, label: s.employee.name }) } })
    return opts
  }, [stays])

  const filtered = useMemo(() => {
    let r = staysFlat
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(s =>
        s.petName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.cageNum.toLowerCase().includes(q)
      )
    }
    if (cageFilter) r = r.filter(s => s.cage.id === cageFilter)
    if (employeeFilter) r = r.filter(s => s.employee.id === employeeFilter)
    return r
  }, [staysFlat, search, cageFilter, employeeFilter])

  const { sorted, toggleSort, sortKey, sortDir } = useTableSort(filtered as unknown as Record<string, unknown>[])

  type StayFlat = (typeof staysFlat)[number]

  function renderCalendar() {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))

    // Строим карту клеток из calendarStays (все статусы, пересекающие месяц)
    const cageMap = new Map<string, { number: string; zone: string }>()
    calendarStays.forEach(s => cageMap.set(s.cage.id, { number: s.cage.number, zone: s.cage.zone }))
    const cages = [...cageMap.entries()].sort((a, b) => a[1].number.localeCompare(b[1].number, 'ru', { numeric: true }))

    const DAY_W = 36
    const today = new Date().toDateString()

    // Определяем конец заселения: реальный выезд > планируемый > "ещё живёт"
    function stayEnd(s: Stay): number {
      if (s.checkOut) return new Date(s.checkOut).getTime()
      if (s.plannedCheckOut) return new Date(s.plannedCheckOut).getTime()
      return Infinity
    }

    return (
      <div className="glass" style={{ borderRadius: 24, padding: 20, overflowX: 'auto' }}>
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() - 1); setCalMonth(d) }}
            style={{ background: 'var(--item-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontWeight: 800, fontSize: 16, minWidth: 160, textAlign: 'center' }}>
            {calMonth.toLocaleString('ru', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() + 1); setCalMonth(d) }}
            style={{ background: 'var(--item-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}
          >›</button>
          {calLoading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Загрузка...</span>}
        </div>

        {cages.length === 0 && !calLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Нет заселений в этом месяце
          </div>
        )}

        {cages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${daysInMonth}, ${DAY_W}px)`, gap: 0, minWidth: 120 + daysInMonth * DAY_W }}>
            {/* Header: days */}
            <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Клетка</div>
            {days.map(d => (
              <div key={d.getDate()} style={{
                padding: '4px 0', textAlign: 'center', fontSize: 11,
                color: d.toDateString() === today ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: d.toDateString() === today ? 800 : 400,
                borderLeft: '1px solid var(--item-border)',
              }}>
                {d.getDate()}
              </div>
            ))}

            {/* Cage rows */}
            {cages.map(([cageId, cage]) => {
              const cageStays = calendarStays.filter(s => s.cage.id === cageId)
              return (
                <>
                  <div key={`label-${cageId}`} style={{
                    padding: '8px 8px', fontSize: 13, fontWeight: 700,
                    borderTop: '1px solid var(--item-border)',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {cage.number}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>· {cage.zone}</span>
                  </div>
                  {days.map(day => {
                    const dayStart = day.getTime()
                    const dayEnd = dayStart + 86400000

                    // Ищем заселение которое активно в этот день
                    // checkIn < конец дня И конец заселения > начало дня
                    const activeStay = cageStays.find(s => {
                      const cin = new Date(s.checkIn).getTime()
                      const cout = stayEnd(s)
                      return cin < dayEnd && cout > dayStart
                    })

                    const status = activeStay?.reports?.[0]?.dayStatus
                    const color = status ? STATUS_COLOR[status] : activeStay ? '#86efac' : undefined

                    // День заезда в этот месяц
                    const isCheckIn = activeStay &&
                      new Date(activeStay.checkIn).getDate() === day.getDate() &&
                      new Date(activeStay.checkIn).getMonth() === month

                    // День фактического или планируемого выезда
                    const endTs = activeStay ? stayEnd(activeStay) : null
                    const isCheckOut = endTs !== null && endTs !== Infinity &&
                      new Date(endTs).getDate() === day.getDate() &&
                      new Date(endTs).getMonth() === month &&
                      new Date(endTs).getFullYear() === year

                    return (
                      <div
                        key={`${cageId}-${day.getDate()}`}
                        style={{
                          borderTop: '1px solid var(--item-border)',
                          borderLeft: '1px solid var(--item-border)',
                          background: color ? `${color}28` : undefined,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color, fontWeight: 700,
                          cursor: activeStay ? 'pointer' : undefined,
                          minHeight: 32, position: 'relative',
                          // Скруглить левый край в день заезда, правый в день выезда
                          borderRadius: isCheckIn && isCheckOut ? 6
                            : isCheckIn ? '6px 0 0 6px'
                            : isCheckOut ? '0 6px 6px 0'
                            : undefined,
                        }}
                        title={activeStay
                          ? `${activeStay.pet.name}${isCheckIn ? ' (заезд)' : ''}${isCheckOut ? activeStay.checkOut ? ' (выезд)' : ' (план. выезд)' : ''}`
                          : undefined}
                      >
                        {isCheckIn
                          ? activeStay.pet.name.slice(0, 5)
                          : isCheckOut
                            ? '←'
                            : activeStay ? '─' : ''}
                      </div>
                    )
                  })}
                </>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {(Object.entries({ adaptation: 'Адаптация', calm: 'Спокойный', active: 'Активный', needs_control: 'Нужен контроль' }) as [string, string][]).map(([k, label]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLOR[k] }} />
              {label}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 800 }}>←</span> выезд
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('admin.stays.title')}</h1>
          <div className={s.tabs}>
            {(['active', 'completed', 'all'] as const).map((v) => (
              <button
                key={v}
                className={`${s.tab} ${statusFilter === v ? s.tabActive : ''}`}
                onClick={() => setStatusFilter(v)}
              >
                {v === 'active' ? t('common.active') : v === 'completed' ? t('common.completed') : t('common.all')}
              </button>
            ))}
          </div>
        </div>
        <div className={s.headerRight}>
          <input
            className={s.searchInput}
            placeholder={t('admin.stays.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.btnPrimary} onClick={openCreate} data-tour="stays-checkin-btn">{t('admin.stays.addBtn')}</button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} data-tour="stays-view-toggle">
        {(['table', 'calendar'] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} style={{
            padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: viewMode === mode ? 'var(--accent-dim)' : 'var(--item-bg)',
            border: `1px solid ${viewMode === mode ? 'var(--accent)' : 'var(--glass-border)'}`,
            color: viewMode === mode ? 'var(--accent)' : 'var(--text-muted)',
          }}>
            {mode === 'table' ? '📋 Таблица' : '📅 Календарь'}
          </button>
        ))}
      </div>

      {viewMode === 'table' && (
        <>
          <div className={styles.filterBar} style={{ marginBottom: 8 }}>
            <SearchableSelect
              value={cageFilter}
              onChange={setCageFilter}
              options={cageOptions}
              placeholder="Клетка"
              className={styles.filterSelectWrap}
            />
            <SearchableSelect
              value={employeeFilter}
              onChange={setEmployeeFilter}
              options={employeeOptions}
              placeholder="Сотрудник"
              className={styles.filterSelectWrap}
            />
            {(cageFilter || employeeFilter) && (
              <button className={styles.clearBtn} onClick={() => { setCageFilter(''); setEmployeeFilter('') }}>✕ Сбросить фильтры</button>
            )}
            <span className={styles.filterCount}>{filtered.length} заселений</span>
          </div>

          <div className={`${styles.tableWrap} glass`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><button className={styles.thSort} onClick={() => toggleSort('petName')}>{t('admin.stays.petCol')} <SortIcon active={sortKey === 'petName'} dir={sortDir} /></button></th>
                  <th><button className={styles.thSort} onClick={() => toggleSort('ownerName')}>{t('admin.stays.ownerCol')} <SortIcon active={sortKey === 'ownerName'} dir={sortDir} /></button></th>
                  <th><button className={styles.thSort} onClick={() => toggleSort('cageNum')}>{t('admin.stays.cageCol')} <SortIcon active={sortKey === 'cageNum'} dir={sortDir} /></button></th>
                  <th><button className={styles.thSort} onClick={() => toggleSort('employeeName')}>{t('admin.stays.employeeCol')} <SortIcon active={sortKey === 'employeeName'} dir={sortDir} /></button></th>
                  <th><button className={styles.thSort} onClick={() => toggleSort('checkIn')}>{t('admin.stays.arrivalCol')} <SortIcon active={sortKey === 'checkIn'} dir={sortDir} /></button></th>
                  <th>Выезд (план)</th>
                  <th><button className={styles.thSort} onClick={() => toggleSort('nightsCount')}>{t('admin.stays.nightsCol')} <SortIcon active={sortKey === 'nightsCount'} dir={sortDir} /></button></th>
                  <th>{t('admin.stays.statusCol')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(sorted as unknown as StayFlat[]).map((st) => (
                  <tr key={st.id}>
                    <td className={styles.compact}><b>{st.pet.name}</b> <span className={styles.muted}>({st.pet.species})</span></td>
                    <td className={styles.muted}>{st.pet.owner.name}</td>
                    <td className={styles.compact}>{st.cage.number} <span className={styles.muted}>· {st.cage.zone}</span></td>
                    <td className={`${styles.muted} ${styles.compact}`}>{st.employee.name}</td>
                    <td className={`${styles.muted} ${styles.nowrap}`}>{fmt(st.checkIn)}</td>
                    <td className={`${styles.muted} ${styles.nowrap}`}>
                      {st.plannedCheckOut ? (
                        <span style={{ color: 'var(--accent)' }}>→ {fmtDate(st.plannedCheckOut)}</span>
                      ) : '—'}
                    </td>
                    <td className={`${s.nightsCell} ${styles.nowrap}`}>{nights(st.checkIn, st.checkOut)}</td>
                    <td className={styles.compact}>
                      <span className={`${styles.badge} ${st.status === 'active' ? styles.free : styles.occupied}`}>
                        {st.status === 'active' ? t('admin.stays.statusActive') : t('admin.stays.statusDone')}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      {st.status === 'active' && (
                        <button className={`${styles.btnSm} ${styles.danger}`} onClick={() => handleCheckout(st.id)}>{t('admin.stays.checkout')}</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    {search ? t('admin.stays.notFound') : t('admin.stays.empty')}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewMode === 'calendar' && renderCalendar()}

      {showModal && (
        <Modal title={t('admin.stays.newTitle')} onClose={() => setShowModal(false)}>
          <div className={s.stayForm}>

            {/* Выбор питомца */}
            <div className={s.fieldRow} data-tour="modal-pet-select">
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

            {/* Inline: форма нового питомца */}
            {showNewPet && (
              <div className={s.inlineForm}>
                <div className={s.inlineTitle}>
                  {t('admin.stays.newPet')}
                </div>
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

                {/* Inline: форма нового владельца */}
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

            {/* Остальные поля */}
            <div className={s.inlineGrid}>
              <div data-tour="modal-cage-select">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>{t('admin.stays.cageLabel')}</div>
                <SearchableSelect
                  value={form.cageId}
                  onChange={(v) => setForm({ ...form, cageId: v })}
                  options={freeCages.map((c) => ({ value: c.id, label: `Клетка ${c.number}`, sub: `${c.zone} · ${c.type}` }))}
                  placeholder={freeCages.length === 0 ? t('admin.stays.noCages') : 'Выберите клетку...'}
                />
              </div>
              <div data-tour="modal-employee-select">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>{t('admin.stays.employeeLabel')}</div>
                <SearchableSelect
                  value={form.employeeId}
                  onChange={(v) => setForm({ ...form, employeeId: v })}
                  options={employees.map((e) => ({ value: e.id, label: e.name }))}
                  placeholder={employees.length === 0 ? t('admin.stays.noEmployees') : 'Выберите сотрудника...'}
                />
              </div>
              <FormField
                label={t('admin.stays.checkInDate')} type="datetime-local"
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                wrapClassName={s.fullCol}
              />
            </div>

            {/* Планируемый выезд */}
            <div className={s.field} data-tour="modal-planned-checkout">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>Планируемый выезд</div>
              <input
                type="date"
                className={s.searchInput}
                value={form.plannedCheckOut}
                onChange={e => setForm({ ...form, plannedCheckOut: e.target.value })}
                min={form.checkIn.slice(0, 10)}
              />
            </div>

            {error && <p className={styles.formError}>{error}</p>}
            <div className={styles.modalFooter} data-tour="modal-save-btn">
              <button className={styles.btnSecondary} onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? t('admin.stays.checkingIn') : t('admin.stays.checkIn')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

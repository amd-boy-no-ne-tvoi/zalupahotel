import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import PhotoUpload from '../../components/PhotoUpload'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../context/ToastContext'
import { useTableSort, SortIcon } from '../../hooks/useTableSort'
import styles from '../AdminPages.module.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface Owner { id: string; name: string; email: string }
interface Pet { id: string; name: string; species: string; breed?: string; notes?: string; photoUrl?: string; owner: Owner }

const emptyForm = { name: '', species: '', breed: '', notes: '', ownerId: '', photoUrl: '' }

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Pet | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const { showToast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    load()
    api.get('/users/owners/list').then(({ data }) => setOwners(data))
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/pets')
    setPets(data)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, ownerId: owners[0]?.id ?? '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(p: Pet) {
    setEditing(p)
    setForm({ name: p.name, species: p.species, breed: p.breed ?? '', notes: p.notes ?? '', ownerId: p.owner.id, photoUrl: p.photoUrl ?? '' })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('Введите кличку')
    if (!form.species.trim()) return setError('Укажите вид животного')
    if (!form.ownerId) return setError('Выберите владельца')
    setSaving(true); setError('')
    try {
      const body = { ...form, breed: form.breed || undefined, notes: form.notes || undefined, photoUrl: form.photoUrl || undefined }
      if (editing) {
        await api.patch(`/pets/${editing.id}`, body)
      } else {
        await api.post('/pets', body)
      }
      await load(); closeModal()
      showToast(editing ? t('admin.pets.updated') : t('admin.pets.created'), 'success')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.pets.deleteConfirm'))) return
    try {
      await api.delete(`/pets/${id}`)
      await load()
      showToast(t('admin.pets.deleted'), 'success')
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'), 'error')
    }
  }

  const petsFlat = useMemo(() =>
    pets.map(p => ({ ...p, ownerName: p.owner.name })),
  [pets])

  const filtered = useMemo(() => {
    let r = petsFlat
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p => p.name.toLowerCase().includes(q) || p.species.toLowerCase().includes(q) || (p.breed ?? '').toLowerCase().includes(q))
    }
    if (ownerFilter) r = r.filter(p => p.owner.id === ownerFilter)
    return r
  }, [petsFlat, search, ownerFilter])

  const { sorted, toggleSort, sortKey, sortDir } = useTableSort(filtered as unknown as Record<string, unknown>[])

  type PetFlat = (typeof petsFlat)[number]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('admin.pets.title')}</h1>
          <p className={styles.subtitle}>{pets.length} {t('admin.pets.title').toLowerCase()}</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>{t('admin.pets.add')}</button>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.filterSearch}
          placeholder="Поиск по кличке, виду, породе..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <SearchableSelect
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={[{ value: '', label: 'Все владельцы' }, ...owners.map(o => ({ value: o.id, label: o.name, sub: o.email }))]}
          placeholder="Владелец"
          className={styles.filterSelectWrap}
        />
        {(search || ownerFilter) && (
          <button className={styles.clearBtn} onClick={() => { setSearch(''); setOwnerFilter('') }}>✕ Сбросить</button>
        )}
        <span className={styles.filterCount}>{filtered.length} / {pets.length}</span>
      </div>

      <div className={`${styles.tableWrap} glass`}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : pets.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🐾</div>
            <p>{t('admin.pets.empty')}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('name')}>{t('admin.pets.nameCol')} <SortIcon active={sortKey === 'name'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('species')}>{t('admin.pets.speciesCol')} <SortIcon active={sortKey === 'species'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('ownerName')}>{t('admin.pets.ownerCol')} <SortIcon active={sortKey === 'ownerName'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('notes')}>{t('admin.pets.notesCol')} <SortIcon active={sortKey === 'notes'} dir={sortDir} /></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(sorted as unknown as PetFlat[]).map((p) => (
                <tr key={p.id}>
                  <td className={styles.compact}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-dim)', flexShrink: 0 }}>
                      {p.photoUrl
                        ? <img src={`${API_BASE}${p.photoUrl}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <span style={{ fontSize: 20, lineHeight: 1 }}>🐾</span>}
                    </div>
                  </td>
                  <td className={styles.compact}><b>{p.name}</b></td>
                  <td className={`${styles.muted} ${styles.compact}`}>{p.species}{p.breed ? ` · ${p.breed}` : ''}</td>
                  <td>{p.owner.name}</td>  {/* flex */}
                  <td className={styles.muted}>{p.notes ?? '—'}</td>
                  <td className={styles.actions}>
                    <button className={styles.btnSm} onClick={() => openEdit(p)}>{t('common.edit')}</button>
                    <button className={`${styles.btnSm} ${styles.danger}`} onClick={() => handleDelete(p.id)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? t('admin.pets.editTitle') : t('admin.pets.newTitle')} onClose={closeModal}>
          <div className={styles.formGrid}>
            <FormField label={t('admin.pets.nameLabel')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Барсик" />
            <FormField label={t('admin.pets.speciesLabel')} value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="Кот / Собака" />
            <FormField label={t('admin.pets.breedLabel')} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Необязательно" />
            <FormField as="select" label={`${t('admin.pets.ownerCol')} *`} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
              {owners.length === 0
                ? <option value="">{t('admin.pets.selectOwner')}</option>
                : owners.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)
              }
            </FormField>
            <FormField label={t('admin.pets.notesCol')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Особенности питомца" wrapClassName={styles.fullCol} />
            <div className={styles.fullCol}>
              <PhotoUpload label={t('admin.pets.photoLabel')} value={form.photoUrl} onChange={(url) => setForm({ ...form, photoUrl: url })} />
            </div>
          </div>
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={closeModal}>{t('common.cancel')}</button>
            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving || owners.length === 0}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

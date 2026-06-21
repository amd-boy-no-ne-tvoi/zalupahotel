import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../context/ToastContext'
import { useTableSort, SortIcon } from '../../hooks/useTableSort'
import styles from '../AdminPages.module.css'

interface User { id: string; name: string; email: string; role: string; createdAt: string; phone?: string }

const emptyForm = { name: '', email: '', password: '', role: 'employee', phone: '' }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const { showToast } = useToast()
  const { t } = useTranslation()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/users')
    setUsers(data)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone ?? '' })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm(emptyForm)
    setEditing(null)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('Введите имя')
    if (!form.email.trim()) return setError('Введите email')
    if (!editing && !form.password) return setError('Введите пароль')
    setSaving(true); setError('')
    try {
      if (editing) {
        const body: Record<string, string> = { name: form.name, email: form.email, role: form.role, phone: form.phone }
        if (form.password) body.password = form.password
        await api.patch(`/users/${editing.id}`, body)
      } else {
        await api.post('/users', form)
      }
      await load()
      closeModal()
      showToast(editing ? t('admin.users.updated') : t('admin.users.created'), 'success')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.users.deleteConfirm'))) return
    try {
      await api.delete(`/users/${id}`)
      await load()
      showToast(t('admin.users.deleted'), 'success')
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'), 'error')
    }
  }

  const filtered = useMemo(() => {
    let r = users
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (roleFilter) r = r.filter(u => u.role === roleFilter)
    return r
  }, [users, search, roleFilter])

  const { sorted, toggleSort, sortKey, sortDir } = useTableSort(filtered as unknown as Record<string, unknown>[])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('admin.users.title')}</h1>
          <p className={styles.subtitle}>{users.length} {t('admin.users.title').toLowerCase()}</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>{t('admin.users.add')}</button>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.filterSearch}
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <SearchableSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '', label: 'Все роли' },
            { value: 'admin', label: t('roles.admin') },
            { value: 'employee', label: t('roles.employee') },
            { value: 'owner', label: t('roles.owner') },
          ]}
          placeholder="Роль"
          className={styles.filterSelectWrap}
        />
        {(search || roleFilter) && (
          <button className={styles.clearBtn} onClick={() => { setSearch(''); setRoleFilter('') }}>✕ Сбросить</button>
        )}
        <span className={styles.filterCount}>{filtered.length} / {users.length}</span>
      </div>

      <div className={`${styles.tableWrap} glass`} data-tour="users-table">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p>{t('admin.users.empty')}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th><button className={styles.thSort} onClick={() => toggleSort('name')}>{t('admin.users.nameCol')} <SortIcon active={sortKey === 'name'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('email')}>{t('admin.users.emailCol')} <SortIcon active={sortKey === 'email'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('role')}>{t('admin.users.roleCol')} <SortIcon active={sortKey === 'role'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('createdAt')}>{t('admin.users.createdCol')} <SortIcon active={sortKey === 'createdAt'} dir={sortDir} /></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(sorted as unknown as User[]).map((u) => (
                <tr key={u.id}>
                  <td className={styles.compact}>{u.name}</td>
                  <td className={styles.muted}>{u.email}</td>
                  <td className={styles.nowrap}><span className={`${styles.badge} ${styles[u.role]}`}>{t(`roles.${u.role}`) || u.role}</span></td>
                  <td className={`${styles.muted} ${styles.nowrap}`}>{new Date(u.createdAt).toLocaleDateString('ru')}</td>
                  <td className={styles.actions}>
                    <button className={styles.btnSm} onClick={() => openEdit(u)}>{t('common.edit')}</button>
                    <button className={`${styles.btnSm} ${styles.danger}`} onClick={() => handleDelete(u.id)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? t('admin.users.editTitle') : t('admin.users.newTitle')} onClose={closeModal}>
          <div className={styles.formGrid}>
            <FormField label={`${t('admin.users.nameCol')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Иван Иванов" />
            <FormField label={`${t('admin.users.emailCol')} *`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ivan@example.com" />
            <FormField label={editing ? t('admin.users.passwordNew') : `Пароль *`} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('admin.users.passwordMin')} />
            <FormField as="select" label={t('admin.users.roleCol')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">{t('roles.admin')}</option>
              <option value="employee">{t('roles.employee')}</option>
              <option value="owner">{t('roles.owner')}</option>
            </FormField>
            <FormField label="Телефон" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (700) 000-00-00" />
          </div>
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={closeModal}>{t('common.cancel')}</button>
            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

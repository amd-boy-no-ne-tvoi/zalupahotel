import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../lib/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../context/ToastContext'
import { useTableSort, SortIcon } from '../../hooks/useTableSort'
import styles from '../AdminPages.module.css'

interface Cage { id: string; number: string; zone: string; type: string; isOccupied: boolean }

const emptyForm = { number: '', zone: '', type: 'dog' }

export default function CagesPage() {
  const [cages, setCages] = useState<Cage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Cage | null>(null)
  const [qrCage, setQrCage] = useState<Cage | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { showToast } = useToast()
  const { t } = useTranslation()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/cages')
    setCages(data)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null); setForm(emptyForm); setError(''); setShowModal(true)
  }

  function openEdit(c: Cage) {
    setEditing(c); setForm({ number: c.number, zone: c.zone, type: c.type }); setError(''); setShowModal(true)
  }

  function closeModal() {
    setShowModal(false); setEditing(null); setForm(emptyForm); setError('')
  }

  async function handleSave() {
    if (!form.number.trim()) return setError('Введите номер клетки')
    if (!form.zone.trim()) return setError('Введите зону')
    setSaving(true); setError('')
    try {
      if (editing) { await api.patch(`/cages/${editing.id}`, form) }
      else { await api.post('/cages', form) }
      await load(); closeModal()
      showToast(editing ? t('admin.cages.updated') : t('admin.cages.created'), 'success')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'))
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.cages.deleteConfirm'))) return
    try {
      await api.delete(`/cages/${id}`)
      await load()
      showToast(t('admin.cages.deleted'), 'success')
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error'), 'error')
    }
  }

  const cagesFlat = useMemo(() =>
    cages.map(c => ({ ...c, statusStr: c.isOccupied ? 'occupied' : 'free' })),
  [cages])

  const filtered = useMemo(() => {
    let r = cagesFlat
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(c => c.number.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q))
    }
    if (typeFilter) r = r.filter(c => c.type === typeFilter)
    if (statusFilter) r = r.filter(c => c.statusStr === statusFilter)
    return r
  }, [cagesFlat, search, typeFilter, statusFilter])

  const { sorted, toggleSort, sortKey, sortDir } = useTableSort(filtered as unknown as Record<string, unknown>[])

  type CageFlat = (typeof cagesFlat)[number]

  const free = cages.filter((c) => !c.isOccupied).length

  function printQR(cage: Cage) {
    const svgEl = document.querySelector('#qr-print-target svg')
    const svgContent = svgEl ? svgEl.outerHTML : ''
    const typeLabel = cage.type === 'dog' ? 'Собаки' : cage.type === 'cat' ? 'Кошки' : 'Другие'
    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>QR — Клетка ${cage.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 32px;
      gap: 20px;
    }
    svg { display: block; }
    .number { font-size: 36px; font-weight: 900; color: #000; letter-spacing: -0.03em; margin-top: 4px; }
    .zone   { font-size: 16px; color: #555; margin-top: 4px; }
    .type   { font-size: 13px; color: #888; margin-top: 2px; }
    .hint   { font-size: 11px; color: #aaa; margin-top: 12px; }
    @media print {
      body { min-height: unset; }
    }
  </style>
</head>
<body>
  ${svgContent}
  <div class="number">Клетка ${cage.number}</div>
  <div class="zone">${cage.zone}</div>
  <div class="type">${typeLabel}</div>
  <div class="hint">Сканируйте QR для быстрого доступа</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`)
    win.document.close()
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('admin.cages.title')}</h1>
          <p className={styles.subtitle}>Всего: {cages.length} · {t('admin.cages.free')}: {free} · {t('admin.cages.occupied')}: {cages.length - free}</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>{t('admin.cages.add')}</button>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.filterSearch}
          placeholder="Поиск по номеру или зоне..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <SearchableSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: '', label: 'Все типы' },
            { value: 'dog', label: t('admin.cages.typeDog') },
            { value: 'cat', label: t('admin.cages.typeCat') },
            { value: 'other', label: t('admin.cages.typeOther') },
          ]}
          placeholder="Тип"
          className={styles.filterSelectWrap}
        />
        <SearchableSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'Любой статус' },
            { value: 'free', label: t('admin.cages.free') },
            { value: 'occupied', label: t('admin.cages.occupied') },
          ]}
          placeholder="Статус"
          className={styles.filterSelectWrap}
        />
        {(search || typeFilter || statusFilter) && (
          <button className={styles.clearBtn} onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter('') }}>✕ Сбросить</button>
        )}
        <span className={styles.filterCount}>{filtered.length} / {cages.length}</span>
      </div>

      <div className={`${styles.tableWrap} glass`} data-tour="cages-table">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : cages.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔲</div>
            <p>{t('admin.cages.empty')}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th><button className={styles.thSort} onClick={() => toggleSort('number')}>{t('admin.cages.numberCol')} <SortIcon active={sortKey === 'number'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('zone')}>{t('admin.cages.zoneCol')} <SortIcon active={sortKey === 'zone'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('type')}>{t('admin.cages.typeCol')} <SortIcon active={sortKey === 'type'} dir={sortDir} /></button></th>
                <th><button className={styles.thSort} onClick={() => toggleSort('statusStr')}>{t('admin.cages.statusCol')} <SortIcon active={sortKey === 'statusStr'} dir={sortDir} /></button></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(sorted as unknown as CageFlat[]).map((c) => (
                <tr key={c.id}>
                  <td className={styles.compact}><b>{c.number}</b></td>
                  <td className={styles.muted}>{c.zone}</td>  {/* flex */}
                  <td className={styles.compact}>{t(`admin.cages.type${c.type.charAt(0).toUpperCase()}${c.type.slice(1)}`) || c.type}</td>
                  <td className={styles.compact}>
                    <span className={`${styles.badge} ${c.isOccupied ? styles.occupied : styles.free}`}>
                      {c.isOccupied ? t('admin.cages.occupied') : t('admin.cages.free')}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <button className={styles.btnSm} onClick={() => openEdit(c)}>{t('common.edit')}</button>
                    <button className={styles.btnSm} onClick={() => setQrCage(c)}>QR</button>
                    <button
                      className={`${styles.btnSm} ${styles.danger}`}
                      onClick={() => handleDelete(c.id)}
                      disabled={c.isOccupied}
                      title={c.isOccupied ? t('admin.cages.cantDelete') : ''}
                    >{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {qrCage && (
        <Modal title={`QR — Клетка ${qrCage.number}`} onClose={() => setQrCage(null)}>
          <div id="qr-print-target" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '8px 0' }}>
            <QRCodeSVG
              value={`${window.location.origin}/employee/stays?cage=${qrCage.id}`}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
            <p style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
              Клетка <b style={{ fontSize: 18 }}>{qrCage.number}</b><br/>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{qrCage.zone}</span>
            </p>
            <button
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 12, color: 'var(--accent)', padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
              onClick={() => printQR(qrCage)}
            >🖨 Распечатать</button>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title={editing ? t('admin.cages.editTitle') : t('admin.cages.newTitle')} onClose={closeModal}>
          <div className={styles.formGrid}>
            <FormField label={t('admin.cages.numberLabel')} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="A-01" />
            <FormField label={t('admin.cages.zoneLabel')} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder="Зона A" />
            <FormField as="select" label={t('admin.cages.typeLabel')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="dog">{t('admin.cages.typeDog')}</option>
              <option value="cat">{t('admin.cages.typeCat')}</option>
              <option value="other">{t('admin.cages.typeOther')}</option>
            </FormField>
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

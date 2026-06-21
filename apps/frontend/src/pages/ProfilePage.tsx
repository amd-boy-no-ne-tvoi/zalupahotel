import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../lib/api'
import PushToggle from '../components/PushToggle'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoError, setInfoError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault()
    setInfoError('')
    setInfoSaving(true)
    try {
      const { data } = await api.patch('/auth/profile', { name, email, phone })
      updateUser(data.user)
      showToast(t('profile.profileSaved'), 'success')
    } catch (err: unknown) {
      setInfoError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('profile.saveError'))
    } finally {
      setInfoSaving(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (newPassword !== confirmPassword) {
      setPwError(t('profile.passwordMismatch'))
      return
    }
    setPwSaving(true)
    try {
      await api.patch('/auth/profile', { currentPassword, newPassword })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      showToast(t('profile.passwordChanged'), 'success')
    } catch (err: unknown) {
      setPwError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('profile.saveError'))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('profile.title')}</h1>
          <p className={styles.sub}>{t('profile.subtitle')}</p>
        </div>
        <div className={styles.badge}>{t(`roles.${user?.role}`) || user?.role}</div>
      </div>

      <div className={styles.grid}>
        {/* Основная информация */}
        <section className={`${styles.card} glass`}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>👤</span>
            {t('profile.personalInfo')}
          </h2>
          <form onSubmit={saveInfo} className={styles.form}>
            <label className={styles.field}>
              <span>{t('profile.name')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
                maxLength={100}
              />
            </label>
            <label className={styles.field}>
              <span>{t('profile.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              <span>{t('profile.phone')}</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (700) 000-00-00"
              />
            </label>
            {infoError && <p className={styles.error}>{infoError}</p>}
            <button className={styles.btnPrimary} type="submit" disabled={infoSaving}>
              {infoSaving ? t('profile.saving') : t('profile.saveChanges')}
            </button>
          </form>
        </section>

        {/* Смена пароля */}
        <section className={`${styles.card} glass`}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🔒</span>
            {t('profile.changePassword')}
          </h2>
          <form onSubmit={savePassword} className={styles.form}>
            <label className={styles.field}>
              <span>{t('profile.currentPassword')}</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <label className={styles.field}>
              <span>{t('profile.newPassword')}</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label className={styles.field}>
              <span>{t('profile.confirmPassword')}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            {pwError && <p className={styles.error}>{pwError}</p>}
            <button className={styles.btnPrimary} type="submit" disabled={pwSaving}>
              {pwSaving ? t('profile.saving') : t('profile.updatePassword')}
            </button>
          </form>
        </section>

        {/* Push notifications */}
        <section className={`${styles.card} glass ${styles.fullCard}`}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🔔</span>
            {t('profile.pushSection')}
          </h2>
          <p className={styles.cardHint}>
            {t('profile.pushHint')}
          </p>
          <PushToggle />
        </section>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '../context/ThemeContext'
import { usePushSubscription } from '../hooks/usePushSubscription'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTour } from '../context/TourContext'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import styles from './SettingsPage.module.css'

const LANGS = [
  { code: 'ru', flag: '🇷🇺' },
  { code: 'kk', flag: '🇰🇿' },
  { code: 'en', flag: '🇬🇧' },
] as const

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { state, subscribe, unsubscribe } = usePushSubscription()
  const { user } = useAuth()
  const { showToast } = useToast()
  const tour = useTour()

  const [template, setTemplate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/settings/whatsapp_template')
      .then(({ data }) => setTemplate(data.value))
      .catch(() => {})
  }, [])

  async function saveTemplate() {
    setSaving(true)
    await api.patch('/settings/whatsapp_template', { value: template }).catch(() => {})
    setSaving(false)
    showToast('Шаблон сохранён', 'success')
  }

  async function resetTemplate() {
    await api.delete('/settings/whatsapp_template').catch(() => {})
    const { data } = await api.get('/settings/whatsapp_template')
    setTemplate(data.value)
    showToast('Шаблон сброшен', 'success')
  }

  const THEMES: { value: Theme; icon: string; label: string; desc: string }[] = [
    { value: 'system', icon: '⚙', label: t('settings.themeSystem'), desc: t('settings.themeSystemDesc') },
    { value: 'light', icon: '☀', label: t('settings.themeLight'), desc: t('settings.themeLightDesc') },
    { value: 'dark', icon: '🌙', label: t('settings.themeDark'), desc: t('settings.themeDarkDesc') },
  ]

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('settings.title')}</h1>

      {/* Обучающий тур */}
      <section className={styles.section}>
        <div className={`${styles.card} glass`} style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Обучающий тур</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Интерактивный показ основных функций системы. Подходит для новых сотрудников и презентаций.
          </p>
          <button
            data-tour="tour-start-btn"
            onClick={() => tour.start((user?.role as 'admin' | 'employee' | 'owner') ?? 'employee')}
            style={{
              background: 'linear-gradient(135deg, #a5f3fc, #7dd3fc)',
              border: 'none',
              borderRadius: 14,
              color: '#06101e',
              fontWeight: 800,
              fontSize: 14,
              padding: '11px 24px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ▶ Начать тур
          </button>
        </div>
      </section>

      {/* Тема */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.appearance')}</h2>
        <div className={`${styles.card} glass`}>
          <div className={styles.themeGrid}>
            {THEMES.map((th) => (
              <button
                key={th.value}
                className={`${styles.themeOption} ${theme === th.value ? styles.themeActive : ''}`}
                onClick={() => setTheme(th.value)}
              >
                <span className={styles.themeIcon}>{th.icon}</span>
                <span className={styles.themeLabel}>{th.label}</span>
                <span className={styles.themeDesc}>{th.desc}</span>
                {theme === th.value && <span className={styles.themeTick}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Язык */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.language')}</h2>
        <div className={`${styles.card} glass`}>
          <div className={styles.langGrid}>
            {LANGS.map(({ code, flag }) => (
              <button
                key={code}
                className={`${styles.langOption} ${i18n.resolvedLanguage === code ? styles.langActive : ''}`}
                onClick={() => i18n.changeLanguage(code)}
              >
                <span className={styles.langFlag}>{flag}</span>
                <span className={styles.langLabel}>{t(`settings.lang${code.charAt(0).toUpperCase() + code.slice(1)}` as never)}</span>
                {i18n.resolvedLanguage === code && <span className={styles.themeTick}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Push-уведомления */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.notifications')}</h2>
        <div className={`${styles.card} glass`}>
          {state === 'unsupported' && (
            <div className={styles.unsupported}>
              <span>🔕</span>
              <div>
                <div className={styles.rowLabel}>{t('settings.pushUnsupported')}</div>
                <div className={styles.rowSub}>{t('settings.pushUnsupportedSub')}</div>
              </div>
            </div>
          )}
          {state === 'denied' && (
            <div className={styles.denied}>
              <span>⚠</span>
              <div>
                <div className={styles.rowLabel}>{t('settings.pushDenied')}</div>
                <div className={styles.rowSub}>{t('settings.pushDeniedSub')}</div>
              </div>
            </div>
          )}
          {(state === 'subscribed' || state === 'unsubscribed' || state === 'loading') && (
            <div className={styles.pushRow}>
              <div className={styles.pushInfo}>
                <span className={styles.pushIcon}>{state === 'subscribed' ? '🔔' : '🔕'}</span>
                <div>
                  <div className={styles.rowLabel}>
                    {state === 'subscribed' ? t('settings.pushEnabled') : t('settings.pushDisabled')}
                  </div>
                  <div className={styles.rowSub}>
                    {state === 'subscribed' ? t('settings.pushEnabledSub') : t('settings.pushDisabledSub')}
                  </div>
                </div>
              </div>
              {state === 'subscribed' && <button className={styles.btnOff} onClick={unsubscribe}>{t('settings.pushDisable')}</button>}
              {state === 'unsubscribed' && <button className={styles.btnOn} onClick={subscribe}>{t('settings.pushEnable')}</button>}
              {state === 'loading' && <span className={styles.loadingDot}>...</span>}
            </div>
          )}
        </div>
      </section>

      {/* Аккаунт */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.account')}</h2>
        <div className={`${styles.card} glass`}>
          <div className={styles.accountRow}>
            <div>
              <div className={styles.rowLabel}>{user?.name}</div>
              <div className={styles.rowSub}>{user?.email}</div>
            </div>
            <Link to="/profile" className={styles.profileLink}>{t('settings.editProfile')}</Link>
          </div>
        </div>
      </section>

      {/* WhatsApp шаблон (только для админа) */}
      {user?.role === 'admin' && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>WhatsApp шаблон</h2>
          <div className={`${styles.card} glass`} style={{ padding: '20px 24px' }} data-tour="settings-whatsapp">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              Текст уведомления владельцу после сохранения отчёта. Используйте переменные: {'{petName}'}, {'{date}'}, {'{url}'}, {'{warningLine}'}
            </p>
            <textarea
              className={styles.templateTextarea}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={8}
            />
            <div className={styles.templateBtns}>
              <button className={styles.btnSave} onClick={saveTemplate} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className={styles.btnReset} onClick={resetTemplate}>
                Сбросить к базовому
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

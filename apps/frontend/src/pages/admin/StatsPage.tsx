import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../../lib/api'
import styles from '../AdminPages.module.css'

interface OccupancyPoint { date: string; occupied: number; free: number }
interface PeriodStats {
  totalStays: number
  uniquePets: number
  avgNights: number
  totalReports: number
  totalCages: number
  topOwners: { name: string; count: number }[]
}

export default function StatsPage() {
  const [occupancy, setOccupancy] = useState<OccupancyPoint[]>([])
  const [period, setPeriod] = useState<PeriodStats | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [days])

  async function load() {
    setLoading(true)
    const [occ, per] = await Promise.all([
      api.get(`/stats/occupancy?days=${days}`),
      api.get('/stats/period'),
    ])
    setOccupancy(occ.data)
    setPeriod(per.data)
    setLoading(false)
  }

  const statCards = period ? [
    { label: 'Заселений за период', value: period.totalStays, icon: '🏨' },
    { label: 'Уникальных питомцев', value: period.uniquePets, icon: '🐾' },
    { label: 'Средний срок (ночей)', value: period.avgNights, icon: '🌙' },
    { label: 'Отчётов составлено', value: period.totalReports, icon: '📋' },
  ] : []

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Статистика</h1>
          <p className={styles.subtitle}>Аналитика за период</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: days === d ? 'var(--accent-dim)' : 'var(--item-bg)',
                border: `1px solid ${days === d ? 'var(--accent)' : 'var(--glass-border)'}`,
                color: days === d ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >{d} дней</button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map(c => (
          <div key={c.label} className="glass" style={{ borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{c.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Occupancy chart */}
      <div className="glass" style={{ borderRadius: 24, padding: 24, marginBottom: 24 }} data-tour="stats-occupancy">
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Занятость клеток</h2>
        {loading ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={occupancy} barGap={0}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={d => new Date(d).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' })}
                interval={Math.floor(occupancy.length / 7)}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--modal-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 13 }}
                labelFormatter={d => new Date(d as string).toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="occupied" name="Занято" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="free" name="Свободно" fill="var(--item-border)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top owners */}
      {period && period.topOwners.length > 0 && (
        <div className="glass" style={{ borderRadius: 24, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Топ владельцев</h2>
          {period.topOwners.map((o, i) => (
            <div key={o.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 18, width: 28, textAlign: 'center', color: i === 0 ? '#fbbf24' : 'var(--text-muted)', fontWeight: 800 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.name}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{o.count} заселений</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

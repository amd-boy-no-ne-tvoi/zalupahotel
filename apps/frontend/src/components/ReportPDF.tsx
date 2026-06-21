import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 10, color: '#1e293b', padding: '40 50', backgroundColor: '#ffffff' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, borderBottom: '2 solid #0ea5e9', paddingBottom: 14 },
  hotelName: { fontSize: 20, fontWeight: 700, color: '#0ea5e9', letterSpacing: 0.5 },
  hotelSub: { fontSize: 9, color: '#94a3b8', marginTop: 3 },
  headerRight: { alignItems: 'flex-end' },
  headerLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerDate: { fontSize: 13, fontWeight: 700, color: '#1e293b', marginTop: 3 },

  petRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f9ff', borderRadius: 8, padding: '12 16', marginBottom: 18 },
  petName: { fontSize: 18, fontWeight: 700, color: '#0f172a' },
  petMeta: { fontSize: 10, color: '#64748b', marginTop: 3 },
  statusBadge: { borderRadius: 6, padding: '5 12', fontSize: 9, fontWeight: 700 },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  infoBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 6, padding: '10 12', border: '1 solid #e2e8f0' },
  infoLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  infoValue: { fontSize: 11, fontWeight: 700, color: '#1e293b' },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, borderBottom: '1 solid #e2e8f0', paddingBottom: 5 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metricItem: { width: '30%', backgroundColor: '#f8fafc', borderRadius: 5, padding: '7 10', border: '1 solid #e2e8f0' },
  metricName: { fontSize: 8, color: '#94a3b8', marginBottom: 3 },
  metricValue: { fontSize: 11, fontWeight: 700, color: '#1e293b' },
  metricComment: { fontSize: 8, color: '#64748b', marginTop: 2 },

  activitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#d1fae5', borderRadius: 5, padding: '4 10', fontSize: 9, color: '#065f46' },

  ownerBox: { backgroundColor: '#eff6ff', borderRadius: 6, padding: '10 14', border: '1 solid #bfdbfe' },
  ownerText: { fontSize: 10, color: '#1e40af', lineHeight: 1.5 },

  alertBox: { backgroundColor: '#fff7ed', borderRadius: 6, padding: '10 14', marginBottom: 8, border: '1 solid #fed7aa' },
  alertObs: { fontSize: 10, color: '#9a3412' },
  alertAction: { fontSize: 9, color: '#78350f', marginTop: 3 },

  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #e2e8f0', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#94a3b8' },
})

const STATUS_LABEL: Record<string, string> = {
  adaptation: 'Адаптация', calm: 'Спокойный день', active: 'Активный день', needs_control: 'Нужен контроль',
}
const STATUS_BG: Record<string, string> = {
  adaptation: '#fef3c7', calm: '#dcfce7', active: '#e0f2fe', needs_control: '#fee2e2',
}
const STATUS_COLOR: Record<string, string> = {
  adaptation: '#92400e', calm: '#166534', active: '#075985', needs_control: '#991b1b',
}
const METRIC_LABEL: Record<string, string> = {
  appetite: 'Аппетит', water: 'Вода', toilet: 'Туалет',
  activity: 'Активность', mood: 'Настроение', contact: 'Контакт',
}

interface ReportData {
  id: string
  date: string
  dayStatus: string
  ownerText?: string
  employee: { name: string }
  stay: { cage: { number: string; zone: string }; pet: { name: string; species: string; breed?: string } }
  metrics: { category: string; value: string; comment?: string }[]
  activities: { activityType: string; completed: boolean }[]
  observations: { observation: string; action?: string; notifyOwner: boolean }[]
}

export default function ReportPDF({ report }: { report: ReportData }) {
  const alerts = report.observations.filter((o) => o.notifyOwner)
  const done = report.activities.filter((a) => a.completed)
  const dateStr = new Date(report.date).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.hotelName}>Pet Hotel</Text>
            <Text style={s.hotelSub}>Ежедневный отчёт о питомце</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>Дата отчёта</Text>
            <Text style={s.headerDate}>{dateStr}</Text>
          </View>
        </View>

        {/* Pet row */}
        <View style={s.petRow}>
          <View>
            <Text style={s.petName}>{report.stay.pet.name}</Text>
            <Text style={s.petMeta}>
              {report.stay.pet.species}{report.stay.pet.breed ? ` · ${report.stay.pet.breed}` : ''}
            </Text>
          </View>
          <Text style={[s.statusBadge, { backgroundColor: STATUS_BG[report.dayStatus] ?? '#f1f5f9', color: STATUS_COLOR[report.dayStatus] ?? '#475569' }]}>
            {STATUS_LABEL[report.dayStatus] ?? report.dayStatus}
          </Text>
        </View>

        {/* Info boxes */}
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Клетка</Text>
            <Text style={s.infoValue}>№{report.stay.cage.number} · {report.stay.cage.zone}</Text>
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Сотрудник</Text>
            <Text style={s.infoValue}>{report.employee.name}</Text>
          </View>
        </View>

        {/* Owner message */}
        {report.ownerText && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Сообщение сотрудника</Text>
            <View style={s.ownerBox}>
              <Text style={s.ownerText}>{report.ownerText}</Text>
            </View>
          </View>
        )}

        {/* Metrics */}
        {report.metrics.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Показатели дня</Text>
            <View style={s.metricsGrid}>
              {report.metrics.map((m) => (
                <View key={m.category} style={s.metricItem}>
                  <Text style={s.metricName}>{METRIC_LABEL[m.category] ?? m.category}</Text>
                  <Text style={s.metricValue}>{m.value}</Text>
                  {m.comment ? <Text style={s.metricComment}>{m.comment}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activities */}
        {done.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Активности</Text>
            <View style={s.activitiesRow}>
              {done.map((a) => (
                <Text key={a.activityType} style={s.chip}>✓ {a.activityType}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>⚠ Важные наблюдения</Text>
            {alerts.map((o, i) => (
              <View key={i} style={s.alertBox}>
                <Text style={s.alertObs}>{o.observation}</Text>
                {o.action ? <Text style={s.alertAction}>Действие: {o.action}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Pet Hotel · {dateStr}</Text>
          <Text style={s.footerText}>ID: {report.id.slice(0, 8)}</Text>
        </View>
      </Page>
    </Document>
  )
}

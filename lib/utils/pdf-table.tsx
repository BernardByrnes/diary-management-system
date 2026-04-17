import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

export type PdfColumn = { label: string; key: string }
export type PdfRow = Record<string, string>

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  header: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logo: { width: 32, height: 32, marginRight: 8 },
  orgName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#15803d' },
  reportTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  meta: { fontSize: 8, color: '#6b7280' },
  divider: { borderBottomWidth: 1.5, borderBottomColor: '#15803d', marginVertical: 10 },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#15803d',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#ffffff',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  tableCell: { flex: 1, color: '#374151', fontSize: 8 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#9ca3af' },
})

export function TablePDF({
  title,
  period,
  columns,
  rows,
}: {
  title: string
  period?: string
  columns: PdfColumn[]
  rows: PdfRow[]
}) {
  const now = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Document title={title} author="Bwera Farmers Cooperative">
      <Page size="A4" orientation={columns.length > 6 ? 'landscape' : 'portrait'} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Image src="/image-better.png" style={styles.logo} />
            <Text style={styles.orgName}>Bwera Farmers Cooperative</Text>
          </View>
          <Text style={styles.reportTitle}>{title}</Text>
          {period && <Text style={styles.meta}>{period}</Text>}
          <Text style={styles.meta}>Generated: {now}</Text>
          <View style={styles.divider} />
        </View>

        {/* Table */}
        <View>
          <View style={styles.tableHeaderRow}>
            {columns.map((col) => (
              <Text key={col.key} style={styles.tableHeaderCell}>
                {col.label}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              {columns.map((col) => (
                <Text key={col.key} style={styles.tableCell}>
                  {row[col.key] ?? ''}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{rows.length} records</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Bwera Farmers Cooperative — Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

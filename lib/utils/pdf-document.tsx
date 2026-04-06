import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthlyReportData = {
  period: string
  totalRevenue: number
  totalMilkCosts: number
  totalExpenses: number
  netProfit: number
  branchStats: {
    name: string
    revenue: number
    milkCost: number
    expenses: number
    netProfit: number
  }[]
  topSuppliers: {
    name: string
    liters: number
    cost: number
  }[]
  paymentSummary: {
    CALCULATED: { count: number; total: number }
    APPROVED: { count: number; total: number }
    PAID: { count: number; total: number }
  }
  outstandingSupplier: number
  outstandingOwner: number
  categoryBreakdown: { category: string; amount: number }[]
}

export type BranchReportData = {
  period: string
  stats: {
    name: string
    revenue: number
    milkCost: number
    expenses: number
    grossProfit: number
    netProfit: number
  }[]
  totals: {
    revenue: number
    milkCost: number
    expenses: number
    grossProfit: number
    netProfit: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatPDFMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `UGX ${(amount / 1_000_000).toFixed(2)}M`
  }
  return `UGX ${amount.toLocaleString('en-UG')}`
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  // Header
  header: {
    marginBottom: 12,
  },
  orgName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    marginBottom: 2,
  },
  reportTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  period: {
    fontSize: 9,
    color: '#6b7280',
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#15803d',
    marginVertical: 10,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    marginVertical: 6,
  },
  // Sections
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Key-value rows
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  kvLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    flex: 1,
  },
  kvValue: {
    color: '#111827',
    textAlign: 'right',
    flex: 1,
  },
  kvValueGreen: {
    color: '#15803d',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    flex: 1,
  },
  kvValueRed: {
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    flex: 1,
  },
  // Tables
  table: {
    width: '100%',
  },
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
  tableHeaderCellRight: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#ffffff',
    flex: 1,
    textAlign: 'right',
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
  tableRowTotals: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: '#ecfdf5',
    borderTopWidth: 1,
    borderTopColor: '#15803d',
  },
  tableCell: {
    flex: 1,
    color: '#374151',
  },
  tableCellBold: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
    color: '#374151',
  },
  tableCellRightBold: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  tableCellGreen: {
    flex: 1,
    textAlign: 'right',
    color: '#15803d',
    fontFamily: 'Helvetica-Bold',
  },
  tableCellRed: {
    flex: 1,
    textAlign: 'right',
    color: '#dc2626',
    fontFamily: 'Helvetica-Bold',
  },
  // Footer
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
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
})

// ─── Shared Components ────────────────────────────────────────────────────────

function PDFHeader({ title, period }: { title: string; period: string }) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Image
          src="/bwera logo.png"
          style={{ width: 36, height: 36 }}
        />
        <Text style={styles.orgName}>Bwera Cooperative Dairy</Text>
      </View>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.period}>{period}</Text>
      <View style={styles.divider} />
    </View>
  )
}

function PDFFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Generated: {new Date().toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Bwera Dairy System — Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  )
}

// ─── Monthly Report PDF ───────────────────────────────────────────────────────

export function MonthlyReportPDF({ data }: { data: MonthlyReportData }) {
  const totalOutstanding = data.outstandingSupplier + data.outstandingOwner

  return (
    <Document title={`Monthly Summary — ${data.period}`} author="Bwera Dairy System">
      <Page size="A4" style={styles.page}>
        <PDFHeader title="Monthly Summary Report" period={data.period} />

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Total Revenue</Text>
            <Text style={styles.kvValueGreen}>{formatPDFMoney(data.totalRevenue)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Milk Costs</Text>
            <Text style={styles.kvValue}>{formatPDFMoney(data.totalMilkCosts)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Operating Expenses</Text>
            <Text style={styles.kvValue}>{formatPDFMoney(data.totalExpenses)}</Text>
          </View>
          <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.kvLabel}>Net Profit</Text>
            <Text style={data.netProfit >= 0 ? styles.kvValueGreen : styles.kvValueRed}>
              {formatPDFMoney(data.netProfit)}
            </Text>
          </View>
        </View>

        <View style={styles.thinDivider} />

        {/* Branch Breakdown */}
        {data.branchStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Branch Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Branch</Text>
                <Text style={styles.tableHeaderCellRight}>Revenue</Text>
                <Text style={styles.tableHeaderCellRight}>Milk Costs</Text>
                <Text style={styles.tableHeaderCellRight}>Expenses</Text>
                <Text style={styles.tableHeaderCellRight}>Net Profit</Text>
              </View>
              {data.branchStats.map((b, i) => (
                <View key={b.name} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCellBold, { flex: 2 }]}>{b.name}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(b.revenue)}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(b.milkCost)}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(b.expenses)}</Text>
                  <Text style={b.netProfit >= 0 ? styles.tableCellGreen : styles.tableCellRed}>
                    {formatPDFMoney(b.netProfit)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.thinDivider} />

        {/* Top Suppliers */}
        {data.topSuppliers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Suppliers by Volume</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Supplier</Text>
                <Text style={styles.tableHeaderCellRight}>Liters</Text>
                <Text style={styles.tableHeaderCellRight}>Total Cost</Text>
              </View>
              {data.topSuppliers.map((s, i) => (
                <View key={s.name} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{s.name}</Text>
                  <Text style={styles.tableCellRight}>
                    {s.liters.toLocaleString('en-UG', { maximumFractionDigits: 1 })} L
                  </Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(s.cost)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.thinDivider} />

        {/* Payment Status & Advances (side by side) */}
        <View style={[styles.section, { flexDirection: 'row', gap: 16 }]}>
          {/* Payment Status */}
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Payment Status</Text>
            {(['CALCULATED', 'APPROVED', 'PAID'] as const).map((status) => {
              const info = data.paymentSummary[status]
              return (
                <View key={status} style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{status.charAt(0) + status.slice(1).toLowerCase()}</Text>
                  <Text style={styles.kvValue}>
                    {info.count} · {formatPDFMoney(info.total)}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Outstanding Advances */}
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Outstanding Advances</Text>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Supplier advances</Text>
              <Text style={styles.kvValueRed}>{formatPDFMoney(data.outstandingSupplier)}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Owner advances</Text>
              <Text style={styles.kvValueRed}>{formatPDFMoney(data.outstandingOwner)}</Text>
            </View>
            <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.kvLabel}>Total outstanding</Text>
              <Text style={styles.kvValueRed}>{formatPDFMoney(totalOutstanding)}</Text>
            </View>
          </View>
        </View>

        {/* Expense Categories */}
        {data.categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Categories</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Category</Text>
                <Text style={styles.tableHeaderCellRight}>Amount</Text>
                <Text style={styles.tableHeaderCellRight}>% of Expenses</Text>
              </View>
              {data.categoryBreakdown.map((c, i) => (
                <View key={c.category} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{c.category}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(c.amount)}</Text>
                  <Text style={styles.tableCellRight}>
                    {data.totalExpenses > 0
                      ? `${((c.amount / data.totalExpenses) * 100).toFixed(1)}%`
                      : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <PDFFooter />
      </Page>
    </Document>
  )
}

// ─── Branch Report PDF ────────────────────────────────────────────────────────

export function BranchReportPDF({ data }: { data: BranchReportData }) {
  return (
    <Document title={`Branch Performance — ${data.period}`} author="Bwera Dairy System">
      <Page size="A4" style={styles.page}>
        <PDFHeader title="Branch Performance Report" period={data.period} />

        {/* Totals Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Summary</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Total Revenue</Text>
            <Text style={styles.kvValueGreen}>{formatPDFMoney(data.totals.revenue)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Total Milk Costs</Text>
            <Text style={styles.kvValue}>{formatPDFMoney(data.totals.milkCost)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Total Expenses</Text>
            <Text style={styles.kvValue}>{formatPDFMoney(data.totals.expenses)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Gross Profit</Text>
            <Text style={data.totals.grossProfit >= 0 ? styles.kvValueGreen : styles.kvValueRed}>
              {formatPDFMoney(data.totals.grossProfit)}
            </Text>
          </View>
          <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.kvLabel}>Net Profit</Text>
            <Text style={data.totals.netProfit >= 0 ? styles.kvValueGreen : styles.kvValueRed}>
              {formatPDFMoney(data.totals.netProfit)}
            </Text>
          </View>
        </View>

        <View style={styles.thinDivider} />

        {/* Per-Branch Table */}
        {data.stats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Per-Branch Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Branch</Text>
                <Text style={styles.tableHeaderCellRight}>Revenue</Text>
                <Text style={styles.tableHeaderCellRight}>Milk Costs</Text>
                <Text style={styles.tableHeaderCellRight}>Expenses</Text>
                <Text style={styles.tableHeaderCellRight}>Gross Profit</Text>
                <Text style={styles.tableHeaderCellRight}>Net Profit</Text>
              </View>
              {data.stats.map((s, i) => (
                <View key={s.name} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCellBold, { flex: 2 }]}>{s.name}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(s.revenue)}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(s.milkCost)}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(s.expenses)}</Text>
                  <Text style={s.grossProfit >= 0 ? styles.tableCellGreen : styles.tableCellRed}>
                    {formatPDFMoney(s.grossProfit)}
                  </Text>
                  <Text style={s.netProfit >= 0 ? styles.tableCellGreen : styles.tableCellRed}>
                    {formatPDFMoney(s.netProfit)}
                  </Text>
                </View>
              ))}
              {/* Totals row */}
              <View style={styles.tableRowTotals}>
                <Text style={[styles.tableCellBold, { flex: 2 }]}>TOTALS</Text>
                <Text style={styles.tableCellRightBold}>{formatPDFMoney(data.totals.revenue)}</Text>
                <Text style={styles.tableCellRightBold}>{formatPDFMoney(data.totals.milkCost)}</Text>
                <Text style={styles.tableCellRightBold}>{formatPDFMoney(data.totals.expenses)}</Text>
                <Text style={data.totals.grossProfit >= 0 ? styles.tableCellGreen : styles.tableCellRed}>
                  {formatPDFMoney(data.totals.grossProfit)}
                </Text>
                <Text style={data.totals.netProfit >= 0 ? styles.tableCellGreen : styles.tableCellRed}>
                  {formatPDFMoney(data.totals.netProfit)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <PDFFooter />
      </Page>
    </Document>
  )
}

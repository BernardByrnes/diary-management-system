import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Nunito',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshRTM.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDFwmRTM.ttf', fontWeight: 700 },
  ],
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeliveryDetail = {
  date: string
  supplierName: string
  liters: number
  cost: number
}

export type DepositDetail = {
  date: string
  amount: number
  bankName: string
  referenceNumber: string
  hasDiscrepancy: boolean
  discrepancyNote: string | null
}

export type ExpenseDetail = {
  date: string
  category: string
  description: string
  amount: number
  paymentMethod: string
}

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

/** Comprehensive single-branch report for ED / sharing with branch owner */
export type BranchSummaryReportData = {
  periodLabel: string
  branch: { name: string; location: string; isActive: boolean }
  owner: { fullName: string; phone: string }
  managers: { fullName: string }[]
  financials: {
    revenue: number
    milkCost: number
    expenses: number
    grossProfit: number
    netProfit: number
  }
  volumes: { milkLitersIn: number; milkLitersSold: number }
  suppliersByVolume: { name: string; liters: number; cost: number }[]
  expensesByCategory: { category: string; amount: number }[]
  banking: {
    depositCount: number
    totalDeposited: number
    discrepancyCount: number
  }
  transfersOutgoing: {
    date: string
    liters: number
    otherBranch: string
    status: string
  }[]
  transfersIncoming: {
    date: string
    liters: number
    otherBranch: string
    status: string
  }[]
  operations: {
    spoilageLiters: number
    lactometerReadingsBelowMin: number
  }
  deliveries: DeliveryDetail[]
  deposits: DepositDetail[]
  expenses: ExpenseDetail[]
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
    fontFamily: 'Nunito',
    fontSize: 8.5,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  pageLandscape: {
    fontFamily: 'Nunito',
    fontSize: 8,
    color: '#1a1a1a',
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 28,
  },
  header: {
    marginBottom: 10,
  },
  orgName: {
    fontSize: 18,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#15803d',
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 3,
  },
  period: {
    fontSize: 9,
    color: '#6b7280',
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#15803d',
    marginVertical: 10,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    marginVertical: 6,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#15803d',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleSecondary: {
    fontSize: 9,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    paddingBottom: 3,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  kvLabel: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#374151',
    flex: 1,
    fontSize: 8.5,
  },
  kvValue: {
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    fontSize: 8.5,
  },
  kvValueGreen: {
    color: '#15803d',
    fontFamily: 'Nunito',
    fontWeight: 700,
    textAlign: 'right',
    flex: 1,
    fontSize: 8.5,
  },
  kvValueRed: {
    color: '#dc2626',
    fontFamily: 'Nunito',
    fontWeight: 700,
    textAlign: 'right',
    flex: 1,
    fontSize: 8.5,
  },
  table: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#166534',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 7.5,
    color: '#ffffff',
    flex: 1,
  },
  tableHeaderCellRight: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 7.5,
    color: '#ffffff',
    flex: 1,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f0fdf4',
  },
  tableRowTotals: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: '#dcfce7',
    borderTopWidth: 1.5,
    borderTopColor: '#15803d',
  },
  tableCell: {
    flex: 1,
    color: '#374151',
    fontSize: 8,
  },
  tableCellBold: {
    flex: 1,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#111827',
    fontSize: 8,
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
    color: '#374151',
    fontSize: 8,
  },
  tableCellRightBold: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#111827',
    fontSize: 8,
  },
  tableCellGreen: {
    flex: 1,
    textAlign: 'right',
    color: '#15803d',
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 8,
  },
  tableCellRed: {
    flex: 1,
    textAlign: 'right',
    color: '#dc2626',
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 8,
  },
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
  badge: {
    fontSize: 6.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 0.5,
    borderColor: '#bbf7d0',
    padding: 6,
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 7.5,
    color: '#166534',
    lineHeight: 1.4,
  },
})

// ─── Shared Components ────────────────────────────────────────────────────────

function PDFHeader({ title, period }: { title: string; period: string }) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Image
          src="/image-better.png"
          style={{ width: 36, height: 36 }}
        />
        <Text style={styles.orgName}>Bwera Farmers Cooperative</Text>
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
          `Bwera Farmers Cooperative — Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  )
}

// ─── Monthly Report PDF ───────────────────────────────────────────────────────

export function MonthlyReportPDF({ data }: { data: MonthlyReportData }) {
  const totalOutstanding = data.outstandingSupplier + data.outstandingOwner

  return (
    <Document title={`Monthly Summary — ${data.period}`} author="Bwera Farmers Cooperative">
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
    <Document title={`Branch Performance — ${data.period}`} author="Bwera Farmers Cooperative">
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

function shortPdfDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ─── Branch Summary PDF (per branch, comprehensive) ───────────────────────────

export function BranchSummaryPDF({ data }: { data: BranchSummaryReportData }) {
  const f = data.financials
  const mgrLine =
    data.managers.length > 0 ? data.managers.map((m) => m.fullName).join(', ') : '—'

  return (
    <Document
      title={`Branch Summary — ${data.branch.name}`}
      author="Bwera Farmers Cooperative"
    >
      {/* PAGE 1: Overview */}
      <Page size="A4" style={styles.page}>
        <PDFHeader title="Branch Summary Report" period={data.periodLabel} />

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            {data.branch.name} · {data.branch.location} · {data.branch.isActive ? 'Active Branch' : 'Inactive'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleSecondary}>Contact Information</Text>
          <View style={{ marginLeft: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 8, marginBottom: 2, color: '#374151' }}>
              Owner: {data.owner.fullName} · {data.owner.phone}
            </Text>
            <Text style={{ fontSize: 8, color: '#6b7280' }}>
              Managers: {mgrLine}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Performance</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Revenue (Sales)</Text>
            <Text style={styles.kvValueGreen}>{formatPDFMoney(f.revenue)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Milk Purchase Costs</Text>
            <Text style={styles.kvValue}>{formatPDFMoney(f.milkCost)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Operating Expenses</Text>
            <Text style={styles.kvValue}>{formatPDFMoney(f.expenses)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Gross Profit</Text>
            <Text style={f.grossProfit >= 0 ? styles.kvValueGreen : styles.kvValueRed}>
              {formatPDFMoney(f.grossProfit)}
            </Text>
          </View>
          <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.kvLabel}>Net Profit</Text>
            <Text style={f.netProfit >= 0 ? styles.kvValueGreen : styles.kvValueRed}>
              {formatPDFMoney(f.netProfit)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume Summary</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Milk Received (Liters)</Text>
            <Text style={styles.kvValue}>
              {data.volumes.milkLitersIn.toLocaleString('en-UG', { maximumFractionDigits: 1 })} L
            </Text>
          </View>
          <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.kvLabel}>Milk Sold (Liters)</Text>
            <Text style={styles.kvValue}>
              {data.volumes.milkLitersSold.toLocaleString('en-UG', { maximumFractionDigits: 1 })} L
            </Text>
          </View>
        </View>

        {data.suppliersByVolume.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milk by Supplier</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Supplier</Text>
                <Text style={styles.tableHeaderCellRight}>Liters</Text>
                <Text style={styles.tableHeaderCellRight}>Cost</Text>
              </View>
              {data.suppliersByVolume.slice(0, 10).map((s, i) => (
                <View key={`${s.name}-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 2.5 }]}>{s.name}</Text>
                  <Text style={styles.tableCellRight}>
                    {s.liters.toLocaleString('en-UG', { maximumFractionDigits: 1 })} L
                  </Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(s.cost)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.expensesByCategory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expenses by Category</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Category</Text>
                <Text style={styles.tableHeaderCellRight}>Amount</Text>
              </View>
              {data.expensesByCategory.slice(0, 8).map((e, i) => (
                <View key={`${e.category}-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 2.5 }]}>{e.category}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(e.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <PDFFooter />
      </Page>

      {/* PAGE 2: Milk Deliveries (Detailed) */}
      {data.deliveries.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PDFHeader title="Branch Summary Report" period={data.periodLabel} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milk Deliveries (Detailed)</Text>
            <Text style={{ fontSize: 7, color: '#6b7280', marginBottom: 6 }}>
              Showing {Math.min(data.deliveries.length, 50)} most recent deliveries
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>Supplier</Text>
                <Text style={styles.tableHeaderCellRight}>Liters</Text>
                <Text style={styles.tableHeaderCellRight}>Cost</Text>
              </View>
              {data.deliveries.slice(0, 50).map((d, i) => (
                <View key={`del-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 1.8 }]}>{shortPdfDate(d.date)}</Text>
                  <Text style={[styles.tableCell, { flex: 2.2 }]}>{d.supplierName}</Text>
                  <Text style={styles.tableCellRight}>
                    {d.liters.toLocaleString('en-UG', { maximumFractionDigits: 1 })} L
                  </Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(d.cost)}</Text>
                </View>
              ))}
              {data.deliveries.length > 50 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 4 }]}>
                    ... and {data.deliveries.length - 50} more deliveries
                  </Text>
                </View>
              )}
            </View>
          </View>

          <PDFFooter />
        </Page>
      )}

      {/* PAGE 3: Expenses (Detailed) */}
      {data.expenses.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PDFHeader title="Branch Summary Report" period={data.periodLabel} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expenses (Detailed)</Text>
            <Text style={{ fontSize: 7, color: '#6b7280', marginBottom: 6 }}>
              Showing {Math.min(data.expenses.length, 50)} most recent expenses
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>Description</Text>
                <Text style={styles.tableHeaderCellRight}>Amount</Text>
                <Text style={[styles.tableHeaderCellRight, { flex: 0.8 }]}>Method</Text>
              </View>
              {data.expenses.slice(0, 50).map((e, i) => (
                <View key={`exp-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{shortPdfDate(e.date)}</Text>
                  <Text style={[styles.tableCell, { flex: 1.8 }]}>{e.category}</Text>
                  <Text style={[styles.tableCell, { flex: 2.2 }]}>{e.description}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(e.amount)}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{e.paymentMethod}</Text>
                </View>
              ))}
              {data.expenses.length > 50 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 4 }]}>
                    ... and {data.expenses.length - 50} more expenses
                  </Text>
                </View>
              )}
            </View>
          </View>

          <PDFFooter />
        </Page>
      )}

      {/* PAGE 4: Bank Deposits (Detailed) */}
      <Page size="A4" style={styles.page}>
        <PDFHeader title="Branch Summary Report" period={data.periodLabel} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banking Summary</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Deposits Recorded</Text>
            <Text style={styles.kvValue}>{String(data.banking.depositCount)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Total Deposited</Text>
            <Text style={styles.kvValueGreen}>{formatPDFMoney(data.banking.totalDeposited)}</Text>
          </View>
          <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.kvLabel}>With Discrepancy</Text>
            <Text style={data.banking.discrepancyCount > 0 ? styles.kvValueRed : styles.kvValue}>
              {String(data.banking.discrepancyCount)}
            </Text>
          </View>
        </View>

        {data.deposits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Deposits (Detailed)</Text>
            <Text style={{ fontSize: 7, color: '#6b7280', marginBottom: 6 }}>
              Showing {Math.min(data.deposits.length, 50)} most recent deposits
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Bank</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>Reference</Text>
                <Text style={styles.tableHeaderCellRight}>Amount</Text>
                <Text style={[styles.tableHeaderCellRight, { flex: 0.8 }]}>Status</Text>
              </View>
              {data.deposits.slice(0, 50).map((d, i) => (
                <View key={`dep-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{shortPdfDate(d.date)}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{d.bankName}</Text>
                  <Text style={[styles.tableCell, { flex: 1.8 }]}>{d.referenceNumber}</Text>
                  <Text style={styles.tableCellRight}>{formatPDFMoney(d.amount)}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>
                    {d.hasDiscrepancy ? '⚠ Issue' : 'OK'}
                  </Text>
                </View>
              ))}
              {data.deposits.length > 50 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 4 }]}>
                    ... and {data.deposits.length - 50} more deposits
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {(data.transfersOutgoing.length > 0 || data.transfersIncoming.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitleSecondary}>Milk Transfers</Text>
            {data.transfersOutgoing.length > 0 && (
              <>
                <Text style={{ fontSize: 8, fontFamily: 'Nunito', marginBottom: 4, marginTop: 6, color: '#374151' }}>
                  Outgoing Transfers
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>To Branch</Text>
                    <Text style={styles.tableHeaderCellRight}>Liters</Text>
                    <Text style={[styles.tableHeaderCellRight, { flex: 0.9 }]}>Status</Text>
                  </View>
                  {data.transfersOutgoing.map((t, i) => (
                    <View key={`o-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{shortPdfDate(t.date)}</Text>
                      <Text style={[styles.tableCell, { flex: 1.8 }]}>{t.otherBranch}</Text>
                      <Text style={styles.tableCellRight}>{t.liters.toFixed(1)} L</Text>
                      <Text style={[styles.tableCell, { flex: 0.9 }]}>{t.status}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            {data.transfersIncoming.length > 0 && (
              <>
                <Text style={{ fontSize: 8, fontFamily: 'Nunito', marginBottom: 4, marginTop: 8, color: '#374151' }}>
                  Incoming Transfers
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>From Branch</Text>
                    <Text style={styles.tableHeaderCellRight}>Liters</Text>
                    <Text style={[styles.tableHeaderCellRight, { flex: 0.9 }]}>Status</Text>
                  </View>
                  {data.transfersIncoming.map((t, i) => (
                    <View key={`i-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{shortPdfDate(t.date)}</Text>
                      <Text style={[styles.tableCell, { flex: 1.8 }]}>{t.otherBranch}</Text>
                      <Text style={styles.tableCellRight}>{t.liters.toFixed(1)} L</Text>
                      <Text style={[styles.tableCell, { flex: 0.9 }]}>{t.status}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <PDFFooter />
      </Page>

      {/* PAGE 5: Operations & Notes */}
      <Page size="A4" style={styles.page}>
        <PDFHeader title="Branch Summary Report" period={data.periodLabel} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operations</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Spoilage (Liters Recorded)</Text>
            <Text style={styles.kvValue}>
              {data.operations.spoilageLiters.toLocaleString('en-UG', { maximumFractionDigits: 1 })} L
            </Text>
          </View>
          <View style={[styles.kvRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.kvLabel}>Lactometer Readings Below Minimum</Text>
            <Text style={data.operations.lactometerReadingsBelowMin > 0 ? styles.kvValueRed : styles.kvValue}>
              {String(data.operations.lactometerReadingsBelowMin)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleSecondary}>Report Notes</Text>
          <View style={{ marginTop: 6, paddingLeft: 4 }}>
            <Text style={{ fontSize: 8, color: '#374151', marginBottom: 4 }}>
              • All figures cover the period: {data.periodLabel}
            </Text>
            <Text style={{ fontSize: 8, color: '#374151', marginBottom: 4 }}>
              • This report is generated for: {data.branch.name}
            </Text>
            <Text style={{ fontSize: 8, color: '#374151', marginBottom: 4 }}>
              • Owner: {data.owner.fullName}
            </Text>
            {data.operations.spoilageLiters > 0 && (
              <Text style={{ fontSize: 8, color: '#92400e', marginBottom: 4 }}>
                ⚠ Spoilage recorded: {data.operations.spoilageLiters.toLocaleString('en-UG', { maximumFractionDigits: 1 })} L
              </Text>
            )}
            {data.banking.discrepancyCount > 0 && (
              <Text style={{ fontSize: 8, color: '#991b1b', marginBottom: 4 }}>
                ⚠ {data.banking.discrepancyCount} deposit(s) have discrepancy flags
              </Text>
            )}
            {data.operations.lactometerReadingsBelowMin > 0 && (
              <Text style={{ fontSize: 8, color: '#991b1b', marginBottom: 4 }}>
                ⚠ {data.operations.lactometerReadingsBelowMin} lactometer reading(s) below minimum threshold
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.infoBox, { marginTop: 12 }]}>
          <Text style={{ fontSize: 7.5, color: '#166534', lineHeight: 1.5 }}>
            This comprehensive report includes financial performance, volumes, supplier breakdown, detailed deliveries, expenses, banking, transfers, and operational metrics. Share this report with the branch owner as needed for transparency and coordination.
          </Text>
        </View>

        <PDFFooter />
      </Page>
    </Document>
  )
}

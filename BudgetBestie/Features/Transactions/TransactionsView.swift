import SwiftUI
import SwiftData
import Charts
import BudgetKit

/// The money tab: what came in, what went out, and the full ledger underneath.
struct TransactionsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(AppRoute.self) private var route
    @Environment(\.currencyFormat) private var format

    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)])
    private var transactions: [Transaction]

    @State private var range: DateRangeFilter = .thisMonth
    @State private var kindFilter: LedgerFilter = .all

    /// Rows inside the chosen window, before the in/out filter.
    private var windowed: [Transaction] {
        let start = range.startDate()
        return transactions.filter { $0.date >= start }
    }

    private var visible: [Transaction] {
        windowed.filter(kindFilter.matches)
    }

    private var moneyIn: Money {
        windowed.filter { $0.kind == .income }.map(\.amount).total
    }

    private var moneyOut: Money {
        windowed.filter { $0.kind == .expense }.map(\.amount).total
    }

    /// Grouped by day so the list reads like a statement.
    private var sections: [(day: Date, rows: [Transaction])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: visible) { calendar.startOfDay(for: $0.date) }
        return grouped
            .map { (day: $0.key, rows: $0.value.sorted { $0.createdAt > $1.createdAt }) }
            .sorted { $0.day > $1.day }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: Theme.Spacing.large) {
                    rangePicker
                    inOutCard

                    if visible.isEmpty {
                        emptyState
                    } else {
                        ForEach(sections, id: \.day) { section in
                            daySection(section)
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.vertical, Theme.Spacing.medium)
            }
            .background(Palette.background)
            .navigationTitle("Your money")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        route.addTransaction()
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .accessibilityLabel("Add a transaction")
                }
            }
        }
    }

    // MARK: - Pieces

    private var rangePicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.small) {
                ForEach(DateRangeFilter.allCases) { candidate in
                    ChipButton(
                        title: candidate.title,
                        isSelected: range == candidate
                    ) {
                        range = candidate
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var inOutCard: some View {
        VStack(spacing: Theme.Spacing.medium) {
            HStack(spacing: Theme.Spacing.medium) {
                totalTile(title: "money in", amount: moneyIn, color: Palette.positive, filter: .incomeOnly)
                totalTile(title: "money out", amount: moneyOut, color: Palette.negative, filter: .expensesOnly)
            }

            InOutChart(points: dailyTotals)
                .frame(height: 130)
        }
        .card()
    }

    private func totalTile(
        title: String,
        amount: Money,
        color: Color,
        filter: LedgerFilter
    ) -> some View {
        Button {
            kindFilter = kindFilter == filter ? .all : filter
        } label: {
            VStack(spacing: 4) {
                Text(title)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                AmountText(amount: amount, font: Theme.Font.headline, color: color)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Theme.Spacing.small)
            .background(kindFilter == filter ? color.opacity(0.14) : Palette.surfaceMuted)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.chip, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func daySection(_ section: (day: Date, rows: [Transaction])) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(
                title: section.day.formatted(.dateTime.weekday(.wide).month().day()),
                trailing: format.string(from: dayNet(section.rows), showsSign: true)
            )
            VStack(spacing: 0) {
                ForEach(section.rows, id: \.id) { transaction in
                    Button {
                        route.edit(transaction)
                    } label: {
                        TransactionRow(transaction: transaction)
                    }
                    .buttonStyle(.plain)
                    // The ledger is a scrolling stack rather than a List, so
                    // long-press stands in for swipe-to-delete.
                    .contextMenu {
                        Button("Edit", systemImage: "pencil") {
                            route.edit(transaction)
                        }
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            BudgetStore(context: modelContext).delete(transaction)
                        }
                    }

                    if transaction.id != section.rows.last?.id {
                        Divider().overlay(Palette.separator)
                    }
                }
            }
            .card()
        }
    }

    private func dayNet(_ rows: [Transaction]) -> Money {
        rows.map(\.signedAmount).total
    }

    /// Money in and out per day, for the bar chart.
    private var dailyTotals: [InOutPoint] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: windowed) { calendar.startOfDay(for: $0.date) }
        return grouped
            .map { day, rows in
                InOutPoint(
                    day: day,
                    incoming: rows.filter { $0.kind == .income }.map(\.amount).total,
                    outgoing: rows.filter { $0.kind == .expense }.map(\.amount).total
                )
            }
            .sorted { $0.day < $1.day }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.small) {
            Text("🧾")
                .font(.system(size: 44))
            Text("Nothing here yet")
                .font(Theme.Font.headline)
                .foregroundStyle(Palette.textPrimary)
            Text("Tap + to record what you spent.")
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Spacing.section)
        .card()
    }
}

/// The in/out filter applied by tapping one of the two totals.
enum LedgerFilter {
    case all
    case incomeOnly
    case expensesOnly

    func matches(_ transaction: Transaction) -> Bool {
        switch self {
        case .all: return true
        case .incomeOnly: return transaction.kind == .income
        case .expensesOnly: return transaction.kind == .expense
        }
    }
}

/// The window the money tab and the recap both look at.
enum DateRangeFilter: String, CaseIterable, Identifiable {
    case thisWeek
    case thisMonth
    case threeMonths
    case allTime

    var id: String { rawValue }

    var title: String {
        switch self {
        case .thisWeek: return "This week"
        case .thisMonth: return "This month"
        case .threeMonths: return "3 months"
        case .allTime: return "All time"
        }
    }

    func startDate(from now: Date = Date(), calendar: Calendar = .current) -> Date {
        switch self {
        case .thisWeek:
            return calendar.date(byAdding: .day, value: -7, to: now) ?? now
        case .thisMonth:
            return calendar.dateInterval(of: .month, for: now)?.start ?? now
        case .threeMonths:
            return calendar.date(byAdding: .day, value: -90, to: now) ?? now
        case .allTime:
            return .distantPast
        }
    }
}

#Preview {
    TransactionsView()
        .environment(AppRoute())
        .modelContainer(AppModelContainer.makePreview())
}

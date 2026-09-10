import SwiftUI
import BudgetKit

/// A month laid out as a 7-column grid, each day tinted by its spend-free
/// status, with a dot under days that have a bill due.
struct MonthCalendarGrid: View {
    var month: Date
    var statuses: [Date: SpendFreeStatus]
    /// Days to flag with an accent dot, e.g. upcoming bills.
    var markedDays: Set<Date> = []

    private var calendar: Calendar { .current }
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)

    /// Leading blanks so the 1st lands under the right weekday.
    private var leadingBlanks: Int {
        guard let first = calendar.dateInterval(of: .month, for: month)?.start else { return 0 }
        let weekday = calendar.component(.weekday, from: first)
        return (weekday - calendar.firstWeekday + 7) % 7
    }

    private var days: [Date] {
        guard let interval = calendar.dateInterval(of: .month, for: month),
              let count = calendar.range(of: .day, in: .month, for: month)?.count else {
            return []
        }
        return (0..<count).compactMap {
            calendar.date(byAdding: .day, value: $0, to: interval.start)
        }
    }

    private var weekdaySymbols: [String] {
        let symbols = calendar.veryShortStandaloneWeekdaySymbols
        let offset = calendar.firstWeekday - 1
        return Array(symbols[offset...] + symbols[..<offset])
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                ForEach(Array(weekdaySymbols.enumerated()), id: \.offset) { _, symbol in
                    Text(symbol)
                        .font(Theme.Font.caption)
                        .foregroundStyle(Palette.textSecondary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(0..<leadingBlanks, id: \.self) { _ in
                    Color.clear.frame(height: 38)
                }
                ForEach(days, id: \.self) { day in
                    dayCell(day)
                }
            }
        }
    }

    private func dayCell(_ day: Date) -> some View {
        let start = calendar.startOfDay(for: day)
        let status = statuses[start] ?? .untracked
        let isToday = calendar.isDateInToday(day)

        return VStack(spacing: 3) {
            Text("\(calendar.component(.day, from: day))")
                .font(Theme.Font.caption)
                .foregroundStyle(foreground(for: status))
            Circle()
                .fill(markedDays.contains(start) ? Palette.accent : .clear)
                .frame(width: 4, height: 4)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 38)
        .background(background(for: status))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(isToday ? Palette.accent : .clear, lineWidth: 2)
        )
        .accessibilityLabel(accessibilityLabel(day: day, status: status))
    }

    private func background(for status: SpendFreeStatus) -> Color {
        switch status {
        case .spendFree: return Palette.spendFree.opacity(0.22)
        case .spent: return Palette.spendBroken.opacity(0.22)
        case .upcoming, .untracked: return Palette.surfaceMuted.opacity(0.6)
        }
    }

    private func foreground(for status: SpendFreeStatus) -> Color {
        switch status {
        case .spendFree, .spent: return Palette.textPrimary
        case .upcoming, .untracked: return Palette.textSecondary
        }
    }

    private func accessibilityLabel(day: Date, status: SpendFreeStatus) -> String {
        let dayText = day.formatted(.dateTime.month().day())
        switch status {
        case .spendFree: return "\(dayText), spend-free"
        case .spent: return "\(dayText), you spent"
        case .upcoming: return "\(dayText), upcoming"
        case .untracked: return dayText
        }
    }
}

#Preview {
    let today = Date()
    let calendar = Calendar.current
    var statuses: [Date: SpendFreeStatus] = [:]
    for offset in 0..<20 {
        if let day = calendar.date(byAdding: .day, value: -offset, to: today) {
            statuses[calendar.startOfDay(for: day)] = offset % 4 == 0 ? .spent : .spendFree
        }
    }
    return MonthCalendarGrid(month: today, statuses: statuses)
        .padding()
        .background(Palette.surface)
}

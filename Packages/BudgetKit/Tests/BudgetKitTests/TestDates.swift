import Foundation
@testable import BudgetKit

/// Builds dates in the fixed UTC calendar the tests share, so results do not
/// change with the machine's timezone.
func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
    var components = DateComponents()
    components.year = year
    components.month = month
    components.day = day
    guard let value = CycleCalendar.utc.calendar.date(from: components) else {
        fatalError("Invalid test date \(year)-\(month)-\(day)")
    }
    return value
}

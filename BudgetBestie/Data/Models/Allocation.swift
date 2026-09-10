import Foundation
import SwiftData
import BudgetKit

/// How much one budget put into one envelope.
///
/// Allocations are never deleted when a cycle ends: together they are the
/// "budget update history" shown on an envelope's detail screen, and the record
/// of what was suggested versus what the user actually chose.
@Model
final class Allocation {
    var id: UUID = UUID()
    var amountMinorUnits: Int = 0
    /// What the engine recommended at the time, kept so history can show both.
    var suggestedMinorUnits: Int = 0
    var createdAt: Date = Date()

    var envelope: Envelope?
    var cycle: BudgetCycle?

    init(
        amount: Money,
        suggested: Money = .zero,
        envelope: Envelope? = nil,
        cycle: BudgetCycle? = nil,
        createdAt: Date = Date()
    ) {
        self.id = UUID()
        self.amountMinorUnits = amount.minorUnits
        self.suggestedMinorUnits = suggested.minorUnits
        self.envelope = envelope
        self.cycle = cycle
        self.createdAt = createdAt
    }

    var amount: Money {
        get { Money(minorUnits: amountMinorUnits) }
        set { amountMinorUnits = newValue.minorUnits }
    }

    var suggested: Money {
        get { Money(minorUnits: suggestedMinorUnits) }
        set { suggestedMinorUnits = newValue.minorUnits }
    }

    /// How far the user's choice sat from the recommendation, for insights.
    var varianceFromSuggestion: Money {
        amount - suggested
    }
}

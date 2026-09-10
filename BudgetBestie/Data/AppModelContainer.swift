import Foundation
import SwiftData

/// Builds the app's SwiftData stack.
///
/// Everything lives on-device; there is no CloudKit container and no account, so
/// a fresh install starts empty and deleting the app takes the data with it.
enum AppModelContainer {
    static let schema = Schema([
        Envelope.self,
        Transaction.self,
        Allocation.self,
        BudgetCycle.self,
        AppSettings.self
    ])

    /// The on-disk store the app runs against.
    static func makeShared() -> ModelContainer {
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            // A store that cannot be opened is unrecoverable at launch. Falling
            // back to memory keeps the app usable long enough to show the error
            // rather than crashing on a cold start.
            assertionFailure("Could not open the on-disk store: \(error)")
            return makeInMemory()
        }
    }

    /// An empty in-memory store, used by previews and tests.
    static func makeInMemory() -> ModelContainer {
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Could not create the in-memory store: \(error)")
        }
    }

    /// An in-memory store already filled with a realistic budget, so every
    /// SwiftUI preview has something to draw.
    @MainActor
    static func makePreview() -> ModelContainer {
        let container = makeInMemory()
        SeedData.populate(context: container.mainContext)
        return container
    }
}

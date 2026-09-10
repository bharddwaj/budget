import SwiftUI
import SwiftData

@main
struct BudgetBestieApp: App {
    private let container = AppModelContainer.makeShared()

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
    }
}

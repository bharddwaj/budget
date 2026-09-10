import SwiftUI
import SwiftData

/// The four tabs: your envelopes, your ledger, the spend-free calendar, and the
/// recap. Every sheet the app presents is owned here so any tab can open the
/// add-transaction keypad or the budget flow.
struct MainTabView: View {
    @State private var selection: Tab = .home
    @State private var route = AppRoute()

    enum Tab: Hashable {
        case home
        case transactions
        case calendar
        case insights
    }

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label("Envelopes", systemImage: "tray.full.fill") }
                .tag(Tab.home)

            TransactionsView()
                .tabItem { Label("Money", systemImage: "list.bullet") }
                .tag(Tab.transactions)

            OverviewCalendarView()
                .tabItem { Label("Overview", systemImage: "calendar") }
                .tag(Tab.calendar)

            InsightsView()
                .tabItem { Label("Recap", systemImage: "chart.pie.fill") }
                .tag(Tab.insights)
        }
        .tint(Palette.accent)
        .environment(route)
        .sheet(isPresented: $route.isAddingTransaction) {
            TransactionEditorSheet(editing: route.editingTransaction)
        }
        .sheet(isPresented: $route.isCreatingEnvelope) {
            EnvelopeEditorSheet(editing: route.editingEnvelope)
        }
        .sheet(isPresented: $route.isTransferring) {
            TransferSheet()
        }
        .sheet(isPresented: $route.isArrangingEnvelopes) {
            ArrangeEnvelopesSheet()
        }
        .fullScreenCover(isPresented: $route.isBudgeting) {
            BudgetFlowView()
        }
        .sheet(isPresented: $route.isShowingSettings) {
            SettingsView()
        }
    }
}

/// Shared presentation state, so a button on any screen can open any flow
/// without each screen owning its own copy of the same sheet.
@Observable
final class AppRoute {
    var isAddingTransaction = false
    var isCreatingEnvelope = false
    var isTransferring = false
    var isArrangingEnvelopes = false
    var isBudgeting = false
    var isShowingSettings = false

    /// Set alongside `isAddingTransaction` to edit rather than create.
    var editingTransaction: Transaction?
    var editingEnvelope: Envelope?

    func addTransaction() {
        editingTransaction = nil
        isAddingTransaction = true
    }

    func edit(_ transaction: Transaction) {
        editingTransaction = transaction
        isAddingTransaction = true
    }

    func createEnvelope() {
        editingEnvelope = nil
        isCreatingEnvelope = true
    }

    func edit(_ envelope: Envelope) {
        editingEnvelope = envelope
        isCreatingEnvelope = true
    }
}

#Preview {
    MainTabView()
        .modelContainer(AppModelContainer.makePreview())
}

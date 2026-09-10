import SwiftUI
import SwiftData
import BudgetKit

/// Decides what the app shows at launch and applies the user's settings to the
/// whole tree: their theme, their currency formatting, and the Face ID gate.
struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var settingsRows: [AppSettings]

    @State private var isUnlocked = false
    @State private var hasPreparedStore = false

    private var settings: AppSettings? { settingsRows.first }

    var body: some View {
        Group {
            if let settings {
                content(for: settings)
                    .environment(\.currencyFormat, settings.currencyFormat)
                    .preferredColorScheme(colorScheme(for: settings.theme))
            } else {
                // First launch, before the settings row exists.
                Color.clear
            }
        }
        .task {
            guard !hasPreparedStore else { return }
            hasPreparedStore = true
            BudgetStore(context: modelContext).settings()
        }
    }

    @ViewBuilder
    private func content(for settings: AppSettings) -> some View {
        if settings.faceIDEnabled && !isUnlocked {
            LockScreen(isUnlocked: $isUnlocked)
        } else if !settings.hasOnboarded {
            OnboardingFlow()
        } else {
            MainTabView()
        }
    }

    private func colorScheme(for preference: AppThemePreference) -> ColorScheme? {
        switch preference {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

#Preview {
    RootView()
        .modelContainer(AppModelContainer.makePreview())
}

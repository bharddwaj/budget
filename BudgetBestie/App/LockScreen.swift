import SwiftUI
import LocalAuthentication

/// The Face ID gate shown before the app's contents when the lock is on.
///
/// `LAPolicy.deviceOwnerAuthentication` is used rather than the biometrics-only
/// policy so the device passcode still works when Face ID fails or is
/// unavailable — otherwise a failed scan would lock someone out of their own
/// budget.
struct LockScreen: View {
    @Binding var isUnlocked: Bool

    @State private var isAuthenticating = false
    @State private var didFail = false

    var body: some View {
        VStack(spacing: Theme.Spacing.large) {
            Spacer()

            Text("🔒")
                .font(.system(size: 56))

            VStack(spacing: Theme.Spacing.tight) {
                Text("Budget Bestie is locked")
                    .font(Theme.Font.title)
                    .foregroundStyle(Palette.textPrimary)
                Text(didFail
                     ? "That didn't work. Try again, or use your passcode."
                     : "Unlock to see your envelopes.")
                    .font(Theme.Font.callout)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            PillButton(title: "unlock", icon: "faceid", isEnabled: !isAuthenticating) {
                Task { await authenticate() }
            }
        }
        .padding(Theme.Spacing.screenMargin)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
        .task {
            // Prompt straight away so the usual case is a single glance.
            await authenticate()
        }
    }

    private func authenticate() async {
        guard !isAuthenticating else { return }
        isAuthenticating = true
        defer { isAuthenticating = false }

        let context = LAContext()
        context.localizedFallbackTitle = "Use passcode"

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            // No biometrics and no passcode set: locking would be a dead end.
            isUnlocked = true
            return
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "Unlock Budget Bestie"
            )
            isUnlocked = success
            didFail = !success
        } catch {
            didFail = true
        }
    }
}

#Preview {
    struct Harness: View {
        @State private var isUnlocked = false
        var body: some View { LockScreen(isUnlocked: $isUnlocked) }
    }
    return Harness()
}

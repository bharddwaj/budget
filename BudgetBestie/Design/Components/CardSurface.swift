import SwiftUI

/// The rounded white panel almost every group of content sits on.
struct CardSurface<Content: View>: View {
    var padding: CGFloat = Theme.Spacing.medium
    var background: Color = Palette.surface
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
            .shadow(
                color: Theme.Shadow.card,
                radius: Theme.Shadow.cardRadius,
                y: Theme.Shadow.cardY
            )
    }
}

extension View {
    /// Wraps any view in the standard card treatment.
    func card(
        padding: CGFloat = Theme.Spacing.medium,
        background: Color = Palette.surface
    ) -> some View {
        CardSurface(padding: padding, background: background) { self }
    }
}

#Preview {
    ZStack {
        Palette.background.ignoresSafeArea()
        VStack(spacing: Theme.Spacing.large) {
            Text("Groceries")
                .font(Theme.Font.headline)
                .card()
            Text("Tinted")
                .font(Theme.Font.headline)
                .card(background: Palette.accentSoft)
        }
        .padding(Theme.Spacing.screenMargin)
    }
}

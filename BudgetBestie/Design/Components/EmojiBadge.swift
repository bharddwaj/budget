import SwiftUI

/// An envelope's emoji in a soft tinted circle — the app's main iconography.
struct EmojiBadge: View {
    var emoji: String
    var tint: Color
    var size: CGFloat = 44

    var body: some View {
        Text(emoji)
            .font(.system(size: size * 0.5))
            .frame(width: size, height: size)
            .background(tint.opacity(0.16))
            .clipShape(Circle())
    }
}

/// The heading above each envelope group, e.g. "VARIABLE ENVELOPES".
struct SectionHeader: View {
    var title: String
    var tint: Color = Palette.textSecondary
    var trailing: String?

    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(Theme.Font.sectionLabel)
                .kerning(0.8)
                .foregroundStyle(tint)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
            }
        }
    }
}

#Preview {
    VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
        HStack(spacing: Theme.Spacing.medium) {
            EmojiBadge(emoji: "🛒", tint: Palette.variable)
            EmojiBadge(emoji: "🏠", tint: Palette.fixed)
            EmojiBadge(emoji: "✈️", tint: Palette.savings)
        }
        SectionHeader(title: "Variable envelopes", tint: Palette.variable, trailing: "$420.00")
    }
    .padding()
    .background(Palette.background)
}

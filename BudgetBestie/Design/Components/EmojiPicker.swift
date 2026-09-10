import SwiftUI

/// A curated emoji grid for naming envelopes.
///
/// A short, budgeting-shaped list beats the full system picker here: it is one
/// tap instead of a keyboard switch, and the choices already match the kinds of
/// envelopes people actually make.
struct EmojiPicker: View {
    @Binding var selection: String

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 8)

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
            ForEach(EmojiCatalog.groups, id: \.title) { group in
                VStack(alignment: .leading, spacing: Theme.Spacing.small) {
                    SectionHeader(title: group.title)
                    LazyVGrid(columns: columns, spacing: 8) {
                        ForEach(group.emoji, id: \.self) { emoji in
                            Button {
                                selection = emoji
                            } label: {
                                Text(emoji)
                                    .font(.system(size: 22))
                                    .frame(width: 38, height: 38)
                                    .background(
                                        selection == emoji
                                            ? Palette.accent.opacity(0.22)
                                            : Color.clear
                                    )
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }
}

enum EmojiCatalog {
    struct Group {
        var title: String
        var emoji: [String]
    }

    static let groups: [Group] = [
        Group(title: "Everyday", emoji: [
            "🛒", "🍜", "☕️", "⛽️", "🚌", "🧻", "🐶", "💊"
        ]),
        Group(title: "Home & bills", emoji: [
            "🏠", "💡", "📱", "🛜", "🚗", "🛡️", "🧾", "🏦"
        ]),
        Group(title: "Fun", emoji: [
            "🎀", "💅", "🎬", "🎧", "📚", "🍸", "🎮", "💐"
        ]),
        Group(title: "Goals", emoji: [
            "🛟", "✈️", "🎄", "💍", "🏝️", "🎓", "🚙", "🐖"
        ])
    ]

    /// The default emoji offered when creating an envelope of each type.
    static func suggestion(for kindTitle: String) -> String {
        switch kindTitle {
        case "Fixed": return "🏠"
        case "Savings": return "🐖"
        default: return "🛒"
        }
    }
}

#Preview {
    struct Harness: View {
        @State private var selection = "🛒"
        var body: some View {
            ScrollView {
                EmojiPicker(selection: $selection)
                    .padding()
            }
            .background(Palette.background)
        }
    }
    return Harness()
}

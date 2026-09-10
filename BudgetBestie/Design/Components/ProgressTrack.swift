import SwiftUI

/// The thin rounded bar under every envelope row and savings goal.
struct ProgressTrack: View {
    /// 0...1; values outside are clamped so a blown envelope still draws full.
    var progress: Double
    var tint: Color
    var height: CGFloat = 8

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Palette.surfaceMuted)
                Capsule()
                    .fill(tint)
                    .frame(width: proxy.size.width * clamped)
            }
        }
        .frame(height: height)
        .animation(Theme.Motion.value, value: progress)
    }

    private var clamped: Double {
        min(max(progress, 0), 1)
    }
}

#Preview {
    VStack(spacing: Theme.Spacing.medium) {
        ProgressTrack(progress: 0.3, tint: Palette.variable)
        ProgressTrack(progress: 0.75, tint: Palette.fixed)
        ProgressTrack(progress: 1.4, tint: Palette.savings)
    }
    .padding()
    .background(Palette.background)
}

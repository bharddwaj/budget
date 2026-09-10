// swift-tools-version: 5.9
import PackageDescription

// BudgetKit holds every piece of Budget Bestie's logic that does not need UIKit,
// SwiftUI or SwiftData. Keeping it Foundation-only means it compiles — and its
// tests run — on any platform with a Swift toolchain, including Windows.
let package = Package(
    name: "BudgetKit",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "BudgetKit", targets: ["BudgetKit"])
    ],
    targets: [
        .target(name: "BudgetKit"),
        .testTarget(name: "BudgetKitTests", dependencies: ["BudgetKit"])
    ]
)

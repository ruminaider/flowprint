"use client"

import { Palette, Table2, Play, Code, GitBranch, CheckCircle, ArrowRight, FileCode } from "lucide-react"

const businessFeatures = [
  {
    icon: Palette,
    title: "Design workflows visually",
    description: "Define how workflows execute — visually, precisely, without filing tickets.",
  },
  {
    icon: Table2,
    title: "Encode business rules",
    description: "Routing logic and business rules in decision tables you own and understand.",
  },
  {
    icon: Play,
    title: "Simulate outcomes",
    description: "Verify outcomes before anything is built. See exactly how flows execute.",
  },
]

const engineeringFeatures = [
  {
    icon: Code,
    title: "Generate Temporal TypeScript",
    description: "Production-ready code from validated specifications. No Flowprint runtime dependency.",
  },
  {
    icon: CheckCircle,
    title: "Validate in CI",
    description: "Schema errors, dangling references, structural problems caught before merge.",
  },
  {
    icon: GitBranch,
    title: "Deterministic diffs",
    description: "Every diff line is an intentional change. Branch, merge, and review like code.",
  },
]

export function ValuePropositionsSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
            One specification.<br />
            <span className="text-muted-foreground">Two perspectives.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Business defines the blueprint. Engineering ships it. The artifact is the contract.
          </p>
        </div>

        {/* Two-panel layout */}
        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-stretch">
          {/* Business Panel */}
          <div className="bg-card/50 border border-border rounded-xl p-8 relative">
            <div className="absolute -top-3 left-6 px-3 py-1 bg-secondary text-secondary-foreground text-sm font-medium rounded-full">
              Business Defines
            </div>
            
            <div className="mt-4 space-y-6">
              {businessFeatures.map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual preview - Editor canvas mockup */}
            <div className="mt-8 p-4 bg-background/50 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Visual Editor</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-8 rounded ${
                      i % 3 === 0
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-secondary/50"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full bg-primary/30"
                    style={{ opacity: 1 - i * 0.3 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Center artifact */}
          <div className="flex flex-col items-center justify-center py-8 lg:py-0">
            <div className="hidden lg:flex flex-col items-center gap-4">
              {/* Arrow from business */}
              <div className="w-px h-16 bg-gradient-to-b from-border to-primary/50" />
              
              {/* Artifact */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-card border-2 border-primary rounded-lg p-4 shadow-lg shadow-primary/10">
                  <FileCode className="w-8 h-8 text-primary mb-2" />
                  <code className="text-xs font-mono text-foreground">.flowprint.yaml</code>
                </div>
              </div>

              {/* Arrow to engineering */}
              <div className="w-px h-16 bg-gradient-to-b from-primary/50 to-border" />
            </div>

            {/* Mobile: horizontal arrow */}
            <div className="lg:hidden flex items-center gap-4 py-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/50" />
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-card border-2 border-primary rounded-lg p-3 shadow-lg shadow-primary/10">
                  <FileCode className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
          </div>

          {/* Engineering Panel */}
          <div className="bg-card/50 border border-border rounded-xl p-8 relative">
            <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
              Engineering Ships
            </div>
            
            <div className="mt-4 space-y-6">
              {engineeringFeatures.map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual preview - CLI/Code mockup */}
            <div className="mt-8 p-4 bg-background/50 border border-border rounded-lg font-mono text-xs">
              <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-chart-5" />
                <span className="font-sans">Terminal</span>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="text-chart-5">$</span> flowprint validate</p>
                <p className="text-chart-5">✓ Schema valid</p>
                <p className="text-chart-5">✓ References resolved</p>
                <p><span className="text-chart-5">$</span> flowprint generate</p>
                <p className="text-foreground">→ src/workflows/patient-intake.ts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom callout */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">The artifact is the interface.</span> No meetings to align. No tickets to clarify. The specification speaks for itself.
          </p>
        </div>
      </div>
    </section>
  )
}

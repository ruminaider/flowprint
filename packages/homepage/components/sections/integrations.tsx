"use client"

import { GitBranch, Clock, GitMerge, Package, Search } from "lucide-react"

const integrations = [
  {
    icon: GitBranch,
    name: "Git",
    description: "Plain files, deterministic diffs. Branch and merge like code.",
  },
  {
    icon: Clock,
    name: "Temporal",
    description: "First-class code generation target. Production-ready workflows.",
  },
  {
    icon: GitMerge,
    name: "CI/CD",
    description: "Validation in any pipeline. GitHub Actions, GitLab, and more.",
  },
  {
    icon: Package,
    name: "npm",
    description: "Embeddable editor component. CLI installable via package manager.",
  },
  {
    icon: Search,
    name: "Code Search",
    description: "Optional symbol lookup. Link blueprint nodes to codebase functions.",
  },
]

export function IntegrationsSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Fits your toolchain</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Flowprint plugs into what you already use. No new infrastructure required.
          </p>
        </div>

        {/* Integration grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {integrations.map((integration, index) => (
            <div
              key={integration.name}
              className="group p-6 bg-card/50 border border-border rounded-xl hover:border-primary/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <integration.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{integration.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{integration.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

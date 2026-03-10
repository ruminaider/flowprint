"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Copy, ExternalLink } from "lucide-react"
import { useState } from "react"

const cliSteps = [
  { command: "flowprint init my-workflow", comment: "# Create a new blueprint" },
  { command: "flowprint validate", comment: "# Check for errors" },
  { command: "flowprint generate", comment: "# Generate TypeScript" },
]

export function GettingStartedSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = (command: string, index: number) => {
    navigator.clipboard.writeText(command)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Get started in 30 seconds</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            No signup required. Open the app or install locally — your choice.
          </p>
        </div>

        {/* Two paths */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Path A: Web App */}
          <div className="bg-card border border-border rounded-xl p-8 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
            
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Recommended
              </div>
              
              <h3 className="text-2xl font-bold mb-3">Use the web app</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Open the hosted editor and start designing immediately. No installation, 
                no account, no friction.
              </p>
              
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto">
                Open Flowprint
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Preview mockup */}
              <div className="mt-8 p-4 bg-background/50 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-destructive/50" />
                  <div className="w-3 h-3 rounded-full bg-chart-4/50" />
                  <div className="w-3 h-3 rounded-full bg-chart-5/50" />
                  <span className="ml-auto text-xs text-muted-foreground">app.flowprint.dev</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1 space-y-2">
                    <div className="h-4 bg-secondary/50 rounded" />
                    <div className="h-4 bg-secondary/30 rounded" />
                    <div className="h-4 bg-secondary/30 rounded" />
                  </div>
                  <div className="col-span-3 h-24 bg-secondary/20 rounded flex items-center justify-center">
                    <div className="text-xs text-muted-foreground">Canvas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Path B: CLI */}
          <div className="bg-card border border-border rounded-xl p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-muted-foreground text-sm font-medium mb-6">
              For developers
            </div>
            
            <h3 className="text-2xl font-bold mb-3">Install locally</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Full CLI access for validation, generation, and CI integration. 
              Works with any editor.
            </p>
            
            {/* CLI commands */}
            <div className="code-block p-4 space-y-3">
              {cliSteps.map((step, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="font-mono text-sm flex-1 overflow-hidden">
                    <span className="text-chart-5">$</span>{" "}
                    <span className="text-foreground">{step.command}</span>
                    <span className="text-muted-foreground/50 ml-2 hidden sm:inline">{step.comment}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(step.command, index)}
                    className="p-1 hover:bg-secondary rounded transition-colors flex-shrink-0"
                    aria-label={`Copy ${step.command}`}
                  >
                    <Copy className={`h-4 w-4 ${copiedIndex === index ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Links */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <a href="#" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                Documentation
                <ExternalLink className="h-3 w-3" />
              </a>
              <a href="#" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
              <a href="#" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                npm
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

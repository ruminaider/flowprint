"use client"

import { Button } from "@/components/ui/button"
import { HeroBackground } from "@/components/hero-background"
import { Copy, ArrowRight } from "lucide-react"
import { useState } from "react"

export function HeroSection() {
  const [copied, setCopied] = useState(false)
  const installCommand = "npm i -g flowprint"

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (insecure context, permission denied, etc.)
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <HeroBackground />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8 animate-fade-in-up">
          <span className="text-sm text-muted-foreground">Open Source</span>
          <span className="text-primary">|</span>
          <span className="text-sm text-foreground">MIT Licensed</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <span className="text-foreground">Executable</span>
          <br />
          <span className="gradient-text">service blueprints</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          Visual design, decision tables, simulation, code generation, and version control — 
          all in one specification that business defines and engineering ships.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-base">
            Try it now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-3">
            <code className="font-mono text-sm text-foreground">{installCommand}</code>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-secondary rounded transition-colors"
              aria-label="Copy install command"
            >
              <Copy className={`h-4 w-4 ${copied ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>

        {/* YAML Preview */}
        <div className="max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <div className="code-block text-left p-4 text-sm overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/50" />
              <div className="w-3 h-3 rounded-full bg-chart-4/50" />
              <div className="w-3 h-3 rounded-full bg-chart-5/50" />
              <span className="ml-2 text-muted-foreground text-xs">patient-intake.flowprint.yaml</span>
            </div>
            <pre className="text-muted-foreground">
              <code>
                <span className="text-primary">name:</span> patient-intake{"\n"}
                <span className="text-primary">version:</span> 1.0.0{"\n"}
                <span className="text-primary">lanes:</span>{"\n"}
                {"  "}<span className="text-chart-3">- id:</span> patient{"\n"}
                {"  "}<span className="text-chart-3">- id:</span> intake-staff{"\n"}
                {"  "}<span className="text-chart-3">- id:</span> clinical{"\n"}
                <span className="text-primary">nodes:</span>{"\n"}
                {"  "}<span className="text-chart-3">- id:</span> check-in{"\n"}
                {"    "}<span className="text-chart-3">type:</span> action{"\n"}
                {"    "}<span className="text-chart-3">lane:</span> patient
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  )
}

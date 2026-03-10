"use client"

import { useEffect, useRef, useState } from "react"
import { Palette, Table2, Play, CheckCircle, Code, Zap } from "lucide-react"

const steps = [
  {
    id: "design",
    icon: Palette,
    title: "Design",
    description: "Start with a visual canvas. Drag nodes, connect flows, define swimlanes. Your business process takes shape in real-time.",
    layer: "canvas",
  },
  {
    id: "rules",
    icon: Table2,
    title: "Define Rules",
    description: "Add decision tables alongside your flows. Complex routing logic becomes a spreadsheet anyone can understand.",
    layer: "rules",
  },
  {
    id: "simulate",
    icon: Play,
    title: "Simulate",
    description: "Run your blueprint in the browser. Watch data flow through nodes, see which paths execute, catch edge cases before they ship.",
    layer: "simulate",
  },
  {
    id: "validate",
    icon: CheckCircle,
    title: "Validate",
    description: "CI integration catches schema errors, dangling references, and structural issues. Nothing broken merges.",
    layer: "validate",
  },
  {
    id: "generate",
    icon: Code,
    title: "Generate",
    description: "One command produces Temporal TypeScript. Type-safe, production-ready, with no Flowprint runtime dependency.",
    layer: "generate",
  },
  {
    id: "execute",
    icon: Zap,
    title: "Execute",
    description: "Your generated code runs on Temporal. Durable, scalable, observable. The whole stack is alive.",
    layer: "execute",
  },
]

function VisualLayer({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative w-full h-full min-h-[400px] bg-background/50 border border-border rounded-xl overflow-hidden">
      {/* Canvas layer */}
      <div
        className={`absolute inset-4 transition-all duration-500 ${
          activeStep >= 0 ? "opacity-100" : "opacity-0"
        } ${activeStep > 0 ? "opacity-30" : ""}`}
      >
        <div className="w-full h-full border border-dashed border-border/50 rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-3">Canvas</div>
          <div className="grid grid-cols-3 gap-4">
            {/* Swimlanes */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground/70">Patient</div>
              <div className="h-12 bg-primary/10 rounded border border-primary/20 flex items-center justify-center text-xs text-primary">Start</div>
              <div className="h-8 border-l-2 border-primary/30 ml-6" />
              <div className="h-12 bg-secondary rounded border border-border flex items-center justify-center text-xs">Check-in</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground/70">Staff</div>
              <div className="h-12 mt-[4.5rem] bg-secondary rounded border border-border flex items-center justify-center text-xs">Verify</div>
              <div className="h-8 border-l-2 border-muted/30 ml-6" />
              <div className="h-12 bg-secondary rounded border border-border flex items-center justify-center text-xs">Triage</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground/70">Clinical</div>
              <div className="h-12 mt-[9rem] bg-secondary rounded border border-border flex items-center justify-center text-xs">Assess</div>
              <div className="h-8 border-l-2 border-muted/30 ml-6" />
              <div className="h-12 bg-primary/10 rounded border border-primary/20 flex items-center justify-center text-xs text-primary">End</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rules layer */}
      <div
        className={`absolute top-4 right-4 w-48 transition-all duration-500 ${
          activeStep >= 1 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
        } ${activeStep > 1 ? "opacity-30" : ""}`}
      >
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <div className="text-xs text-muted-foreground mb-2">Decision Table</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex gap-2 text-muted-foreground">
              <span className="w-16">severity</span>
              <span className="w-12">lane</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 text-destructive">high</span>
              <span className="w-12">clinical</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 text-chart-4">medium</span>
              <span className="w-12">staff</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 text-chart-5">low</span>
              <span className="w-12">staff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulate layer */}
      <div
        className={`absolute inset-4 pointer-events-none transition-all duration-500 ${
          activeStep >= 2 ? "opacity-100" : "opacity-0"
        } ${activeStep > 2 ? "opacity-30" : ""}`}
      >
        <div className="absolute top-16 left-[15%] w-3 h-3 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
        <div className="absolute top-32 left-[45%] w-3 h-3 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" style={{ animationDelay: "0.3s" }} />
        <div className="absolute top-48 left-[75%] w-3 h-3 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" style={{ animationDelay: "0.6s" }} />
        
        <div className="absolute bottom-4 left-4 bg-card/90 border border-primary/50 rounded px-2 py-1 text-xs">
          <span className="text-primary">Simulating...</span>
          <span className="text-muted-foreground ml-2">Step 3/6</span>
        </div>
      </div>

      {/* Validate layer */}
      <div
        className={`absolute bottom-4 left-4 transition-all duration-500 ${
          activeStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        } ${activeStep > 3 ? "opacity-30" : ""}`}
      >
        <div className="bg-card border border-chart-5 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle className="w-4 h-4 text-chart-5" />
            <span className="text-chart-5 font-medium">CI Passed</span>
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground font-mono">
            <p>Schema: valid</p>
            <p>References: resolved</p>
            <p>Structure: clean</p>
          </div>
        </div>
      </div>

      {/* Generate layer */}
      <div
        className={`absolute bottom-4 right-4 transition-all duration-500 ${
          activeStep >= 4 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
        } ${activeStep > 4 ? "opacity-30" : ""}`}
      >
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg w-56">
          <div className="text-xs text-muted-foreground mb-2">Generated Code</div>
          <pre className="text-xs font-mono text-foreground overflow-hidden">
{`export async function
  patientIntake(
    ctx: Context
  ) {
    await checkIn(ctx);
    // ...
  }`}
          </pre>
        </div>
      </div>

      {/* Execute layer */}
      <div
        className={`absolute top-4 left-4 transition-all duration-500 ${
          activeStep >= 5 ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-lg shadow-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Live on Temporal</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    stepsRef.current.forEach((step, index) => {
      if (!step) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveStep(index)
            }
          })
        },
        { threshold: 0.5, rootMargin: "-20% 0px -20% 0px" }
      )

      observer.observe(step)
      observers.push(observer)
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return (
    <section ref={sectionRef} className="py-24 px-6 bg-card/20">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From design to execution in six layers. Each step builds on the last.
          </p>
        </div>

        {/* Scroll-triggered layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Steps */}
          <div className="space-y-24 lg:space-y-32">
            {steps.map((step, index) => (
              <div
                key={step.id}
                ref={(el) => {
                  stepsRef.current[index] = el
                }}
                className={`transition-all duration-300 ${
                  activeStep === index
                    ? "opacity-100"
                    : activeStep > index
                    ? "opacity-40"
                    : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                      activeStep === index
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Step {index + 1}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky visual */}
          <div className="hidden lg:block sticky top-24">
            <VisualLayer activeStep={activeStep} />
          </div>
        </div>

        {/* Mobile visual (non-sticky) */}
        <div className="lg:hidden mt-12">
          <VisualLayer activeStep={activeStep} />
        </div>
      </div>
    </section>
  )
}

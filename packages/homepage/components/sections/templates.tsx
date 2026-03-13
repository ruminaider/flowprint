"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface Template {
  name: string
  industry: string
  nodes: number
  lanes: number
  complexity: "starter" | "intermediate" | "advanced"
}

const templates: Template[] = [
  {
    name: "Patient Intake",
    industry: "Healthcare",
    nodes: 15,
    lanes: 4,
    complexity: "intermediate",
  },
  {
    name: "Insurance Claims",
    industry: "Finance",
    nodes: 24,
    lanes: 5,
    complexity: "advanced",
  },
  {
    name: "Order Fulfillment",
    industry: "E-commerce",
    nodes: 21,
    lanes: 5,
    complexity: "advanced",
  },
  {
    name: "CI/CD Pipeline",
    industry: "DevOps",
    nodes: 16,
    lanes: 3,
    complexity: "intermediate",
  },
]

function TemplateTopo({ nodes, lanes }: { nodes: number; lanes: number }) {
  // Generate a simplified topology visualization
  const nodePositions: { x: number; y: number; type: "start" | "node" | "end" }[] = []
  const cols = Math.ceil(nodes / lanes)
  
  for (let i = 0; i < Math.min(nodes, 12); i++) {
    const col = Math.floor(i / lanes)
    const row = i % lanes
    nodePositions.push({
      x: (col / (cols - 1)) * 100 || 0,
      y: (row / (lanes - 1)) * 100 || 0,
      type: i === 0 ? "start" : i === Math.min(nodes, 12) - 1 ? "end" : "node",
    })
  }

  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Connections */}
      {nodePositions.slice(0, -1).map((pos, i) => {
        const next = nodePositions[i + 1]
        if (!next) return null
        return (
          <line
            key={`line-${i}`}
            x1={10 + pos.x}
            y1={10 + pos.y * 0.6}
            x2={10 + next.x}
            y2={10 + next.y * 0.6}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={1}
          />
        )
      })}
      
      {/* Nodes */}
      {nodePositions.map((pos, i) => (
        <g key={`node-${i}`}>
          {pos.type === "start" || pos.type === "end" ? (
            <circle
              cx={10 + pos.x}
              cy={10 + pos.y * 0.6}
              r={4}
              fill="currentColor"
              className="text-primary"
            />
          ) : (
            <rect
              x={10 + pos.x - 3}
              y={10 + pos.y * 0.6 - 2}
              width={6}
              height={4}
              rx={1}
              fill="currentColor"
              className="text-muted-foreground"
              opacity={0.5}
            />
          )}
        </g>
      ))}
    </svg>
  )
}

function ComplexityBadge({ complexity }: { complexity: Template["complexity"] }) {
  const colors = {
    starter: "bg-chart-5/10 text-chart-5 border-chart-5/20",
    intermediate: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    advanced: "bg-primary/10 text-primary border-primary/20",
  }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[complexity]}`}>
      {complexity}
    </span>
  )
}

export function TemplatesSection() {
  return (
    <section className="py-24 px-6 bg-card/20">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Real-world templates</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start with production-ready blueprints across industries. Complexity you can handle.
          </p>
        </div>

        {/* Template cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template) => (
            <div
              key={template.name}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300"
            >
              {/* Topology preview */}
              <div className="h-32 bg-background/50 p-4 border-b border-border">
                <TemplateTopo nodes={template.nodes} lanes={template.lanes} />
              </div>
              
              {/* Card content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {template.industry}
                  </span>
                  <ComplexityBadge complexity={template.complexity} />
                </div>
                
                <h3 className="font-semibold text-foreground mb-3">{template.name}</h3>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{template.nodes} nodes</span>
                  <span>{template.lanes} lanes</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="group">
            Explore all templates
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  )
}

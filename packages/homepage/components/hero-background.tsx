"use client"

import { useEffect, useRef } from "react"

interface Node {
  id: number
  x: number
  y: number
  size: number
  type: "start" | "action" | "decision" | "end"
  connections: number[]
  animationDelay: number
}

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const nodesRef = useRef<Node[]>([])
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      generateNodes()
    }

    const generateNodes = () => {
      const nodes: Node[] = []
      const nodeCount = Math.floor((canvas.width * canvas.height) / 50000)
      const types: Node["type"][] = ["start", "action", "decision", "action", "action", "end"]

      for (let i = 0; i < nodeCount; i++) {
        const connections: number[] = []
        const connectionCount = Math.floor(Math.random() * 2) + 1
        for (let j = 0; j < connectionCount; j++) {
          const targetId = Math.floor(Math.random() * nodeCount)
          if (targetId !== i) connections.push(targetId)
        }

        nodes.push({
          id: i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 2,
          type: types[Math.floor(Math.random() * types.length)],
          connections,
          animationDelay: Math.random() * 5,
        })
      }
      nodesRef.current = nodes
    }

    const drawNode = (node: Node, alpha: number) => {
      ctx.save()
      ctx.globalAlpha = alpha * 0.6

      const colors = {
        start: "#E446FF",
        action: "#E446FF",
        decision: "#ff6b9d",
        end: "#E446FF",
      }

      ctx.fillStyle = colors[node.type]
      ctx.shadowColor = colors[node.type]
      ctx.shadowBlur = 10

      ctx.beginPath()
      if (node.type === "decision") {
        ctx.moveTo(node.x, node.y - node.size)
        ctx.lineTo(node.x + node.size, node.y)
        ctx.lineTo(node.x, node.y + node.size)
        ctx.lineTo(node.x - node.size, node.y)
      } else if (node.type === "start" || node.type === "end") {
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
      } else {
        ctx.roundRect(node.x - node.size, node.y - node.size / 2, node.size * 2, node.size, 2)
      }
      ctx.fill()
      ctx.restore()
    }

    const drawConnection = (from: Node, to: Node, progress: number) => {
      ctx.save()
      ctx.globalAlpha = 0.15 * progress

      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
      gradient.addColorStop(0, "#E446FF")
      gradient.addColorStop(1, "transparent")

      ctx.strokeStyle = gradient
      ctx.lineWidth = 1

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)

      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2 - 20
      ctx.quadraticCurveTo(midX, midY, to.x, to.y)
      ctx.stroke()

      // Animated particle along the line
      if (progress > 0.5) {
        const t = ((progress - 0.5) * 2)
        const particleX = from.x + (to.x - from.x) * t
        const particleY = from.y + (to.y - from.y) * t - 20 * Math.sin(Math.PI * t)
        
        ctx.globalAlpha = 0.8
        ctx.fillStyle = "#E446FF"
        ctx.shadowColor = "#E446FF"
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }

    const animate = () => {
      timeRef.current += 0.005
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const nodes = nodesRef.current

      // Draw connections first
      nodes.forEach((node) => {
        node.connections.forEach((targetId) => {
          const target = nodes[targetId]
          if (target) {
            const progress = (Math.sin(timeRef.current + node.animationDelay) + 1) / 2
            drawConnection(node, target, progress)
          }
        })
      })

      // Draw nodes
      nodes.forEach((node) => {
        const pulse = Math.sin(timeRef.current * 2 + node.animationDelay) * 0.3 + 0.7
        drawNode(node, pulse)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()

    window.addEventListener("resize", resizeCanvas)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  )
}

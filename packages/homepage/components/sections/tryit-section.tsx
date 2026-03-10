'use client'

import { useState } from 'react'
import { TopologyPreview } from '@/components/flow/topology-preview'
import './tryit-section.css'

interface TemplateTopo {
  lanes: number
  nodes: [number, number, string][]
  edges: [number, number][]
}

interface Template {
  id: string
  title: string
  description: string
  complexity: 'advanced' | 'showcase'
  nodes: number
  lanes: number
  domain: string
  topo: TemplateTopo
  laneNames: string[]
}

const templates: Template[] = [
  {
    id: 'e-commerce-fulfillment',
    title: 'E-Commerce Fulfillment',
    description:
      'End-to-end order lifecycle from cart checkout to last-mile delivery, returns, and loyalty rewards.',
    complexity: 'showcase',
    nodes: 20,
    lanes: 5,
    domain: 'Commerce',
    laneNames: ['Customer', 'Sales', 'Warehouse', 'Shipping', 'Finance'],
    topo: {
      lanes: 5,
      nodes: [
        [0, 0, 'a'], [1, 4, 'a'], [2, 4, 's'], [3, 4, 'w'], [3, 1, 'a'],
        [4, 1, 'a'], [5, 2, 's'], [6, 2, 'w'], [6, 2, 'p'], [7, 2, 'a'],
        [8, 3, 's'], [9, 3, 'a'], [10, 3, 'w'], [11, 4, 'a'], [12, 4, 'a'],
        [13, 0, 's'], [14, 2, 'a'], [15, 4, 'a'], [16, 0, 't'], [16, 0, 't'],
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [3, 5], [4, 5], [5, 6],
        [6, 7], [6, 8], [7, 9], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13],
        [13, 14], [13, 16], [14, 15], [15, 18], [1, 19],
      ],
    },
  },
  {
    id: 'patient-intake',
    title: 'Patient Intake',
    description:
      'Hospital onboarding covering registration, insurance verification, clinical triage, and provider assignment.',
    complexity: 'advanced',
    nodes: 14,
    lanes: 4,
    domain: 'Healthcare',
    laneNames: ['Patient', 'Reception', 'Clinical', 'Insurance'],
    topo: {
      lanes: 4,
      nodes: [
        [0, 0, 'a'], [1, 1, 'a'], [2, 1, 's'], [3, 1, 'a'], [3, 1, 'a'],
        [4, 1, 'a'], [5, 3, 's'], [6, 1, 'a'], [6, 1, 'a'], [7, 2, 's'],
        [8, 2, 'a'], [9, 2, 'a'], [10, 1, 'a'], [11, 0, 't'], [11, 0, 't'],
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [5, 6], [6, 7],
        [6, 8], [7, 9], [8, 9], [9, 10], [9, 11], [10, 12], [11, 14], [12, 13],
      ],
    },
  },
  {
    id: 'insurance-claims',
    title: 'Insurance Claims',
    description:
      'Full claims pipeline: submission, adjudication, fraud detection, settlement, payment, and appeals.',
    complexity: 'showcase',
    nodes: 23,
    lanes: 5,
    domain: 'Insurance',
    laneNames: ['Claimant', 'Agent', 'Adjuster', 'Legal', 'Finance'],
    topo: {
      lanes: 5,
      nodes: [
        [0, 0, 'a'], [1, 1, 'a'], [2, 1, 's'], [3, 1, 's'], [4, 2, 's'],
        [5, 2, 'a'], [6, 2, 'w'], [7, 2, 's'], [8, 2, 'a'], [9, 4, 'a'],
        [10, 2, 'a'], [11, 2, 's'], [12, 2, 'a'], [12, 3, 'a'], [13, 2, 'a'],
        [14, 1, 'a'], [15, 0, 'w'], [16, 1, 's'], [17, 4, 'a'], [18, 3, 'a'],
        [19, 3, 's'], [20, 1, 'a'], [21, 0, 't'], [21, 0, 't'],
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [2, 8], [3, 4], [3, 8], [4, 5], [4, 8],
        [5, 6], [6, 7], [7, 8], [7, 20], [7, 9], [8, 10], [9, 10], [10, 11],
        [11, 12], [11, 13], [11, 9], [12, 14], [13, 14], [14, 15], [15, 16],
        [16, 17], [16, 18], [16, 10], [17, 21], [18, 19], [19, 15], [19, 20],
        [20, 22],
      ],
    },
  },
]

const NODE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  a: { label: 'Action', color: '#FF9243' },
  s: { label: 'Switch', color: '#A374FF' },
  p: { label: 'Parallel', color: '#A374FF' },
  w: { label: 'Wait', color: '#F59E0B' },
  e: { label: 'Error', color: '#FF362B' },
  t: { label: 'Terminal', color: '#3FDC77' },
}

function getNodeTypeCounts(topo: TemplateTopo) {
  const counts: Record<string, number> = {}
  for (const [, , type] of topo.nodes) {
    counts[type] = (counts[type] ?? 0) + 1
  }
  return counts
}

export function TryItSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = templates.find((t) => t.id === selectedId) ?? null

  return (
    <div className="tryit">
      <div className="tryit-intro">
        <h2 className="tryit-title">Start from a template</h2>
        <p className="tryit-description">
          Pick a service blueprint and explore its structure. Each template is a
          real <code>.flowprint.yaml</code> file you can open in the editor.
        </p>
      </div>

      {/* Template picker */}
      <div className="template-grid">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className={`template-card ${selectedId === tpl.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(selectedId === tpl.id ? null : tpl.id)}
          >
            <div className="template-preview">
              <TopologyPreview topo={tpl.topo} width={320} height={140} />
            </div>
            <div className="template-body">
              <div className="template-header">
                <h3 className="template-title">{tpl.title}</h3>
                <span className={`template-badge badge-${tpl.complexity}`}>
                  {tpl.complexity}
                </span>
              </div>
              <p className="template-description">{tpl.description}</p>
              <div className="template-meta">
                <span>{tpl.nodes} nodes</span>
                <span className="meta-dot" />
                <span>{tpl.lanes} lanes</span>
                <span className="meta-dot" />
                <span>{tpl.domain}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Expanded preview */}
      <div className={`template-expanded ${selected ? 'visible' : ''}`}>
        {selected && (
          <>
            <div className="expanded-header">
              <div className="expanded-title-row">
                <h3 className="expanded-title">{selected.title}</h3>
                <span className={`template-badge badge-${selected.complexity}`}>
                  {selected.complexity}
                </span>
              </div>
              <p className="expanded-description">{selected.description}</p>
            </div>

            <div className="expanded-content">
              {/* Large topology preview */}
              <div className="expanded-preview">
                <TopologyPreview
                  topo={selected.topo}
                  width={800}
                  height={320}
                  expanded
                />
              </div>

              {/* Sidebar info */}
              <div className="expanded-sidebar">
                {/* Lanes */}
                <div className="sidebar-section">
                  <h4 className="sidebar-heading">Lanes</h4>
                  <div className="lane-list">
                    {selected.laneNames.map((name, i) => (
                      <div key={name} className="lane-item">
                        <span
                          className="lane-dot"
                          style={{
                            background: [
                              '#FF6B6B', '#E446FF', '#06B6D4', '#A374FF', '#FF9243',
                            ][i % 5],
                          }}
                        />
                        <span className="lane-name">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node types */}
                <div className="sidebar-section">
                  <h4 className="sidebar-heading">Node Types</h4>
                  <div className="type-list">
                    {Object.entries(getNodeTypeCounts(selected.topo)).map(
                      ([type, count]) => {
                        const info = NODE_TYPE_LABELS[type]
                        if (!info) return null
                        return (
                          <div key={type} className="type-item">
                            <span
                              className="type-dot"
                              style={{ background: info.color }}
                            />
                            <span className="type-label">{info.label}</span>
                            <span className="type-count">{count}</span>
                          </div>
                        )
                      },
                    )}
                  </div>
                </div>

                {/* Quick start */}
                <div className="sidebar-section">
                  <h4 className="sidebar-heading">Quick Start</h4>
                  <div className="install-snippet">
                    <code>npx flowprint init --template {selected.id}</code>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Get started CTAs */}
      <div className="tryit-ctas">
        <button className="cta-primary cta-disabled" disabled title="Coming soon">
          Open the Editor
        </button>
        <a
          className="cta-secondary"
          href="https://github.com/ruminaider/flowprint"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the Docs
        </a>
      </div>
    </div>
  )
}

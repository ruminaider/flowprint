import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Island } from './Island'
import { CommandPaletteItem } from './CommandPaletteItem'
import type { Command } from './CommandPaletteItem'

const RECENT_STORAGE_KEY = 'fp-command-palette-recent'
const MAX_RECENT = 5

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function saveRecent(ids: string[]): void {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)))
  } catch {
    // Ignore storage errors
  }
}

interface CommandPaletteProps {
  commands: Command[]
  isOpen: boolean
  onClose: () => void
}

interface GroupedCommands {
  category: string
  commands: Command[]
}

function groupByCategory(commands: Command[]): GroupedCommands[] {
  const map = new Map<string, Command[]>()
  for (const cmd of commands) {
    const list = map.get(cmd.category)
    if (list) {
      list.push(cmd)
    } else {
      map.set(cmd.category, [cmd])
    }
  }
  return Array.from(map.entries()).map(([category, cmds]) => ({
    category,
    commands: cmds,
  }))
}

export function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      // Wait for next frame so the input is mounted
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands
    const normalizedQuery = normalize(query)
    return commands.filter((cmd) => normalize(cmd.label).includes(normalizedQuery))
  }, [commands, query])

  const recentIds = useMemo(() => loadRecent(), [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const { groups, flatList } = useMemo(() => {
    const hasQuery = query.trim().length > 0

    if (hasQuery) {
      const grouped = groupByCategory(filteredCommands)
      const flat = grouped.flatMap((g) => g.commands)
      return { groups: grouped, flatList: flat }
    }

    // No query: show recent first, then all by category
    const recentCommands = recentIds
      .map((id) => commands.find((cmd) => cmd.id === id))
      .filter((cmd): cmd is Command => cmd != null)

    const allGrouped = groupByCategory(filteredCommands)

    const groups: GroupedCommands[] = []
    if (recentCommands.length > 0) {
      groups.push({ category: 'Recent', commands: recentCommands })
    }
    groups.push(...allGrouped)

    const flat = groups.flatMap((g) => g.commands)
    return { groups, flatList: flat }
  }, [filteredCommands, recentIds, query, commands])

  const executeCommand = useCallback((command: Command) => {
    const recent = loadRecent()
    const updated = [command.id, ...recent.filter((id) => id !== command.id)]
    saveRecent(updated)
    command.action()
    onClose()
  }, [onClose])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(flatList.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + flatList.length) % Math.max(flatList.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const activeCommand = flatList[activeIndex]
      if (activeCommand) {
        executeCommand(activeCommand)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }, [flatList, activeIndex, executeCommand, onClose])

  if (!isOpen) return null

  let itemIndex = 0

  return (
    <div className="fp-command-palette" onKeyDown={handleKeyDown}>
      <div
        className="fp-command-palette__backdrop"
        onClick={onClose}
        data-testid="command-palette-backdrop"
      />
      <Island className="fp-command-palette__dialog">
        <div className="fp-command-palette__input-wrapper">
          <input
            ref={inputRef}
            className="fp-command-palette__input"
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            aria-label="Command search"
          />
        </div>
        <div className="fp-command-palette__list" role="listbox">
          {groups.map((group) => (
            <div key={group.category}>
              <div className="fp-command-palette__category">{group.category}</div>
              {group.commands.map((cmd) => {
                const currentIndex = itemIndex++
                return (
                  <CommandPaletteItem
                    key={`${group.category}-${cmd.id}`}
                    command={cmd}
                    active={currentIndex === activeIndex}
                    onSelect={executeCommand}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </Island>
    </div>
  )
}

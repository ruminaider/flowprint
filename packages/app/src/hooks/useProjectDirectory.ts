import { useState, useRef, useCallback, useMemo } from 'react'
import { parse } from 'yaml'
import { validateYaml, validateRulesYaml } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { RulesDataMap, RulesDataEntry } from '@ruminaider/flowprint-editor'

// File System Access API type augmentation (Chrome/Edge only)
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>
  }
}

export interface UseProjectDirectoryOptions {
  onDocLoaded: (doc: FlowprintDocument, fileName: string) => void
  onRulesResolved: (map: RulesDataMap) => void
  onError?: (error: Error) => void
}

export interface UseProjectDirectoryReturn {
  openProject(): Promise<void>
  refreshRules(): Promise<void>
  projectName: string | null
  supportsDirectoryPicker: boolean
}

function hasDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

/**
 * Resolve a relative file path against a directory handle.
 * E.g. "rules/discount.rules.yaml" navigates into "rules/" subdirectory
 * then gets "discount.rules.yaml".
 */
async function resolveFileHandle(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  const segments = relativePath.split('/').filter(Boolean)
  let currentDir = dirHandle
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (seg === undefined) break
    currentDir = await currentDir.getDirectoryHandle(seg)
  }
  const fileName = segments[segments.length - 1]
  if (fileName === undefined) {
    throw new Error(`Invalid file path: ${relativePath}`)
  }
  return currentDir.getFileHandle(fileName)
}

/**
 * Find the first *.flowprint.yaml file in a directory (root level only).
 */
async function findBlueprintFile(
  dirHandle: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle | null> {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.flowprint.yaml')) {
      return dirHandle.getFileHandle(entry.name)
    }
  }
  return null
}

/**
 * Collect all rules file references from a parsed document.
 */
function collectRulesRefs(doc: FlowprintDocument): string[] {
  const refs = new Set<string>()
  for (const node of Object.values(doc.nodes)) {
    const rules = (node as unknown as Record<string, unknown>).rules as
      | { file: string }
      | undefined
    if (rules?.file) {
      refs.add(rules.file)
    }
  }
  return [...refs]
}

/**
 * Read and validate a rules file, returning a RulesDataEntry.
 */
async function loadRulesFile(
  dirHandle: FileSystemDirectoryHandle,
  filePath: string,
): Promise<RulesDataEntry> {
  try {
    const fileHandle = await resolveFileHandle(dirHandle, filePath)
    const file = await fileHandle.getFile()
    const text = await file.text()

    const result = validateRulesYaml(text)
    if (!result.valid) {
      return {
        validationErrors: result.errors.map((e) => `${e.path}: ${e.message}`),
      }
    }

    const parsed = parse(text) as Record<string, unknown>
    return {
      data: parsed as unknown as RulesDataEntry['data'],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      validationErrors: [`File not found or unreadable: ${filePath} (${message})`],
    }
  }
}

export function useProjectDirectory(
  options: UseProjectDirectoryOptions,
): UseProjectDirectoryReturn {
  const { onDocLoaded, onRulesResolved, onError } = options

  const [projectName, setProjectName] = useState<string | null>(null)
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const lastDocRef = useRef<FlowprintDocument | null>(null)

  const supportsDirectoryPicker = useMemo(() => hasDirectoryPicker(), [])

  const resolveRulesForDoc = useCallback(
    async (dirHandle: FileSystemDirectoryHandle, doc: FlowprintDocument) => {
      const rulesRefs = collectRulesRefs(doc)
      if (rulesRefs.length === 0) {
        onRulesResolved({})
        return
      }

      const entries = await Promise.all(
        rulesRefs.map(async (filePath) => {
          const entry = await loadRulesFile(dirHandle, filePath)
          return [filePath, entry] as const
        }),
      )

      const map: RulesDataMap = {}
      for (const [filePath, entry] of entries) {
        map[filePath] = entry
      }
      onRulesResolved(map)
    },
    [onRulesResolved],
  )

  const openProject = useCallback(async () => {
    try {
      const dirHandle = await window.showDirectoryPicker()

      const blueprintHandle = await findBlueprintFile(dirHandle)
      if (!blueprintHandle) {
        throw new Error('No .flowprint.yaml file found in the selected directory')
      }

      const file = await blueprintHandle.getFile()
      const text = await file.text()

      const result = validateYaml(text)
      if (!result.valid) {
        const firstError = result.errors[0]
        const msg = firstError
          ? `Invalid flowprint file: ${firstError.message} (at ${firstError.path})`
          : 'Invalid flowprint file'
        throw new Error(msg)
      }

      const doc = parse(text) as FlowprintDocument
      dirHandleRef.current = dirHandle
      lastDocRef.current = doc
      setProjectName(dirHandle.name)
      onDocLoaded(doc, file.name)

      await resolveRulesForDoc(dirHandle, doc)
    } catch (err) {
      if (isAbortError(err)) return
      if (onError && err instanceof Error) {
        onError(err)
      }
    }
  }, [onDocLoaded, onError, resolveRulesForDoc])

  const refreshRules = useCallback(async () => {
    const dirHandle = dirHandleRef.current
    const doc = lastDocRef.current
    if (!dirHandle || !doc) return

    try {
      await resolveRulesForDoc(dirHandle, doc)
    } catch (err) {
      if (onError && err instanceof Error) {
        onError(err)
      }
    }
  }, [resolveRulesForDoc, onError])

  return {
    openProject,
    refreshRules,
    projectName,
    supportsDirectoryPicker,
  }
}

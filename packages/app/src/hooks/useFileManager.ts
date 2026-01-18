import { useState, useRef, useCallback, useMemo } from 'react'
import { parse } from 'yaml'
import { validateYaml, serialize } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export interface UseFileManagerOptions {
  doc: FlowprintDocument
  onDocLoaded: (doc: FlowprintDocument, fileName: string) => void
  onError?: (error: Error) => void
}

export interface UseFileManagerReturn {
  openFile(): Promise<void>
  saveFile(): Promise<void>
  saveFileAs(): Promise<void>
  fileName: string | null
  filePath: string | null
  hasFileHandle: boolean
  dirty: boolean
  setDirty(dirty: boolean): void
  supportsNativeFS: boolean
}

const YAML_PICKER_TYPES: FilePickerAcceptType[] = [
  { description: 'Flowprint YAML', accept: { 'text/yaml': ['.yaml', '.yml'] } },
]

function hasNativeFS(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useFileManager(options: UseFileManagerOptions): UseFileManagerReturn {
  const { doc, onDocLoaded, onError } = options

  const [fileName, setFileName] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [hasFileHandle, setHasFileHandle] = useState(false)
  const handleRef = useRef<FileSystemFileHandle | null>(null)

  const supportsNativeFS = useMemo(() => hasNativeFS(), [])

  const setHandle = useCallback((handle: FileSystemFileHandle | null) => {
    handleRef.current = handle
    setHasFileHandle(handle !== null)
  }, [])

  const openFileNative = useCallback(async () => {
    const picker = window.showOpenFilePicker
    if (!picker) return

    const [handle] = await picker({
      types: YAML_PICKER_TYPES,
      multiple: false,
    })
    if (!handle) return

    const file = await handle.getFile()
    const text = await file.text()

    const result = validateYaml(text)
    if (!result.valid) {
      const firstError = result.errors[0]
      const msg = firstError
        ? `Invalid flowprint file: ${firstError.message} (at ${firstError.path})`
        : 'Invalid flowprint file'
      throw new Error(msg)
    }

    const parsed = parse(text) as FlowprintDocument
    setHandle(handle)
    setFileName(file.name)
    setFilePath(file.name)
    setDirty(false)
    onDocLoaded(parsed, file.name)
  }, [onDocLoaded, setHandle])

  const openFileFallback = useCallback((): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.yaml,.yml'
      input.style.display = 'none'

      input.addEventListener('change', () => {
        const file = input.files?.[0]
        if (!file) {
          resolve()
          return
        }

        void file
          .text()
          .then((text) => {
            const result = validateYaml(text)
            if (!result.valid) {
              const firstError = result.errors[0]
              const msg = firstError
                ? `Invalid flowprint file: ${firstError.message} (at ${firstError.path})`
                : 'Invalid flowprint file'
              throw new Error(msg)
            }

            const parsed = parse(text) as FlowprintDocument
            setHandle(null)
            setFileName(file.name)
            setFilePath(null)
            setDirty(false)
            onDocLoaded(parsed, file.name)
            resolve()
          })
          .catch((err: unknown) => {
            reject(err instanceof Error ? err : new Error(String(err)))
          })
      })

      // Handle cancel -- the input fires no change event on cancel
      input.addEventListener('cancel', () => {
        resolve()
      })

      document.body.appendChild(input)
      input.click()
      document.body.removeChild(input)
    })
  }, [onDocLoaded, setHandle])

  const openFile = useCallback(async () => {
    try {
      if (hasNativeFS()) {
        await openFileNative()
      } else {
        await openFileFallback()
      }
    } catch (err) {
      if (isAbortError(err)) return
      if (onError && err instanceof Error) {
        onError(err)
      }
    }
  }, [openFileNative, openFileFallback, onError])

  const writeToHandle = useCallback(
    async (handle: FileSystemFileHandle) => {
      const writable = await handle.createWritable()
      await writable.write(serialize(doc))
      await writable.close()
      setDirty(false)
    },
    [doc],
  )

  const saveFileAs = useCallback(async () => {
    try {
      if (hasNativeFS()) {
        const picker = window.showSaveFilePicker
        if (!picker) return

        const handle = await picker({
          suggestedName: fileName ?? 'untitled.flowprint.yaml',
          types: YAML_PICKER_TYPES,
        })

        setHandle(handle)
        setFileName(handle.name)
        setFilePath(handle.name)
        await writeToHandle(handle)
      } else {
        const yaml = serialize(doc)
        const blob = new Blob([yaml], { type: 'text/yaml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName ?? 'untitled.flowprint.yaml'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setDirty(false)
      }
    } catch (err) {
      if (isAbortError(err)) return
      if (onError && err instanceof Error) {
        onError(err)
      }
    }
  }, [doc, fileName, onError, setHandle, writeToHandle])

  const saveFile = useCallback(async () => {
    const currentHandle = handleRef.current
    if (currentHandle) {
      try {
        await writeToHandle(currentHandle)
      } catch (err) {
        if (isAbortError(err)) return
        if (onError && err instanceof Error) {
          onError(err)
        }
      }
    } else {
      await saveFileAs()
    }
  }, [writeToHandle, saveFileAs, onError])

  return {
    openFile,
    saveFile,
    saveFileAs,
    fileName,
    filePath,
    hasFileHandle,
    dirty,
    setDirty,
    supportsNativeFS,
  }
}

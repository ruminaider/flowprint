/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { validate, migrate, serialize } from '@ruminaider/flowprint-schema'
import { parse } from 'yaml'
import { useFileManager } from './useFileManager'

vi.mock('@ruminaider/flowprint-schema', () => ({
  validate: vi.fn(),
  migrate: vi.fn(),
  serialize: vi.fn(),
}))

vi.mock('yaml', () => ({
  parse: vi.fn(),
}))

const MOCK_DOC: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test-flow',
  version: '0.1.0',
  description: 'A test document',
  lanes: {},
  nodes: {},
}

const VALID_YAML = `schema: flowprint/1.0
name: test-flow
version: 0.1.0
description: A test document
lanes: {}
nodes: {}
`

function createMockFile(name: string, content: string) {
  const file = new File([content], name, { type: 'text/yaml' })
  // jsdom may not provide Blob.prototype.text(), so add it explicitly
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(content),
    })
  }
  return file
}

function createMockWritable() {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockHandle(name: string, content: string) {
  const writable = createMockWritable()
  return {
    kind: 'file' as const,
    name,
    getFile: vi.fn().mockResolvedValue(createMockFile(name, content)),
    createWritable: vi.fn().mockResolvedValue(writable),
    _writable: writable,
  }
}

/** Save original createElement before any test mocks it */
const _origCreateElement = document.createElement.bind(document)

/**
 * Mock document.createElement so that `<input>` elements dispatch
 * a change event with the given file when clicked.
 */
function mockCreateElementForInput(mockFile: File) {
  return vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'input') {
      const input = _origCreateElement('input')
      Object.defineProperty(input, 'click', {
        value: () => {
          Object.defineProperty(input, 'files', {
            value: [mockFile],
            configurable: true,
          })
          input.dispatchEvent(new Event('change'))
        },
        configurable: true,
      })
      return input
    }
    return _origCreateElement(tag)
  })
}

/**
 * Mock document.createElement to capture `<a>` elements and stub their click.
 */
function mockCreateElementForAnchor() {
  let downloadLink: HTMLAnchorElement | undefined
  const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = _origCreateElement(tag)
    if (tag === 'a') {
      downloadLink = el as HTMLAnchorElement
      Object.defineProperty(downloadLink, 'click', {
        value: vi.fn(),
        configurable: true,
      })
    }
    return el
  })
  return { spy, getLink: () => downloadLink }
}

describe('useFileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: migration returns current, validation passes
    vi.mocked(migrate).mockReturnValue({ status: 'current', doc: MOCK_DOC })
    vi.mocked(validate).mockReturnValue({
      valid: true,
      errors: [],
    })
    vi.mocked(serialize).mockReturnValue(VALID_YAML)
    vi.mocked(parse).mockReturnValue(MOCK_DOC)

    // Clean up FS API mocks
    delete (window as unknown as Record<string, unknown>).showOpenFilePicker
    delete (window as unknown as Record<string, unknown>).showSaveFilePicker
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).showOpenFilePicker
    delete (window as unknown as Record<string, unknown>).showSaveFilePicker
  })

  describe('supportsNativeFS', () => {
    it('is false when showOpenFilePicker is not on window', () => {
      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))
      expect(result.current.supportsNativeFS).toBe(false)
    })

    it('is true when showOpenFilePicker is on window', () => {
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      })
      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))
      expect(result.current.supportsNativeFS).toBe(true)
    })
  })

  describe('openFile -- native FS', () => {
    it('opens a file via showOpenFilePicker and calls onDocLoaded', async () => {
      const handle = createMockHandle('flow.flowprint.yaml', VALID_YAML)
      const mockPicker = vi.fn().mockResolvedValue([handle])
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: mockPicker,
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))

      await act(async () => {
        await result.current.openFile()
      })

      expect(mockPicker).toHaveBeenCalledWith({
        types: [{ description: 'Flowprint YAML', accept: { 'text/yaml': ['.yaml', '.yml'] } }],
        multiple: false,
      })
      expect(migrate).toHaveBeenCalledWith(MOCK_DOC)
      expect(validate).toHaveBeenCalledWith(MOCK_DOC)
      expect(onDocLoaded).toHaveBeenCalledWith(MOCK_DOC, 'flow.flowprint.yaml')
      expect(result.current.fileName).toBe('flow.flowprint.yaml')
      expect(result.current.dirty).toBe(false)
    })
  })

  describe('openFile -- fallback', () => {
    it('creates a file input and reads the selected file', async () => {
      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))

      const mockFile = createMockFile('fallback.flowprint.yaml', VALID_YAML)
      const createSpy = mockCreateElementForInput(mockFile)

      await act(async () => {
        await result.current.openFile()
      })

      expect(migrate).toHaveBeenCalledWith(MOCK_DOC)
      expect(validate).toHaveBeenCalledWith(MOCK_DOC)
      expect(onDocLoaded).toHaveBeenCalledWith(MOCK_DOC, 'fallback.flowprint.yaml')
      expect(result.current.fileName).toBe('fallback.flowprint.yaml')
      expect(result.current.dirty).toBe(false)

      createSpy.mockRestore()
    })
  })

  describe('openFile -- invalid YAML', () => {
    it('calls onError when validation fails', async () => {
      const onDocLoaded = vi.fn()
      const onError = vi.fn()

      vi.mocked(validate).mockReturnValue({
        valid: false,
        errors: [
          { path: '/schema', message: 'Missing required property: schema', severity: 'error' },
        ],
      })

      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded, onError }))

      const mockFile = createMockFile('bad.yaml', 'bad: content')
      const createSpy = mockCreateElementForInput(mockFile)

      await act(async () => {
        await result.current.openFile()
      })

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Missing required property: schema') as string,
        }),
      )
      expect(onDocLoaded).not.toHaveBeenCalled()

      createSpy.mockRestore()
    })
  })

  describe('saveFile -- with handle', () => {
    it('writes serialized doc via writable stream', async () => {
      const handle = createMockHandle('flow.flowprint.yaml', VALID_YAML)
      const mockPicker = vi.fn().mockResolvedValue([handle])
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: mockPicker,
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))

      // First open a file to get a handle
      await act(async () => {
        await result.current.openFile()
      })

      // Set dirty
      act(() => {
        result.current.setDirty(true)
      })
      expect(result.current.dirty).toBe(true)

      // Now save
      await act(async () => {
        await result.current.saveFile()
      })

      expect(handle.createWritable).toHaveBeenCalled()
      expect(handle._writable.write).toHaveBeenCalledWith(VALID_YAML)
      expect(handle._writable.close).toHaveBeenCalled()
      expect(result.current.dirty).toBe(false)
    })
  })

  describe('saveFile -- without handle', () => {
    it('falls back to saveFileAs', async () => {
      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))

      const { spy: createSpy, getLink } = mockCreateElementForAnchor()
      const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

      await act(async () => {
        await result.current.saveFile()
      })

      const downloadLink = getLink()
      expect(downloadLink).toBeDefined()
      expect(downloadLink?.download).toBe('untitled.flowprint.yaml')
      expect(serialize).toHaveBeenCalledWith(MOCK_DOC)
      expect(result.current.dirty).toBe(false)
      expect(revokeUrl).toHaveBeenCalled()

      createSpy.mockRestore()
      revokeUrl.mockRestore()
    })
  })

  describe('saveFileAs -- fallback', () => {
    it('creates a download link with serialized content', async () => {
      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))

      const { spy: createSpy, getLink } = mockCreateElementForAnchor()
      const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

      await act(async () => {
        await result.current.saveFileAs()
      })

      const downloadLink = getLink()
      expect(serialize).toHaveBeenCalledWith(MOCK_DOC)
      expect(downloadLink).toBeDefined()
      expect(downloadLink?.href).toContain('blob:mock-url')
      expect(downloadLink?.download).toBe('untitled.flowprint.yaml')
      expect(revokeUrl).toHaveBeenCalledWith('blob:mock-url')
      expect(result.current.dirty).toBe(false)

      createSpy.mockRestore()
      createUrl.mockRestore()
      revokeUrl.mockRestore()
    })
  })

  describe('user cancellation', () => {
    it('silently ignores AbortError from native picker', async () => {
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError')),
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const onError = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded, onError }))

      await act(async () => {
        await result.current.openFile()
      })

      expect(onError).not.toHaveBeenCalled()
      expect(onDocLoaded).not.toHaveBeenCalled()
    })
  })

  describe('dirty state', () => {
    it('setDirty updates the dirty flag', () => {
      const onDocLoaded = vi.fn()
      const { result } = renderHook(() => useFileManager({ doc: MOCK_DOC, onDocLoaded }))

      expect(result.current.dirty).toBe(false)

      act(() => {
        result.current.setDirty(true)
      })
      expect(result.current.dirty).toBe(true)

      act(() => {
        result.current.setDirty(false)
      })
      expect(result.current.dirty).toBe(false)
    })
  })
})

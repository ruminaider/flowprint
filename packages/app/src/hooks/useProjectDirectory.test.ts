/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { validate, migrate, validateRulesYaml } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { parse } from 'yaml'
import { useProjectDirectory } from './useProjectDirectory'

vi.mock('@ruminaider/flowprint-schema', () => ({
  validate: vi.fn(),
  migrate: vi.fn(),
  validateRulesYaml: vi.fn(),
}))

vi.mock('yaml', () => ({
  parse: vi.fn(),
}))

const MOCK_DOC: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test-flow',
  version: '0.1.0',
  lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
  nodes: {
    apply_discount: {
      type: 'action',
      lane: 'main',
      label: 'Apply Discount',
      rules: { file: 'discount.rules.yaml' },
    } as FlowprintDocument['nodes'][string],
    route_order: {
      type: 'switch',
      lane: 'main',
      label: 'Route Order',
      rules: { file: 'routing.rules.yaml' },
    } as FlowprintDocument['nodes'][string],
  },
}

const MOCK_DOC_NO_RULES: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'simple-flow',
  version: '0.1.0',
  lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
  nodes: {
    step1: {
      type: 'action',
      lane: 'main',
      label: 'Step 1',
    },
  },
}

const VALID_YAML = 'schema: flowprint/1.0\nname: test-flow\n'
const VALID_RULES_YAML = 'schema: flowprint-rules/1.0\nhit_policy: first\nrules: []\n'

const MOCK_RULES_DATA = {
  schema: 'flowprint-rules/1.0',
  hit_policy: 'first',
  rules: [{ when: { amount: { gt: 100 } }, then: { discount: 0.1 } }],
}

function createMockFile(name: string, content: string) {
  const file = new File([content], name, { type: 'text/yaml' })
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(content),
    })
  }
  return file
}

function createMockFileHandle(name: string, content: string) {
  return {
    kind: 'file' as const,
    name,
    getFile: vi.fn().mockResolvedValue(createMockFile(name, content)),
  }
}

function createMockDirectoryHandle(
  name: string,
  entries: Record<string, { kind: 'file'; name: string; content: string }>,
) {
  const fileHandles = new Map<string, ReturnType<typeof createMockFileHandle>>()
  for (const [key, entry] of Object.entries(entries)) {
    fileHandles.set(key, createMockFileHandle(entry.name, entry.content))
  }

  return {
    kind: 'directory' as const,
    name,
    getFileHandle: vi.fn().mockImplementation((fileName: string) => {
      const handle = fileHandles.get(fileName)
      if (!handle) {
        return Promise.reject(new DOMException(`File not found: ${fileName}`, 'NotFoundError'))
      }
      return Promise.resolve(handle)
    }),
    getDirectoryHandle: vi.fn().mockRejectedValue(
      new DOMException('Not a directory', 'NotFoundError'),
    ),
    values: vi.fn().mockImplementation(function* () {
      for (const entry of Object.values(entries)) {
        yield { kind: 'file' as const, name: entry.name }
      }
    }),
  }
}

describe('useProjectDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(migrate).mockReturnValue({ status: 'current', doc: MOCK_DOC })
    vi.mocked(validate).mockReturnValue({ valid: true, errors: [] })
    vi.mocked(validateRulesYaml).mockReturnValue({ valid: true, errors: [] })
    vi.mocked(parse).mockReturnValue(MOCK_DOC)

    delete (window as unknown as Record<string, unknown>).showDirectoryPicker
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker
  })

  describe('supportsDirectoryPicker', () => {
    it('is false when showDirectoryPicker is not on window', () => {
      const { result } = renderHook(() =>
        useProjectDirectory({
          onDocLoaded: vi.fn(),
          onRulesResolved: vi.fn(),
        }),
      )
      expect(result.current.supportsDirectoryPicker).toBe(false)
    })

    it('is true when showDirectoryPicker is on window', () => {
      Object.defineProperty(window, 'showDirectoryPicker', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      })
      const { result } = renderHook(() =>
        useProjectDirectory({
          onDocLoaded: vi.fn(),
          onRulesResolved: vi.fn(),
        }),
      )
      expect(result.current.supportsDirectoryPicker).toBe(true)
    })
  })

  describe('openProject', () => {
    it('finds blueprint, reads, validates, and calls onDocLoaded', async () => {
      const dirHandle = createMockDirectoryHandle('my-project', {
        'flow.flowprint.yaml': {
          kind: 'file',
          name: 'flow.flowprint.yaml',
          content: VALID_YAML,
        },
      })
      vi.mocked(parse).mockReturnValue(MOCK_DOC_NO_RULES)

      Object.defineProperty(window, 'showDirectoryPicker', {
        value: vi.fn().mockResolvedValue(dirHandle),
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const onRulesResolved = vi.fn()
      const { result } = renderHook(() =>
        useProjectDirectory({ onDocLoaded, onRulesResolved }),
      )

      await act(async () => {
        await result.current.openProject()
      })

      expect(migrate).toHaveBeenCalledWith(MOCK_DOC_NO_RULES)
      expect(validate).toHaveBeenCalledWith(MOCK_DOC_NO_RULES)
      expect(onDocLoaded).toHaveBeenCalledWith(MOCK_DOC_NO_RULES, 'flow.flowprint.yaml')
      expect(result.current.projectName).toBe('my-project')
      expect(onRulesResolved).toHaveBeenCalledWith({})
    })

    it('resolves rules files and calls onRulesResolved with correct map', async () => {
      const dirHandle = createMockDirectoryHandle('my-project', {
        'flow.flowprint.yaml': {
          kind: 'file',
          name: 'flow.flowprint.yaml',
          content: VALID_YAML,
        },
        'discount.rules.yaml': {
          kind: 'file',
          name: 'discount.rules.yaml',
          content: VALID_RULES_YAML,
        },
        'routing.rules.yaml': {
          kind: 'file',
          name: 'routing.rules.yaml',
          content: VALID_RULES_YAML,
        },
      })

      // First parse call returns the blueprint doc, subsequent calls return rules data
      vi.mocked(parse)
        .mockReturnValueOnce(MOCK_DOC)
        .mockReturnValue(MOCK_RULES_DATA)

      Object.defineProperty(window, 'showDirectoryPicker', {
        value: vi.fn().mockResolvedValue(dirHandle),
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const onRulesResolved = vi.fn()
      const { result } = renderHook(() =>
        useProjectDirectory({ onDocLoaded, onRulesResolved }),
      )

      await act(async () => {
        await result.current.openProject()
      })

      expect(onRulesResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          'discount.rules.yaml': expect.objectContaining({
            data: MOCK_RULES_DATA,
          }),
          'routing.rules.yaml': expect.objectContaining({
            data: MOCK_RULES_DATA,
          }),
        }),
      )
    })

    it('produces error entry for missing rules files', async () => {
      const dirHandle = createMockDirectoryHandle('my-project', {
        'flow.flowprint.yaml': {
          kind: 'file',
          name: 'flow.flowprint.yaml',
          content: VALID_YAML,
        },
        // discount.rules.yaml exists, routing.rules.yaml does NOT
        'discount.rules.yaml': {
          kind: 'file',
          name: 'discount.rules.yaml',
          content: VALID_RULES_YAML,
        },
      })

      vi.mocked(parse)
        .mockReturnValueOnce(MOCK_DOC)
        .mockReturnValue(MOCK_RULES_DATA)

      Object.defineProperty(window, 'showDirectoryPicker', {
        value: vi.fn().mockResolvedValue(dirHandle),
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const onRulesResolved = vi.fn()
      const { result } = renderHook(() =>
        useProjectDirectory({ onDocLoaded, onRulesResolved }),
      )

      await act(async () => {
        await result.current.openProject()
      })

      expect(onRulesResolved).toHaveBeenCalled()
      const rulesMap = onRulesResolved.mock.calls[0]![0] as Record<string, unknown>
      expect(rulesMap['routing.rules.yaml']).toEqual(
        expect.objectContaining({
          validationErrors: expect.arrayContaining([
            expect.stringContaining('routing.rules.yaml'),
          ]) as string[],
        }),
      )
    })

    it('produces validation errors for invalid rules files', async () => {
      const dirHandle = createMockDirectoryHandle('my-project', {
        'flow.flowprint.yaml': {
          kind: 'file',
          name: 'flow.flowprint.yaml',
          content: VALID_YAML,
        },
        'discount.rules.yaml': {
          kind: 'file',
          name: 'discount.rules.yaml',
          content: 'bad: content',
        },
        'routing.rules.yaml': {
          kind: 'file',
          name: 'routing.rules.yaml',
          content: VALID_RULES_YAML,
        },
      })

      vi.mocked(parse)
        .mockReturnValueOnce(MOCK_DOC)
        .mockReturnValue(MOCK_RULES_DATA)

      vi.mocked(validateRulesYaml)
        .mockReturnValueOnce({
          valid: false,
          errors: [
            { path: '/schema', message: 'Missing required property: schema', severity: 'error' },
          ],
        })
        .mockReturnValue({ valid: true, errors: [] })

      Object.defineProperty(window, 'showDirectoryPicker', {
        value: vi.fn().mockResolvedValue(dirHandle),
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const onRulesResolved = vi.fn()
      const { result } = renderHook(() =>
        useProjectDirectory({ onDocLoaded, onRulesResolved }),
      )

      await act(async () => {
        await result.current.openProject()
      })

      const rulesMap = onRulesResolved.mock.calls[0]![0] as Record<
        string,
        { validationErrors?: string[] }
      >
      expect(rulesMap['discount.rules.yaml']?.validationErrors).toBeDefined()
      expect(rulesMap['discount.rules.yaml']!.validationErrors!.length).toBeGreaterThan(0)
    })

    it('silently ignores AbortError from user cancel', async () => {
      Object.defineProperty(window, 'showDirectoryPicker', {
        value: vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError')),
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const onRulesResolved = vi.fn()
      const onError = vi.fn()
      const { result } = renderHook(() =>
        useProjectDirectory({ onDocLoaded, onRulesResolved, onError }),
      )

      await act(async () => {
        await result.current.openProject()
      })

      expect(onError).not.toHaveBeenCalled()
      expect(onDocLoaded).not.toHaveBeenCalled()
    })

    it('calls onError when no blueprint found', async () => {
      const dirHandle = createMockDirectoryHandle('empty-project', {})
      Object.defineProperty(window, 'showDirectoryPicker', {
        value: vi.fn().mockResolvedValue(dirHandle),
        writable: true,
        configurable: true,
      })

      const onDocLoaded = vi.fn()
      const onRulesResolved = vi.fn()
      const onError = vi.fn()
      const { result } = renderHook(() =>
        useProjectDirectory({ onDocLoaded, onRulesResolved, onError }),
      )

      await act(async () => {
        await result.current.openProject()
      })

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No .flowprint.yaml file found') as string,
        }),
      )
      expect(onDocLoaded).not.toHaveBeenCalled()
    })
  })
})

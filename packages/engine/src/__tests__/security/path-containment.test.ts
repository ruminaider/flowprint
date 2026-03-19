import { describe, it, expect } from 'vitest'
import { assertWithinProject } from '../../security/path-containment.js'

describe('assertWithinProject', () => {
  const projectRoot = '/home/user/project'

  it('allows a path within the project root', () => {
    expect(() => assertWithinProject('src/main.ts', projectRoot)).not.toThrow()
  })

  it('allows a nested path within the project root', () => {
    expect(() => assertWithinProject('src/rules/order.rules.yaml', projectRoot)).not.toThrow()
  })

  it('throws on ../../etc/passwd style traversal', () => {
    expect(() => assertWithinProject('../../etc/passwd', projectRoot)).toThrow(
      /resolves outside project root/,
    )
  })

  it('throws on absolute path outside project', () => {
    expect(() => assertWithinProject('/etc/passwd', projectRoot)).toThrow(
      /resolves outside project root/,
    )
  })

  it('error message shows relative path, not absolute', () => {
    try {
      assertWithinProject('../../etc/passwd', projectRoot)
      expect.fail('should have thrown')
    } catch (err) {
      const message = (err as Error).message
      expect(message).toContain('../../etc/passwd')
      expect(message).not.toContain(projectRoot)
    }
  })

  it('throws on path that starts with projectRoot as prefix but is not a child', () => {
    // /home/user/project-extra is not inside /home/user/project
    expect(() => assertWithinProject('../project-extra/file', projectRoot)).toThrow(
      /resolves outside project root/,
    )
  })

  it('allows the project root itself', () => {
    expect(() => assertWithinProject('.', projectRoot)).not.toThrow()
  })

  it('throws on sneaky path with encoded traversal', () => {
    expect(() => assertWithinProject('src/../../../etc/shadow', projectRoot)).toThrow(
      /resolves outside project root/,
    )
  })
})

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getUploadZoneStyles } from './CvUploadZone'

describe('getUploadZoneStyles', () => {
  it('should return default styling classes when state is default', () => {
    const styles = getUploadZoneStyles('default')
    assert.ok(styles.includes('border-gray-800'))
    assert.ok(styles.includes('bg-gray-900/40'))
  })

  it('should return dragging styling classes when state is dragging', () => {
    const styles = getUploadZoneStyles('dragging')
    assert.ok(styles.includes('border-violet-500'))
    assert.ok(styles.includes('bg-violet-950/20'))
    assert.ok(styles.includes('scale-[1.01]'))
  })

  it('should return uploading styling classes when state is uploading', () => {
    const styles = getUploadZoneStyles('uploading')
    assert.ok(styles.includes('border-blue-500'))
    assert.ok(styles.includes('cursor-not-allowed'))
  })

  it('should return success styling classes when state is success', () => {
    const styles = getUploadZoneStyles('success')
    assert.ok(styles.includes('border-emerald-500'))
    assert.ok(styles.includes('bg-emerald-950/10'))
  })

  it('should return error styling classes when state is error', () => {
    const styles = getUploadZoneStyles('error')
    assert.ok(styles.includes('border-rose-500'))
    assert.ok(styles.includes('bg-rose-950/10'))
  })
})

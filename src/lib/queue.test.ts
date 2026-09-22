import { transitionJob } from './queue'
import type { ImageJob } from '../types'

const job = { status: 'queued' } as ImageJob

describe('queue transitions', () => {
  it('supports the conversion lifecycle', () => {
    const converting = transitionJob(job, 'converting')
    expect(transitionJob(converting, 'complete').status).toBe('complete')
  })
  it('rejects impossible transitions', () =>
    expect(() => transitionJob(job, 'complete')).toThrow(/queued → complete/))
})

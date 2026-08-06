import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldTriggerDailyRefresh } from '../../lib/orchestrator/dailyRefresh.js'

test('triggers refresh when there is no recent news post', () => {
  const now = new Date('2026-07-28T12:00:00.000Z')
  const posts = [
    { title: 'Older guide', status: 'published', type: 'knowledge', publishedAt: '2026-07-27T10:00:00.000Z' },
  ]

  assert.equal(shouldTriggerDailyRefresh(posts, now), true)
})

test('skips refresh when a news post was published recently', () => {
  const now = new Date('2026-07-28T12:00:00.000Z')
  const posts = [
    { title: 'Fresh news', status: 'published', type: 'news', publishedAt: '2026-07-28T08:00:00.000Z' },
  ]

  assert.equal(shouldTriggerDailyRefresh(posts, now), false)
})

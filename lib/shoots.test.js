import assert from 'node:assert/strict'
import test from 'node:test'
import {
  dateUpdate,
  filterShoots,
  isShootListUnavailable,
  labelsFromProperty,
  pageInDatabase,
  shootPatchError,
  sortShoots,
  statusUpdate,
  textFromProperty,
  toShoot,
} from './shoots.js'

const either = { id: '1', idea: 'Either idea', status: 'Idea', family: ['Either'], priority: 'Low', targetDate: '2026-11-01' }
const silvers = { id: '2', idea: 'Silvers idea', status: 'Planned', family: ['Silvers'], priority: 'High', targetDate: null }
const newsom = { id: '3', idea: 'Newsom idea', status: 'Posted', family: ['Newsom'], priority: 'Medium', targetDate: '2026-10-01' }
const both = { id: '4', idea: 'Both', status: 'Shot', family: ['Silvers', 'Newsom'], priority: 'High', targetDate: '2026-10-20' }
const undatedLow = { id: '5', idea: 'Later', status: 'Edited', family: ['Silvers'], priority: 'Low', targetDate: '2026-01-02' }

test('Either rows show under Silvers and Newsom', () => {
  const items = [either, silvers, newsom, both]
  const silversIds = filterShoots(items, { family: 'Silvers', hidePosted: false }).map(item => item.id)
  const newsomIds = filterShoots(items, { family: 'Newsom', hidePosted: false }).map(item => item.id)
  assert.deepEqual(silversIds, ['1', '2', '4'])
  assert.deepEqual(newsomIds, ['1', '3', '4'])
})

test('hide posted is independent of family', () => {
  const visible = filterShoots([either, newsom], { family: 'All', hidePosted: true })
  assert.deepEqual(visible.map(item => item.id), ['1'])
})

test('sorts High first, then soonest date, empty dates last', () => {
  const sorted = sortShoots([undatedLow, newsom, silvers, both, either])
  assert.deepEqual(sorted.map(item => item.id), ['4', '2', '3', '5', '1'])
})

test('reads select, multi-select, and text properties', () => {
  const page = {
    id: 'page-1',
    properties: {
      Idea: { type: 'title', title: [{ plain_text: 'Barn light' }] },
      Status: { type: 'select', select: { name: 'Shot' } },
      Family: { type: 'multi_select', multi_select: [{ name: 'Either' }] },
      Species: { type: 'rich_text', rich_text: [{ plain_text: 'Sheep, Goat' }] },
      Format: { type: 'select', select: { name: 'Carousel' } },
      'Maslow Layer': { type: 'status', status: { name: 'Belonging' } },
      Hook: { type: 'rich_text', rich_text: [{ plain_text: 'Look closer' }] },
      'Shot Notes': { type: 'rich_text', rich_text: [{ plain_text: 'Wide, then hands' }] },
      Gear: { type: 'title', title: [{ plain_text: 'Tripod' }] },
      'Target Shoot Date': { type: 'date', date: { start: '2026-12-05T15:00:00.000Z' } },
      'Posted Link': { type: 'url', url: 'https://example.com/post' },
      Priority: { type: 'rich_text', rich_text: [{ plain_text: 'High' }] },
    },
  }
  const shoot = toShoot(page)
  assert.equal(shoot.idea, 'Barn light')
  assert.equal(shoot.status, 'Shot')
  assert.deepEqual(shoot.family, ['Either'])
  assert.deepEqual(shoot.species, ['Sheep', 'Goat'])
  assert.equal(shoot.format, 'Carousel')
  assert.equal(shoot.maslow, 'Belonging')
  assert.equal(shoot.hook, 'Look closer')
  assert.equal(shoot.shotNotes, 'Wide, then hands')
  assert.equal(shoot.gear, 'Tripod')
  assert.equal(shoot.targetDate, '2026-12-05')
  assert.equal(shoot.postedLink, 'https://example.com/post')
  assert.equal(shoot.priority, 'High')
  assert.equal(textFromProperty({ type: 'select', select: { name: 'Reel/Vertical' } }), 'Reel/Vertical')
  assert.deepEqual(labelsFromProperty({ type: 'multi_select', multi_select: [{ name: 'Goat' }] }), ['Goat'])
})

test('rejects Posted status and Posted Link writes', () => {
  assert.equal(shootPatchError({ id: '1', status: 'Posted' }), 'Status cannot be set to Posted')
  assert.equal(shootPatchError({ id: '1', status: 'posted' }), 'Status cannot be set to Posted')
  assert.equal(shootPatchError({ id: '1', status: 'Shot', postedLink: 'https://x.test' }), 'Posted Link cannot be edited here')
  assert.equal(shootPatchError({ id: '1', status: 'Shot', 'Posted Link': 'https://x.test' }), 'Posted Link cannot be edited here')
  assert.equal(shootPatchError({ id: '1', status: 'Archived' }), 'Status must be Idea, Planned, Shot, or Edited')
  assert.equal(shootPatchError({ id: '1', status: 'Edited' }), null)
  assert.equal(shootPatchError({ id: '1', targetDate: null }), null)
  assert.equal(shootPatchError({ id: '1', targetDate: '2026-10-21' }), null)
  assert.equal(shootPatchError({ id: '1', targetDate: 'October 21' }), 'Target Shoot Date must be YYYY-MM-DD')
})

test('writes status and date in the property type Notion stored', () => {
  assert.deepEqual(statusUpdate({ type: 'select' }, 'Shot'), { select: { name: 'Shot' } })
  assert.deepEqual(statusUpdate({ type: 'multi_select' }, 'Shot'), { multi_select: [{ name: 'Shot' }] })
  assert.deepEqual(statusUpdate({ type: 'rich_text' }, 'Shot'), { rich_text: [{ type: 'text', text: { content: 'Shot' } }] })
  assert.deepEqual(dateUpdate({ type: 'date' }, '2026-10-21'), { date: { start: '2026-10-21' } })
  assert.deepEqual(dateUpdate({ type: 'date' }, null), { date: null })
  assert.deepEqual(dateUpdate({ type: 'rich_text' }, null), { rich_text: [] })
})

test('only updates pages in the shoot list database', () => {
  const page = { parent: { type: 'database_id', database_id: '397fafad-348c-4d1d-b2d6-ba9c5333711c' } }
  assert.equal(pageInDatabase(page, '397fafad348c4d1db2d6ba9c5333711c'), true)
  assert.equal(pageInDatabase(page, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), false)
})

test('treats a missing Notion share as unavailable', () => {
  assert.equal(isShootListUnavailable({ code: 'object_not_found', status: 404 }), true)
  assert.equal(isShootListUnavailable({ code: 'validation_error', status: 400 }), false)
})

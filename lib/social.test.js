import assert from 'node:assert/strict'
import test from 'node:test'
import {
  APPROVALS_NEEDED,
  GATE_LABEL,
  REVIEWERS,
  SOCIAL_CALENDAR_DB_FALLBACK,
  approvalCounter,
  capabilitiesFor,
  filterSocialPosts,
  formatStamp,
  isPlaceholderTeammate,
  isSocialCalendarPage,
  matchReviewer,
  notionPropertyWrites,
  planReviewAction,
  richTextChunks,
  schemaUpdates,
  socialCalendarDbId,
  sortSocialPosts,
  statusPropertyUpdate,
  toSocialPost,
  withInReviewOption,
} from './social.js'

const inReview = {
  status: 'In Review',
  approvedBy: [],
  caption: 'Dry them first.',
  revisionNotes: '',
}

test('gate copy is 2 of 5', () => {
  assert.equal(REVIEWERS.length, 5)
  assert.equal(APPROVALS_NEEDED, 2)
  assert.equal(GATE_LABEL, '2 of 5')
  assert.equal(approvalCounter(0), '0 of 5 · 2 of 5 needed')
  assert.equal(approvalCounter(1), '1 of 5 · 2 of 5 needed')
  assert.equal(approvalCounter(2), '2 of 5 approved')
  assert.deepEqual(REVIEWERS, ['Sam', 'Logan', 'Jurahee', 'Conner', 'Jenny Bett'])
})

test('maps team names onto Approved By labels', () => {
  assert.equal(matchReviewer('Sam Silvers'), 'Sam')
  assert.equal(matchReviewer('Logan Newsom'), 'Logan')
  assert.equal(matchReviewer('Jurahee Silvers'), 'Jurahee')
  assert.equal(matchReviewer('Conner Newsom'), 'Conner')
  assert.equal(matchReviewer('Jenny Bett Newsom'), 'Jenny Bett')
  assert.equal(matchReviewer('Jenny Bett'), 'Jenny Bett')
  assert.equal(matchReviewer('Jenny'), null)
  assert.equal(matchReviewer('JB'), 'Conner')
  assert.equal(matchReviewer('JB Newsom'), 'Conner')
  assert.equal(matchReviewer('Editor/Social Hire (TBD)'), null)
  assert.equal(matchReviewer('Katy Newsom'), null)
  assert.equal(isPlaceholderTeammate('Editor/Social Hire (TBD)'), true)
})

test('permissions: reviewers approve, Katy overrides, Producer can send to review', () => {
  const sam = capabilitiesFor('Sam Silvers', ['Host'])
  assert.equal(sam.canApprove, true)
  assert.equal(sam.canRequestEdits, true)
  assert.equal(sam.canEditCaption, true)
  assert.equal(sam.canSendToReview, false)
  assert.equal(sam.canOverride, false)
  assert.equal(sam.reviewer, 'Sam')

  const jenny = capabilitiesFor('Jenny Bett Newsom', [])
  assert.equal(jenny.reviewer, 'Jenny Bett')
  assert.equal(jenny.canApprove, true)
  assert.equal(jenny.canOverride, false)

  const katy = capabilitiesFor('Katy Newsom', ['Ops'])
  assert.equal(katy.canApprove, false)
  assert.equal(katy.canSendToReview, true)
  assert.equal(katy.canOverride, true)
  assert.equal(katy.canRequestEdits, true)
  assert.equal(katy.canEditCaption, true)

  const producer = capabilitiesFor('Alex Rivera', ['Producer'])
  assert.equal(producer.canApprove, false)
  assert.equal(producer.canOverride, false)
  assert.equal(producer.canSendToReview, true)
  assert.equal(producer.canRequestEdits, true)

  const ops = capabilitiesFor('Someone Else', ['Ops'])
  assert.equal(ops.canSendToReview, false)
  assert.equal(ops.canOverride, false)

  const hire = capabilitiesFor('Editor/Social Hire (TBD)', ['Editor', 'Social'])
  assert.equal(hire.canApprove, false)
  assert.equal(hire.canSendToReview, false)
})

test('two approvals move In Review to Ready to Post', () => {
  const first = planReviewAction({ action: 'approve', author: 'Sam Silvers', item: inReview })
  assert.equal(first.ok, true)
  assert.equal(first.item.status, 'In Review')
  assert.deepEqual(first.item.approvedBy, ['Sam'])
  assert.equal(first.mentionKaty, false)
  assert.equal(first.comment, null)
  assert.deepEqual(first.properties['Approved By'], ['Sam'])
  assert.equal(first.properties.Status, undefined)

  const second = planReviewAction({
    action: 'approve',
    author: 'Jenny Bett Newsom',
    item: { ...inReview, approvedBy: first.item.approvedBy },
  })
  assert.equal(second.ok, true)
  assert.equal(second.item.status, 'Ready to Post')
  assert.deepEqual(second.item.approvedBy, ['Sam', 'Jenny Bett'])
  assert.equal(second.item.approvalCount, 2)
  assert.equal(second.mentionKaty, true)
  assert.match(second.comment, /2 of 5/)
  assert.match(second.comment, /Sam and Jenny Bett/)
  assert.equal(second.properties.Status, 'Ready to Post')
})

test('approving twice does not double count', () => {
  const again = planReviewAction({
    action: 'approve',
    author: 'Logan Newsom',
    item: { ...inReview, approvedBy: ['Logan'] },
  })
  assert.equal(again.noop, true)
  assert.deepEqual(again.item.approvedBy, ['Logan'])
  assert.equal(again.item.status, 'In Review')
})

test('only reviewers can approve, and only from In Review', () => {
  const katy = planReviewAction({ action: 'approve', author: 'Katy Newsom', roles: ['Ops'], item: inReview })
  assert.equal(katy.ok, false)
  assert.equal(katy.statusCode, 403)

  const early = planReviewAction({
    action: 'approve',
    author: 'Conner Newsom',
    item: { ...inReview, status: 'In Edit' },
  })
  assert.equal(early.ok, false)
  assert.equal(early.statusCode, 409)

  const nobody = planReviewAction({ action: 'approve', author: '', item: inReview })
  assert.equal(nobody.statusCode, 400)
})

test('JB approves as Conner and does not collide with Jenny Bett', () => {
  const plan = planReviewAction({ action: 'approve', author: 'JB', item: inReview })
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.item.approvedBy, ['Conner'])
})

test('ask for edits and caption edits return to In Edit and clear approvals', () => {
  const ready = {
    status: 'Ready to Post',
    approvedBy: ['Sam', 'Logan'],
    caption: 'Old caption',
    revisionNotes: '',
  }
  const edits = planReviewAction({
    action: 'request-edits',
    author: 'Katy Newsom',
    roles: ['Ops'],
    comment: 'Tighten the hook',
    item: ready,
  })
  assert.equal(edits.ok, true)
  assert.equal(edits.item.status, 'In Edit')
  assert.deepEqual(edits.item.approvedBy, [])
  assert.equal(edits.item.revisionNotes, 'Tighten the hook')
  assert.equal(edits.properties.Status, 'In Edit')
  assert.deepEqual(edits.properties['Approved By'], [])
  assert.match(edits.comment, /Tighten the hook/)

  const missing = planReviewAction({
    action: 'request-edits',
    author: 'Sam Silvers',
    comment: '   ',
    item: inReview,
  })
  assert.equal(missing.statusCode, 400)

  const stranger = planReviewAction({
    action: 'request-edits',
    author: 'Editor/Social Hire (TBD)',
    roles: ['Editor', 'Social'],
    comment: 'No',
    item: inReview,
  })
  assert.equal(stranger.statusCode, 403)

  const caption = planReviewAction({
    action: 'save-caption',
    author: 'Jurahee Silvers',
    caption: '  New caption  ',
    item: ready,
  })
  assert.equal(caption.ok, true)
  assert.equal(caption.item.status, 'In Edit')
  assert.deepEqual(caption.item.approvedBy, [])
  assert.equal(caption.item.caption, 'New caption')
  assert.equal(caption.properties['Caption Draft'], 'New caption')

  const same = planReviewAction({
    action: 'save-caption',
    author: 'Jurahee Silvers',
    caption: 'Old caption',
    item: ready,
  })
  assert.equal(same.noop, true)
  assert.equal(same.item.status, 'Ready to Post')
  assert.deepEqual(same.item.approvedBy, ['Sam', 'Logan'])
})

test('Katy can send to review and override; a Producer cannot override', () => {
  const sent = planReviewAction({
    action: 'send-to-review',
    author: 'Katy Newsom',
    roles: ['Ops'],
    item: { ...inReview, status: 'In Edit', approvedBy: [] },
  })
  assert.equal(sent.ok, true)
  assert.equal(sent.item.status, 'In Review')

  const reviewer = planReviewAction({
    action: 'send-to-review',
    author: 'Sam Silvers',
    item: { ...inReview, status: 'In Edit' },
  })
  assert.equal(reviewer.statusCode, 403)

  const wrong = planReviewAction({
    action: 'send-to-review',
    author: 'Katy Newsom',
    item: inReview,
  })
  assert.equal(wrong.statusCode, 409)

  const override = planReviewAction({
    action: 'override',
    author: 'Katy Newsom',
    roles: ['Ops'],
    item: { ...inReview, approvedBy: ['Sam'] },
  })
  assert.equal(override.ok, true)
  assert.equal(override.item.status, 'Ready to Post')
  assert.deepEqual(override.item.approvedBy, ['Sam'])
  assert.equal(override.mentionKaty, true)
  assert.match(override.comment, /2 of 5/)
  assert.equal(override.properties.Status, 'Ready to Post')
  assert.equal(override.properties['Approved By'], undefined)

  const producer = planReviewAction({
    action: 'override',
    author: 'Alex Rivera',
    roles: ['Producer'],
    item: inReview,
  })
  assert.equal(producer.statusCode, 403)

  const scheduled = planReviewAction({
    action: 'override',
    author: 'Katy Newsom',
    item: { ...inReview, status: 'Scheduled' },
  })
  assert.equal(scheduled.statusCode, 409)
})

test('review plans never set Scheduled or Posted', () => {
  const actions = ['approve', 'request-edits', 'save-caption', 'send-to-review', 'override']
  for (const action of actions) {
    const plan = planReviewAction({
      action,
      author: action === 'override' || action === 'send-to-review' ? 'Katy Newsom' : 'Sam Silvers',
      roles: ['Ops'],
      comment: 'Please revise',
      caption: 'Changed',
      item: action === 'send-to-review' ? { ...inReview, status: 'In Edit' } : inReview,
    })
    if (!plan.ok || plan.noop) continue
    const status = plan.properties?.Status
    assert.notEqual(status, 'Scheduled')
    assert.notEqual(status, 'Posted')
    if (status) assert.ok(['In Edit', 'In Review', 'Ready to Post'].includes(status))
  }
})

test('schema patch inserts In Review and Jenny Bett without dropping existing options', () => {
  const inserted = withInReviewOption([
    { name: 'Idea', color: 'gray', id: 'idea' },
    { name: 'Script/Outline', color: 'yellow', id: 'script' },
    { name: 'In Edit', color: 'orange', id: 'edit' },
    { name: 'Ready to Post', color: 'green', id: 'ready' },
    { name: 'Scheduled', color: 'blue', id: 'sched' },
    { name: 'Posted', color: 'default', id: 'posted' },
  ])
  assert.deepEqual(inserted.map(option => option.name), [
    'Idea',
    'Script/Outline',
    'In Edit',
    'In Review',
    'Ready to Post',
    'Scheduled',
    'Posted',
  ])
  assert.equal(inserted.find(option => option.name === 'Script/Outline').id, 'script')

  const partial = schemaUpdates({
    'Approved By': {
      type: 'multi_select',
      multi_select: { options: [{ name: 'Sam', id: 'sam', color: 'blue' }] },
    },
    'Canva Link': { type: 'url', url: {} },
    'Revision Notes': { type: 'rich_text', rich_text: {} },
    'Caption Draft': { type: 'rich_text', rich_text: {} },
    Status: {
      type: 'select',
      select: {
        options: [
          { name: 'Idea' },
          { name: 'Script/Outline' },
          { name: 'In Edit' },
          { name: 'Ready to Post' },
        ],
      },
    },
  })
  const names = partial.patch['Approved By'].multi_select.options.map(option => option.name)
  assert.deepEqual(names, REVIEWERS)
  assert.equal(partial.patch['Approved By'].multi_select.options[0].id, 'sam')
  assert.equal(partial.patch.Status.select.options[3].name, 'In Review')
  assert.ok(partial.patch.Status.select.options.some(option => option.name === 'Script/Outline'))

  const live = schemaUpdates({
    'Approved By': {
      type: 'multi_select',
      multi_select: { options: REVIEWERS.map(name => ({ name })) },
    },
    'Canva Link': { type: 'url', url: {} },
    'Revision Notes': { type: 'rich_text', rich_text: {} },
    'Caption Draft': { type: 'rich_text', rich_text: {} },
    Status: {
      type: 'select',
      select: {
        options: ['Idea', 'Script/Outline', 'In Edit', 'In Review', 'Ready to Post', 'Scheduled', 'Posted']
          .map(name => ({ name })),
      },
    },
  })
  assert.deepEqual(live.patch, {})
  assert.deepEqual(live.warnings, [])

  const unreadable = schemaUpdates({
    'Approved By': { type: 'multi_select', multi_select: { options: [] } },
    'Canva Link': { type: 'url', url: {} },
    'Revision Notes': { type: 'rich_text', rich_text: {} },
    'Caption Draft': { type: 'rich_text', rich_text: {} },
    Status: { type: 'select', select: { options: [] } },
  })
  assert.equal(unreadable.patch.Status, undefined)
  assert.equal(unreadable.patch['Approved By'], undefined)
  assert.ok(unreadable.warnings.some(warning => /Status options/i.test(warning)))
  assert.ok(unreadable.warnings.some(warning => /Approved By options/i.test(warning)))
  assert.deepEqual(schemaUpdates({}).patch, {})
  assert.deepEqual(schemaUpdates(null).patch, {})
})

test('reads a Social Calendar page and writes properties back', () => {
  const page = {
    id: 'post-1',
    properties: {
      'Post Title': { type: 'title', title: [{ plain_text: 'Barn check' }] },
      Status: { type: 'select', select: { name: 'In Review' } },
      Platform: { type: 'multi_select', multi_select: [{ name: 'Instagram Reels' }, { name: 'TikTok' }] },
      'Clip Type': { type: 'select', select: { name: 'Vertical Clip' } },
      'Publish Date': { type: 'date', date: { start: '2026-11-03' } },
      'Drive Link': { type: 'url', url: 'https://drive.google.com/file/d/abc' },
      'Canva Link': { type: 'url', url: 'https://www.canva.com/design/abc' },
      'Caption Draft': { type: 'rich_text', rich_text: [{ plain_text: 'Hello ' }, { plain_text: 'barn' }] },
      'Revision Notes': { type: 'rich_text', rich_text: [{ plain_text: 'Shorter.' }] },
      'Approved By': { type: 'multi_select', multi_select: [{ name: 'Logan' }, { name: 'Guest' }] },
      Episode: { type: 'rich_text', rich_text: [{ plain_text: 'Ep 11' }] },
    },
  }
  const post = toSocialPost(page)
  assert.equal(post.title, 'Barn check')
  assert.equal(post.status, 'In Review')
  assert.deepEqual(post.platform, ['Instagram Reels', 'TikTok'])
  assert.equal(post.caption, 'Hello barn')
  assert.deepEqual(post.approvedBy, ['Logan'])
  assert.equal(post.approvalCount, 1)
  assert.equal(post.canvaLink, 'https://www.canva.com/design/abc')

  const writes = notionPropertyWrites(page.properties, {
    Status: 'In Edit',
    'Approved By': [],
    'Caption Draft': 'Hello barn',
    'Revision Notes': 'Shorter.',
  })
  assert.deepEqual(writes.Status, { select: { name: 'In Edit' } })
  assert.deepEqual(writes['Approved By'], { multi_select: [] })
  assert.equal(writes['Caption Draft'].rich_text[0].text.content, 'Hello barn')
  assert.throws(() => statusPropertyUpdate(page.properties.Status, 'Posted'), /cannot be set/i)
  assert.equal(richTextChunks('a'.repeat(2001)).length, 2)
  assert.equal(richTextChunks('a'.repeat(2001))[1].text.content.length, 1)
})

test('sorts review queue and knows the calendar ids', () => {
  const sorted = sortSocialPosts([
    { id: '1', title: 'Later', status: 'Ready to Post', publishDate: '2026-11-01' },
    { id: '2', title: 'Edit', status: 'In Edit', publishDate: '2026-10-01' },
    { id: '3', title: 'Review', status: 'In Review', publishDate: '2026-12-01' },
    { id: '4', title: 'Review sooner', status: 'In Review', publishDate: null },
  ])
  assert.deepEqual(sorted.map(item => item.id), ['3', '4', '2', '1'])
  assert.deepEqual(filterSocialPosts(sorted, 'In Review').map(item => item.id), ['3', '4'])

  assert.equal(socialCalendarDbId({}), SOCIAL_CALENDAR_DB_FALLBACK)
  assert.equal(socialCalendarDbId({ NOTION_SOCIAL_CALENDAR_DB_ID: ' abc ' }), 'abc')
  assert.equal(isSocialCalendarPage({
    parent: { database_id: '75f92709-2fdd-4e22-a9e4-f9a974560f05' },
  }), true)
  assert.equal(isSocialCalendarPage({
    parent: { data_source_id: '40adab62-a73e-408b-9e3f-9b0993186356' },
  }), true)
  assert.equal(isSocialCalendarPage({
    parent: { database_id: '11111111-1111-1111-1111-111111111111' },
  }), false)
  assert.equal(formatStamp(new Date('2026-10-29T06:00:00.000Z')).includes('2026'), true)
})

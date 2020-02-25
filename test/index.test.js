const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { createProbot } = require('probot')
// Requiring our fixtures
const errorStatusPayload = require('./fixtures/error_status.json')
const pendingStatusPayload = require('./fixtures/pending_status.json')

describe('index', () => {
  let probot

  beforeEach(() => {
    nock.disableNetConnect()
    probot = createProbot({ id: 1, cert: 'test', githubToken: 'test' })
    probot.load(myProbotApp)

    nock('https://api.github.com')
      .post('/app/installations/34/access_tokens')
      .reply(200, { token: 'test' })
  })

  test('error status', async () => {
    nock('https://octodemo.com')
      .post('/api/v3/repos/issc29-org/hygieia/check-runs', (body) => {
        expect(body).toEqual(expect.objectContaining({
          name: 'LGTM Compliance: Java',
          head_sha: '571c8060e3a7bfe01fb1e00496e1b66681bb7eda',
          status: 'completed',
          details_url:
         'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-7360af19c9f24774615b71538b0884baa8b924fc',
          conclusion: 'failure',
          output: {
            title: 'LGTM Compliance Failed - LGTM Analysis Failure',
            summary:
            'LGTM Analysis Failure: This pull request can\\\'t be analyzed because it has merge conflicts'
          }
        }))
        return true
      })
      .reply(200)
    await probot.receive({ name: 'status', id: '3b5c95ca-4db0-11ea-8785-c9b9fdcbd509', payload: errorStatusPayload })
  })

  test('pending status', async () => {
    nock('https://octodemo.com')
      .post('/api/v3/repos/issc29-org/hygieia/check-runs', (body) => {
        expect(body).toEqual(expect.objectContaining({
          name: 'LGTM Compliance: JavaScript',
          head_sha: '99c67093f5da9d55baabd30dcbf24dc21d0eb720',
          status: 'queued',
          details_url:
        'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-640d9a519959c5036f704887abb8e9c94bfe4624'
        }))
        return true
      })
      .reply(200)
    await probot.receive({ name: 'status', id: '3b5c95ca-4db0-11ea-8785-c9b9fdcbd509', payload: pendingStatusPayload })
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

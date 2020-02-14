const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const pendingStatusPayload = require('./fixtures/error_status.json')
const fs = require('fs')
const path = require('path')

describe('My Probot app', () => {
  let probot
  let mockCert

  beforeAll((done) => {
    process.env = Object.assign(process.env, { GHE_HOST: 'ghe.com', LGTM_TOKEN: '12345', LGTM_URL: 'https://lgtm.com' })
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err, cert) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: mockCert })
    // Load our app into probot
    probot.load(myProbotApp)
  })

  test('creates a passing check', async () => {
    
    /*
    nock('https://api.ghe.com')
      .post('/repos/issc29-org/hygieia/check-runs', (body) => {
        expect(body).objectContaining({ status: 'pending' })
        return true
      })
      .reply(200)
*/
    nock.recorder.rec()
      console.log('start')
      console.log({ event: 'status', payload: pendingStatusPayload })
    await probot.receive({ event: 'status', id: 'abc', payload: pendingStatusPayload })
    console.log('end')
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

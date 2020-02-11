const fs = require('fs')
const path = require('path')
const lgtmUtils = require('../lib/lgtmUtils')
const { Context } = require('probot')
jest.mock('request-promise')
const rp = require('request-promise')

describe('lgtmUtils', () => {
  let event
  let context

  beforeEach(async () => {
    event = {
      id: '123',
      name: 'pull_request',
      payload: {
        state: 'success',
        sha: '99c67093f5da9d55baabd30dcbf24dc21d0eb720',
        context: 'LGTM analysis: JavaScript',
        target_url: 'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-640d9a519959c5036f704887abb8e9c94bfe4624',
        description: 'No code changes detected',
        repository: {
          name: 'testRepo',
          owner: {
            login: 'testOrg'
          }
        }
      },
      draft: false
    }

    context = new Context(event, {}, {})
    context.github.checks = {
      update: jest.fn().mockImplementation(async () => {}),
      listForRef: jest.fn().mockImplementation(async () => {
        return {
          data: {
            check_runs: [
              { id: '1245' }
            ]
          }
        }
      })
    }
    context.log = {
      error: jest.fn().mockImplementation((text) => { console.log(text) }),
      info: jest.fn().mockImplementation((text) => { console.log(text) })
    }
  })

  test('completeGitHubCheck with failure', async () => {
    const configContent = {
      javascript: {
        severity: 'warning',
        tags: ['security']
      }
    }

    const createChecksSpy = jest.spyOn(context.github.checks, 'update')

    var alerts = fs.readFileSync(path.join(__dirname, 'fixtures/codereview_alerts_error.json'), 'utf8')
    expect.assertions(1)
    await lgtmUtils.completeGitHubCheck(alerts, context, configContent)
    expect(createChecksSpy).toHaveBeenCalledWith(expect.objectContaining({ conclusion: 'failure', status: 'completed' }))
  })

  test('completeGitHubCheck with success', async () => {
    const configContent = {
      javascript: {
        severity: 'error',
        tags: ['security']
      }
    }

    const createChecksSpy = jest.spyOn(context.github.checks, 'update')

    var alerts = fs.readFileSync(path.join(__dirname, 'fixtures/codereview_alerts_warning.json'), 'utf8')
    expect.assertions(1)
    await lgtmUtils.completeGitHubCheck(alerts, context, configContent)
    expect(createChecksSpy).toHaveBeenCalledWith(expect.objectContaining({ conclusion: 'success', status: 'completed' }))
  })

  test('getLGTMCodeReview when request is successful', async () => {
    const lgtmURL = 'https://lgtm.com/'
    const lgtmToken = 'token123'
    rp.mockReturnValue(Promise.resolve(''))

    lgtmUtils.getLGTMCodeReview(context, lgtmURL, lgtmToken)
    expect(rp).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://lgtm.com/api/v1.0/codereviews/640d9a519959c5036f704887abb8e9c94bfe4624', headers: { Accept: 'application/json', Authorization: `Bearer ${lgtmToken}` } }))
  })

  test('getLGTMCodeReview when URL does not have a slash', async () => {
    const lgtmURL = 'https://lgtm.com'
    const lgtmToken = 'token123'
    rp.mockReturnValue(Promise.resolve(''))

    lgtmUtils.getLGTMCodeReview(context, lgtmURL, lgtmToken)
    expect(rp).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://lgtm.com/api/v1.0/codereviews/640d9a519959c5036f704887abb8e9c94bfe4624', headers: { Accept: 'application/json', Authorization: `Bearer ${lgtmToken}` } }))
  })

  // The last 2 tests call functions within the lgtmUtils module so it is hard to truly unit test these
  test('processLGTMCodeReview', async () => {
    const configContent = {
      data: {
        content: 'amF2YXNjcmlwdDoKICBzZXZlcml0eTogJ3dhcm5pbmcnCiAgdGFnczogWydtYWludGFpbmFiaWxpdHknXQpqYXZhOgogIHNldmVyaXR5OiAnZXJyb3InCiAgdGFnczogWydzZWN1cml0eSddCg=='
      }
    }
    const lgtmURL = 'https://lgtm.com'
    const lgtmToken = 'token123'
    const lgtmInfo = { URL: lgtmURL, Token: lgtmToken }

    rp.mockReturnValue(Promise.reject(Error('Not Authorized')))
    await lgtmUtils.processLGTMCodeReview(configContent, context, lgtmInfo)
    expect(context.log.error).toHaveBeenCalledWith(Error('Not Authorized'))
  })

  test('processLGTMCodeReview', async () => {
    const configContent = {
      data: {
        content: 'amF2YXNjcmlwdDoKICBzZXZlcml0eTogJ3dhcm5pbmcnCiAgdGFnczogWydtYWludGFpbmFiaWxpdHknXQpqYXZhOgogIHNldmVyaXR5OiAnZXJyb3InCiAgdGFnczogWydzZWN1cml0eSddCg=='
      }
    }
    const lgtmURL = 'https://lgtm.com'
    const lgtmToken = 'token123'
    const lgtmInfo = { URL: lgtmURL, Token: lgtmToken }

    rp.mockReturnValue(Promise.resolve())
    await lgtmUtils.processLGTMCodeReview(configContent, context, lgtmInfo)
    expect(context.log.error).toHaveBeenCalledWith('Error updating GitHub Check for Owner: undefined Repo: undefined')
  })
})

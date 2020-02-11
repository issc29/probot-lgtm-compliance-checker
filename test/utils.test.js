const fs = require('fs')
const path = require('path')
const utils = require('../lib/utils')
const { Context } = require('probot')

describe('utils', () => {
  test('isValidLGTMToken is false when empty', () => {
    const lgtmToken = ''
    expect(utils.isValidLGTMToken(lgtmToken)).toEqual(false)
  })

  test('isValidLGTMToken is false when undefined', () => {
    const lgtmToken = undefined
    expect(utils.isValidLGTMToken(lgtmToken)).toEqual(false)
  })

  test('isValidLGTMToken is true when token is entered', () => {
    const lgtmToken = 'abcde123'
    expect(utils.isValidLGTMToken(lgtmToken)).toEqual(true)
  })

  test('isSuccessState is false when pending', () => {
    const state = 'pending'
    expect(utils.isSuccessState(state)).toEqual(false)
  })

  test('isSuccessState is false when error', () => {
    const state = 'error'
    expect(utils.isSuccessState(state)).toEqual(false)
  })

  test('isSuccessState is false when failure', () => {
    const state = 'failure'
    expect(utils.isSuccessState(state)).toEqual(false)
  })

  test('isSuccessState is true when success', () => {
    const state = 'success'
    expect(utils.isSuccessState(state)).toEqual(true)
  })

  test('formatSummaryText', () => {
    const codeReviewURL = 'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-56f48827e1a059061be1b636f2e70ed883dde5a3'
    var alerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/severe_alerts.json'), 'utf8'))
    var output = `This pull request **introduces 1 alert** - [view on LGTM](${codeReviewURL})\n**new alerts:**\n**Name**: XSS Vulnerability **Severity**: error **Tags**: security`
    expect(utils.formatSummaryText(alerts, codeReviewURL)).toEqual(output)
  })

  test('formatSummaryText with multiple alerts', () => {
    const codeReviewURL = 'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-56f48827e1a059061be1b636f2e70ed883dde5a3'
    var alerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/severe_alerts_multiple.json'), 'utf8'))
    var output = `This pull request **introduces 2 alerts** - [view on LGTM](${codeReviewURL})\n**new alerts:**\n**Name**: XSS Vulnerability **Severity**: error **Tags**: security\n**Name**: XSS Vulnerability **Severity**: error **Tags**: security`
    expect(utils.formatSummaryText(alerts, codeReviewURL)).toEqual(output)
  })

  test('containsRequiredTags when requiredTags is true', () => {
    var containsRequiredTags = utils.containsRequiredTags(['maintainability', 'security'], ['security', 'correctness'])
    expect(containsRequiredTags).toEqual(true)
  })

  test('containsRequiredTags with ALL', () => {
    var containsRequiredTags = utils.containsRequiredTags('ALL', ['security', 'correctness'])
    expect(containsRequiredTags).toEqual(true)
  })

  test('containsRequiredTags when requiredTags is false', () => {
    var containsRequiredTags = utils.containsRequiredTags(['security'], ['correctness'])
    expect(containsRequiredTags).toEqual(false)
  })

  test('isSevere is false when severity is less than min', () => {
    var isSevere = utils.isSevere('error', 'warning')
    expect(isSevere).toEqual(false)
  })

  test('isSevere is true when severity is more than min', () => {
    var isSevere = utils.isSevere('warning', 'error')
    expect(isSevere).toEqual(true)
  })

  test('isSevere is true when severity is equal to min', () => {
    var isSevere = utils.isSevere('error', 'error')
    expect(isSevere).toEqual(true)
  })

  test('isSevere is true when severity is equal to min', () => {
    var isSevere = utils.isSevere('ALL', 'recommendation')
    expect(isSevere).toEqual(true)
  })

  test('isNewAlert is true alert is new', () => {
    var alert = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/alert_new.json'), 'utf8'))
    var isNewAlert = utils.isNewAlert(alert)
    expect(isNewAlert).toEqual(true)
  })

  test('isNewAlert is false when alert is fixed', () => {
    var alert = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/alert_fixed.json'), 'utf8'))
    var isNewAlert = utils.isNewAlert(alert)
    expect(isNewAlert).toEqual(false)
  })

  test('getSevereAlerts where is new, servere, and has requiredTags', () => {
    var alerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/alerts.json'), 'utf8'))
    var severeAlerts = utils.getSevereAlerts(alerts, 'error', ['security'])
    var output = JSON.parse('[{"fixed": 0, "new": 1, "query": {"id": 3717280014, "language": "javascript", "name": "XSS Vulnerability", "pack": "com.lgtm/javascript-queries", "properties": {"id": "js/duplicate-switch-case", "name": "Duplicate switch case", "severity": "error", "tags": ["security"]}, "url": "https://lgtm.example.com/rules/3717280014/"}}]')
    expect(severeAlerts).toEqual(output)
  })

  test('getSevereAlerts where severe and has requiredTags', () => {
    var alerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/alerts2.json'), 'utf8'))
    var severeAlerts = utils.getSevereAlerts(alerts, 'warning', ['maintainability'])
    expect(severeAlerts).toEqual(alerts)
  })

  test('getSevereAlerts where not severe', () => {
    var alerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/alerts2.json'), 'utf8'))
    var severeAlerts = utils.getSevereAlerts(alerts, 'error', ['maintainability'])
    var output = JSON.parse(`[{
      "new": 1,
      "query": {
        "pack": "com.lgtm/javascript-queries",
        "url": "https://lgtm.example.com/rules/3717280014/",
        "properties": {
          "tags": [
            "maintainability",
            "correctness",
            "external/cwe/cwe-561"
          ],
          "id": "js/duplicate-switch-case",
          "name": "Duplicate switch case",
          "severity": "error"
        },
        "language": "javascript",
        "id": 3717280014,
        "name": "Duplicate switch case"
      },
      "fixed": 1
    }
  ]
    `)
    expect(severeAlerts).toEqual(output)
  })

  test('getSevereAlerts where severe but doesnt have requiredTag', () => {
    var alerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/alerts3.json'), 'utf8'))
    var severeAlerts = utils.getSevereAlerts(alerts, 'warning', ['security'])
    var output = JSON.parse(`[{
      "new": 1,
      "query": {
        "pack": "com.lgtm/javascript-queries",
        "url": "https://lgtm.example.com/rules/3717280014/",
        "properties": {
          "tags": [
            "security"
          ],
          "id": "js/duplicate-switch-case",
          "name": "Duplicate switch case",
          "severity": "warning"
        },
        "language": "javascript",
        "id": 3717280014,
        "name": "Duplicate switch case"
      },
      "fixed": 0
    }]`)
    expect(severeAlerts).toEqual(output)
  })

  test('getSevereAlerts where severe but doesnt have requiredTag', () => {
    var alerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/alerts3.json'), 'utf8'))
    var severeAlerts = utils.getSevereAlerts(alerts, 'warning', ['security'])
    var output = JSON.parse(`[{
      "new": 1,
      "query": {
        "pack": "com.lgtm/javascript-queries",
        "url": "https://lgtm.example.com/rules/3717280014/",
        "properties": {
          "tags": [
            "security"
          ],
          "id": "js/duplicate-switch-case",
          "name": "Duplicate switch case",
          "severity": "warning"
        },
        "language": "javascript",
        "id": 3717280014,
        "name": "Duplicate switch case"
      },
      "fixed": 0
    }]`)
    expect(severeAlerts).toEqual(output)
  })

  test('createStatus when status is pending', () => {
    const event = {
      id: '123',
      name: 'pull_request',
      payload: {
        state: 'pending',
        sha: '99c67093f5da9d55baabd30dcbf24dc21d0eb720',
        context: 'LGTM analysis: JavaScript',
        target_url: 'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-640d9a519959c5036f704887abb8e9c94bfe4624',
        description: 'Fetching git commits',
        repository: {
          name: 'testRepo',
          owner: {
            login: 'testOrg'
          }
        }
      },
      draft: false
    }

    const context = new Context(event, {}, {})
    context.github.checks = {
      create: jest.fn().mockImplementation(async () => {})
    }

    const createChecksSpy = jest.spyOn(context.github.checks, 'create')
    utils.createStatus(context, new Date())

    expect(createChecksSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }))
  })

  test('createStatus when status is error', () => {
    const event = {
      id: '123',
      name: 'pull_request',
      payload: {
        state: 'error',
        sha: '99c67093f5da9d55baabd30dcbf24dc21d0eb720',
        context: 'LGTM analysis: JavaScript',
        target_url: 'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-640d9a519959c5036f704887abb8e9c94bfe4624',
        description: 'This pull request can\'t be analyzed because it has merge conflicts',
        repository: {
          name: 'testRepo',
          owner: {
            login: 'testOrg'
          }
        }
      },
      draft: false
    }

    const context = new Context(event, {}, {})
    context.github.checks = {
      create: jest.fn().mockImplementation(async () => {})
    }

    const createChecksSpy = jest.spyOn(context.github.checks, 'create')
    utils.createStatus(context, new Date())

    expect(createChecksSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', conclusion: 'failure' }))
  })

  test('createStatus when status is failure', () => {
    const event = {
      id: '123',
      name: 'pull_request',
      payload: {
        state: 'failure',
        sha: '99c67093f5da9d55baabd30dcbf24dc21d0eb720',
        context: 'LGTM analysis: JavaScript',
        target_url: 'https://lgtm.octodemo.com/projects/octodemo-repos/issc29-org/hygieia/rev/pr-640d9a519959c5036f704887abb8e9c94bfe4624',
        description: 'This pull request can\'t be analyzed because it has merge conflicts',
        repository: {
          name: 'testRepo',
          owner: {
            login: 'testOrg'
          }
        }
      },
      draft: false
    }

    const context = new Context(event, {}, {})
    context.github.checks = {
      create: jest.fn().mockImplementation(async () => {})
    }

    const createChecksSpy = jest.spyOn(context.github.checks, 'create')
    utils.createStatus(context, new Date())

    expect(createChecksSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', conclusion: 'failure' }))
  })

  test('createStatus when status is success', () => {
    const event = {
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

    const context = new Context(event, {}, {})
    context.github.checks = {
      create: jest.fn().mockImplementation(async () => {})
    }

    const createChecksSpy = jest.spyOn(context.github.checks, 'create')
    utils.createStatus(context, new Date())

    expect(createChecksSpy).not.toHaveBeenCalled()
  })
})

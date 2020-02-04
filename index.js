const rp = require('request-promise')
const yaml = require('js-yaml')
const util = require('util')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */

// TODO: confirm languages are correct
const languages = {
  'C/C++': 'cpp',
  'C#': 'csharp',
  Go: 'go',
  Java: 'java',
  JavaScript: 'javascript',
  Python: 'python'
}

const LGTMToken = process.env.LGTM_TOKEN
const LGTMURL = (process.env.LGTM_URL) ? process.env.LGTM_URL : 'https://lgtm.com/'
const LGTMURLFormatted = (LGTMURL.charAt(LGTMURL.length - 1) === '/') ? LGTMURL : LGTMURL + '/'

module.exports = app => {
  app.on(['status'], receivedStatus)

  async function receivedStatus (context) {
    const startTime = new Date()
    const logger = app.log
    const params = context.repo({ path: '.github/lgtm-compliance.yml' })
    const { state: statusState } = context.payload

    if (!isValidLGTMToken) {
      return
    }

    console.log('Received Webhook')
    console.log('state: ' + context.payload.state + ' context: ' + context.payload.context)
    console.log(util.inspect(context.payload))

    if (!isSuccessState(statusState)) {
      createStatus(context, startTime)
      return
    }

    context.github.repos.getContents(params).then((configContent) => {
      const content = Buffer.from(configContent.data.content, 'base64').toString()
      const config = yaml.safeLoad(content)
      getLGTMCodeReview(context)
        .then(function (body) {
          handleLGTMRequest(body, context, config)
        })
        .catch(function (err) {
          logger.error(`Error getting LGTM Code Review for for Owner: ${params.owner} Repo: ${params.repo}`)
          logger.error(err)
        })
    }, (reason) => {
      logger.info(`NOTE: config file not found for Owner: ${params.owner} Repo: ${params.repo}`)
    })
  }

  function isValidLGTMToken () {
    if (LGTMToken === '' || LGTMToken === undefined) {
      return false
    }
    return true
  }

  function isSuccessState (statusState) {
    if (statusState === 'pending' || statusState === 'error' || statusState === 'failure') {
      return false
    }
    return true
  }

  function createStatus (context, startTime) {
    const { state: statusState, sha: statusSha, context: statusContext, target_url: statusTargetURL } = context.payload
    const langaugeDescription = statusContext.substring(15)

    if (statusState === 'pending') {
      context.github.checks.create(context.repo({
        name: 'LGTM Compliance: ' + langaugeDescription,
        head_sha: statusSha,
        status: 'queued',
        details_url: statusTargetURL,
        started_at: startTime
      }))
    } else if (statusState === 'error' || statusState === 'failure') {
      context.github.checks.create(context.repo({
        name: 'LGTM Compliance: ' + langaugeDescription,
        head_sha: statusSha,
        status: 'completed',
        details_url: statusTargetURL,
        started_at: startTime,
        conclusion: 'failure',
        completed_at: new Date(),
        output: {
          title: 'LGTM Compliance Failed - LGTM Analysis Failure',
          summary: `LGTM Analysis Failure: ${context.payload.description}`
        }
      }))
    }
  }

  function getLGTMCodeReview (context) {
    const { target_url: statusTargetURL } = context.payload

    // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
    var start = statusTargetURL.indexOf('/rev/pr-')
    var codereviewID = statusTargetURL.substring(start + 8)

    console.log('Success')
    console.log(`LGTM_URL = ${LGTMURLFormatted} | URL = ${LGTMURLFormatted}api/v1.0/codereviews/${codereviewID}`)
    const options = {
      url: `${LGTMURLFormatted}api/v1.0/codereviews/${codereviewID}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + LGTMToken
      }
    }

    return rp(options)
  }

  function isSevere (minSeverity, severity) {
    const severityLevel = {
      recommendation: 1,
      warning: 2,
      error: 3
    }
    if (minSeverity === 'ALL') {
      return true
    }

    // recommendation > warning > error
    if (severityLevel[severity] >= severityLevel[minSeverity]) {
      return true
    } else {
      return false
    }
  }

  function containsRequiredTags (requiredTags, elementTags) {
    if (requiredTags === 'ALL') {
      return true
    }
    for (const requiredTag of requiredTags) {
      if (elementTags.includes(requiredTag)) {
        return true
      }
    }
    return false
  }

  async function handleLGTMRequest (body, context, config) {
    const { sha: statusSha, context: statusContext, target_url: statusTargetURL } = context.payload
    console.log(body)

    var json = JSON.parse(body)
    const langaugeDescription = statusContext.substring(15)
    const languageCode = languages[langaugeDescription]
    var javascriptElement = json.languages.find(element => element.language === languageCode)
    console.log(javascriptElement)

    const minSeverity = config[languageCode].severity
    const requiredTags = config[languageCode].tags
    var severeAlerts = getAlerts(javascriptElement.alerts, minSeverity, requiredTags)
    var conclusion = 'success'
    var title = 'LGTM Compliance Passed'
    var summary = 'LGTM Compliance Passed'

    if (severeAlerts.length > 0) {
      summary = formatSummaryText(severeAlerts, statusTargetURL)
      conclusion = 'failure'
      title = `LGTM Compliance Failed: ${severeAlerts.length} new alert`
    }

    const { data: pendingCheck } = await context.github.checks.listForRef(context.repo({
      ref: statusSha,
      check_name: 'LGTM Compliance: ' + langaugeDescription
    }))

    console.log('Pending Check')
    console.log(pendingCheck)

    return context.github.checks.update(context.repo({
      check_run_id: pendingCheck.check_runs[0].id,
      status: 'completed',
      conclusion: conclusion,
      completed_at: new Date(),
      output: {
        title: title,
        summary: summary
      }
    }))
  }

  function isNewAlert (alertElement) {
    return (alertElement.new > 0)
  }

  function getAlerts (alerts, minSeverity, requiredTags) {
    var severeAlerts = []
    alerts.forEach(function (alert) {
      if (!isNewAlert(alert)) {
        return
      }

      if (!isSevere(minSeverity, alert.query.properties.severity)) {
        return
      }

      if (!containsRequiredTags(requiredTags, alert.query.properties.tags)) {
        return
      }

      severeAlerts.push(alert)
    })
    return severeAlerts
  }

  function formatSummaryText (severeAlerts, codeReviewURL) {
    var summaryText = `This pull request **introduces ${severeAlerts.length} alert ${(severeAlerts.length > 1) ? 's' : ''}** - [view on LGTM](${codeReviewURL})`

    summaryText += '\n**new alerts:**'
    severeAlerts.forEach(function (severeAlert) {
      summaryText += `\n**Name**: ${severeAlert.query.name} **Severity**: ${severeAlert.query.properties.severity} **Tags**: ${severeAlert.query.properties.tags.toString()}`
    })
    return summaryText
  }

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}

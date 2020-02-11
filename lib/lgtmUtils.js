
const rp = require('request-promise')
const yaml = require('js-yaml')
const utils = require('./utils')

// TODO: confirm languages are correct
const languages = {
  'C/C++': 'cpp',
  'C#': 'csharp',
  Go: 'go',
  Java: 'java',
  JavaScript: 'javascript',
  Python: 'python'
}

function processLGTMCodeReview (configContent, context, lgtmInfo) {
  const logger = context.log
  const content = Buffer.from(configContent.data.content, 'base64').toString()
  const config = yaml.safeLoad(content)

  console.log('getLGTMCodeReview')
  return getLGTMCodeReview(context, lgtmInfo.URL, lgtmInfo.Token)
    .then(function (codeReviewBody) {
      completeGitHubCheck(codeReviewBody, context, config)
        .catch(function (err) {
          logger.error(`Error updating GitHub Check for Owner: ${context.repo.owner} Repo: ${context.repo.repo}`)
          logger.error(err)
        })
    })
    .catch(function (err) {
      logger.error(`Error getting LGTM Code Review for for Owner: ${context.repo.owner} Repo: ${context.repo.repo}`)
      logger.error(err)
    })
}

function getLGTMCodeReview (context, lgtmURL, lgtmToken) {
  const { target_url: statusTargetURL } = context.payload

  // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}
  var start = statusTargetURL.indexOf('/rev/pr-')
  var codereviewID = statusTargetURL.substring(start + 8)
  lgtmURL = (lgtmURL.charAt(lgtmURL.length - 1) === '/') ? lgtmURL : lgtmURL + '/'

  console.log(`LGTM_URL = ${lgtmURL} | URL = ${lgtmURL}api/v1.0/codereviews/${codereviewID}`)
  const options = {
    url: `${lgtmURL}api/v1.0/codereviews/${codereviewID}`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + lgtmToken
    }
  }

  return rp(options)
}

async function completeGitHubCheck (codeReviewBody, context, configContent) {
  const { sha: statusSha, context: statusContext, target_url: statusTargetURL } = context.payload

  var json = JSON.parse(codeReviewBody)
  const langaugeDescription = statusContext.substring(15)
  const languageCode = languages[langaugeDescription]
  var javascriptElement = json.languages.find(element => element.language === languageCode)

  const minSeverity = configContent[languageCode].severity
  const requiredTags = configContent[languageCode].tags
  var severeAlerts = utils.getSevereAlerts(javascriptElement.alerts, minSeverity, requiredTags)
  var conclusion = 'success'
  var title = 'LGTM Compliance Passed'
  var summary = 'LGTM Compliance Passed'

  if (severeAlerts.length > 0) {
    summary = utils.formatSummaryText(severeAlerts, statusTargetURL)
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

module.exports = {
  processLGTMCodeReview,
  getLGTMCodeReview,
  completeGitHubCheck
}

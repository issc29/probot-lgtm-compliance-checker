
function getSevereAlerts (alerts, minSeverity, requiredTags) {
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

function isNewAlert (alert) {
  return (alert.new > 0)
}

function isSevere (minSeverity, severity) {
  const severityLevel = {
    recommendation: 1,
    warning: 2,
    error: 3,
    all: 0
  }
  minSeverity = minSeverity.toLowerCase()

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

function formatSummaryText (severeAlerts, codeReviewURL) {
  var summaryText = `This pull request **introduces ${severeAlerts.length} alert${(severeAlerts.length > 1) ? 's' : ''}** - [view on LGTM](${codeReviewURL})`

  summaryText += '\n**new alerts:**'
  severeAlerts.forEach(function (severeAlert) {
    summaryText += `\n**Name**: ${severeAlert.query.name} **Severity**: ${severeAlert.query.properties.severity} **Tags**: ${severeAlert.query.properties.tags.toString()}`
  })
  return summaryText
}

function createStatus (context, startTime) {
  const { state: statusState, sha: statusSha, context: statusContext, target_url: statusTargetURL } = context.payload
  const languageDescription = statusContext.substring(15)
  console.log(statusState)
  if (statusState === 'pending') {
    console.log('pending')
    return context.github.checks.create(context.repo({
      name: 'LGTM Compliance: ' + languageDescription,
      head_sha: statusSha,
      status: 'queued',
      details_url: statusTargetURL,
      started_at: startTime
    }))
  } else if (statusState === 'error' || statusState === 'failure') {
    console.log('error')
    console.log(context.repo())
    return context.github.checks.create(context.repo({
      name: 'LGTM Compliance: ' + languageDescription,
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

function isValidLGTMToken (LGTMToken) {
  if (LGTMToken === '' || LGTMToken === undefined) {
    return false
  }
  return true
}

function isSuccessState (state) {
  if (state === 'pending' || state === 'error' || state === 'failure') {
    return false
  }
  return true
}

module.exports = {
  isNewAlert,
  isSevere,
  getSevereAlerts,
  containsRequiredTags,
  formatSummaryText,
  createStatus,
  isValidLGTMToken,
  isSuccessState
}

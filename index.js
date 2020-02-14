
const util = require('util')
const utils = require('./lib/utils')
const lgtmUtils = require('./lib/lgtmUtils')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */

const lgtmToken = process.env.LGTM_TOKEN
const lgtmURL = (process.env.LGTM_URL) ? process.env.LGTM_URL : 'https://lgtm.com/'

module.exports = app => {
  app.on(['status'], receivedStatus)
  const logger = app.log

  async function receivedStatus (context) {
    console.log(lgtmToken)
    const startTime = new Date()
    const params = context.repo({ path: '.github/lgtm-compliance.yml' })
    const { state: statusState } = context.payload

    if (!utils.isValidLGTMToken(lgtmToken)) {
      return
    }
    console.log('Received Webhook')
    console.log('state: ' + context.payload.state + ' context: ' + context.payload.context)

    if (!utils.isSuccessState(statusState)) {
      await utils.createStatus(context, startTime)
      console.log('end')
      return
    }

    context.github.repos.getContents(params).then((configContent) => {
      logger.info(configContent)
      const lgtmInfo = { URL: lgtmURL, Token: lgtmToken }
      lgtmUtils.processLGTMCodeReview(configContent, context, lgtmInfo, logger)
    }, (reason) => {
      logger.info(`NOTE: config file not found for Owner: ${params.owner} Repo: ${params.repo}`)
    })
  }
}

const shortId = require('shortid')

const sqs = require('../lib/sqs')
const delay = require('../lib/delay')
const processor = require('../services/processor')

const handlers = {
  processor
}

const containsNewMessage = response =>
  response.Messages ? response.Messages.length !== 0 : false

const removeMessageOnError = error => {
  console.log(error)
  // TODO implement conditionals to remove
  return true
}

const run = async () => {
  logger.info({
    message: 'Waiting for new messages on queue.'
  })

  const loggerId = shortId()

  try {
    const response = await sqs.receiveMessage()

    if (!containsNewMessage(response)) return run()

    const [message] = response.Messages

    await handlers.processor({ id: loggerId, message })
  } catch (err) {
    if (removeMessageOnError(err)) {
      await sqs.removeMessage({
        ReceiptHandle: err.messageHandle
      })
    }
  }

  return run()
}

let retries = 0

const start = async () => {
  run().catch(async e => {
    if (retries < 10) {
      retries = retries + 1
      await delay(2000)
      console.log('Retrying start')
      return start()
    }
    throw e
  })
}

module.exports = { start }

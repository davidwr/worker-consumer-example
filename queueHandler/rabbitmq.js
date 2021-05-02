const shortId = require('shortid')
const amqp = require('amqplib')

const processor = require('../services/processor')
const delay = require('../lib/delay')

const rabbitConfig = {
  url: process.env.AMQP,
  queue: process.env.INPUT_QUEUE
}

const handlers = {
  processor
}

let processingMessages = 0

const run = async connection => {
  logger.info({
    message: 'Waiting for new messages on queue.'
  })

  const channel = await connection.createChannel()
  channel.prefetch(1)
  await Promise.all(
    [rabbitConfig.queue].map(queue => channel.assertQueue(queue))
  )

  const res = await channel.consume(rabbitConfig.queue, async message => {
    if (!message) return
    const loggerId = shortId()
    try {
      processingMessages++
      const messageContent = JSON.parse(message.content.toString())

      await handlers.processor({ id: loggerId, message: messageContent })
      channel.ack(message)
    } catch (err) {
      console.log(loggerId, err)
      channel.ack(message)
    }

    processingMessages--
  })

  const shutdown = async () => {
    try {
      await channel.cancel(res.consumerTag)

      let retries = 1
      while (processingMessages > 0 && retries < 70) { // eslint-disable-line
        await delay(1000)
        retries++
      }
      logger.info(`Shutdown after ${retries} retries.`)
      await channel.close()
      await connection.close()
    } catch (err) {
      console.log('failed to shutdown gracefully:', err)
      throw err
    }
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

let retries = 0

const start = () => {
  amqp
    .connect(rabbitConfig.url)
    .then(run)
    .catch(async err => {
      if (retries < 10) {
        retries = retries + 1
        await delay(2000)
        console.log('Retrying start')
        return start()
      }
      throw err
    })
}

module.exports = { start }

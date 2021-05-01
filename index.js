require('dotenv').config()
const logger = require('pino')()
const shortId = require('shortid')
global.logger = logger

const amqp = require('amqplib')

const processor = require('./services/processor')

const rabbitConfig = {
  url: process.env.AMQP,
  queue: process.env.INPUT_QUEUE
}

const handlers = {
  processor
}

const delay = timeout => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout)
  })
}

const run = async connection => {
  logger.info({
    message: `Waiting for new messages on queue.`
  })

  const channel = await connection.createChannel()
  channel.prefetch(1)
  await Promise.all([rabbitConfig.queue].map(queue => channel.assertQueue(queue)))

  let processingMessages = 0
  const res = await channel.consume(rabbitConfig.queue, async message => {
    if (!message) return
    const loggerId = shortId()
    try {
      processingMessages++
      const messageContent = JSON.parse(message.content.toString())

      await handlers.processor({ id: loggerId, message: messageContent })
      channel.ack(message)
    } catch (error) {
      console.log(loggerId, error)
      channel.ack(message)
    }

    processingMessages--
  })

  const shutdown = async () => {
    try {
      await channel.cancel(res.consumerTag)

      let retries = 1
      while (processingMessages > 0 && retries < 70) {
        await delay(1000)
        retries++
      }
      logger.info(
        `Shutdown after ${retries} retries.`
      )
      await channel.close()
      await connection.close()
    } catch (error) {
      console.log('failed to shutdown gracefully:', error)
      process.exit(1)
    }
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

process.on('uncaughtException', err => {
  console.log(err)
  process.exit(1)
})

let retries = 0

const start = () => {
  amqp
    .connect(rabbitConfig.url)
    .then(run)
    .catch(async e => {
      if (retries < 10) {
        retries = retries + 1
        await delay(2000)
        console.log('Retrying start')
        return start()
      }
      console.error(e)
      process.exit(1)
    })
}

start()

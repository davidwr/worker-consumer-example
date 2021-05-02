const queueManagers = {
  rabbitmq: require('./rabbitmq'),
  sqs: require('./sqs')
}

const queueManager = process.env.QUEUE_MANAGER

const start = () => {
  queueManagers[queueManager].start()
}

module.exports = { start }

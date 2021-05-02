require('dotenv').config()
const logger = require('pino')()
global.logger = logger

const queueHandler = require('./queueHandler')

process.on('uncaughtException', err => {
  console.log(err)
  process.exit(1)
})

const start = async () => {
  try {
    queueHandler.start()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()

const { v4: uuid } = require('uuid')
const AWS = require('aws-sdk')

AWS.config.update({
  accessKeyId: process.env.AWS_ACESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
})

const queueUrl = process.env.AWS_SQS_QUEUE_URL

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' })

const sendMessage = async ({ body = {}, messageGroupId }) => {
  const messageId = uuid()

  return await sqs
    .sendMessage({
      MessageAttributes: {
        example: {
          DataType: 'String',
          StringValue: 'test'
        }
      },
      MessageBody: JSON.stringify(body),
      MessageDeduplicationId: messageId,
      MessageGroupId: messageGroupId ? `${messageGroupId}` : messageId
    })
    .promise()
}

const receiveMessage = async () => {
  return await sqs
    .receiveMessage({
      QueueUrl: queueUrl
    })
    .promise()
}

const removeMessage = async ReceiptHandle => {
  return await sqs
    .deleteMessage({
      QueueUrl: queueUrl,
      ReceiptHandle
    })
    .promise()
}

const changeMessageVisibility = async ({
  ReceiptHandle,
  VisibilityTimeout
}) => {
  return await sqs
    .changeMessageVisibility({
      QueueUrl: queueUrl,
      ReceiptHandle,
      VisibilityTimeout
    })
    .promise()
}

module.exports = {
  sendMessage,
  receiveMessage,
  removeMessage,
  changeMessageVisibility
}

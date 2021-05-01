FROM node:14-alpine

RUN apk add --update --no-cache tzdata
ENV TZ=America/Bahia

WORKDIR /worker-consumer-example

ENV NODE_ENV=production

COPY ["package.json", "./"]
COPY ["package-lock.json", "./"]
RUN npm install --production

COPY . .

CMD ["node", "./index.js"]

FROM node:lts-alpine

ENV NODE_ENV=production

COPY . /ws
WORKDIR /ws
RUN npm install && npm cache clean --force
EXPOSE 3000

CMD [ "node", "ws.js" ]



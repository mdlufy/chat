FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

# If you are building your code for production
# RUN npm ci --omit=dev
RUN npm install

COPY . .

RUN npm run build

EXPOSE 8999

CMD ["node", "dist/index.js"]
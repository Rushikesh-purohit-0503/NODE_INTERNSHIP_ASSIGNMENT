ARG NODE_VERSION=20.9.0

FROM node:${NODE_VERSION}-alpine
WORKDIR /app


COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["nodemon", "src/index.js"]
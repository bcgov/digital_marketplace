FROM node:10-jessie

RUN apt-get update \
  && apt-get install -y bash

ADD . /usr/app

WORKDIR /usr/app

RUN npm install \
  && NODE_ENV=production npm run front-end:build

EXPOSE 3000

CMD npm start

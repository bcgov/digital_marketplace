FROM node:10-jessie
RUN apt-get update
RUN apt-get -y install sendmail
COPY . /usr/app
WORKDIR /usr/app
RUN npm install
RUN NODE_ENV=development npm run front-end:build
RUN npm run back-end:build
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
CMD npm start

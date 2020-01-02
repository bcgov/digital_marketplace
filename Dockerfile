FROM node:10-jessie
COPY . /usr/app
WORKDIR /usr/app
RUN npm install && NODE_ENV=production npm run front-end:build
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
CMD npm start

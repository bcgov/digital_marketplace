FROM docker.io/node:10-jessie
COPY . /usr/app
WORKDIR /usr/app
# added to fix node-sass version error
RUN npm rebuild node-sass
RUN npm install
# changed NODE_ENV to development
RUN NODE_ENV=development npm run front-end:build
RUN npm run back-end:build
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
CMD npm start
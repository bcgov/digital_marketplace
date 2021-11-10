FROM --platform=linux/amd64 docker.io/node:10-jessie
COPY . /usr/app
WORKDIR /usr/app
RUN npm install
RUN NODE_ENV=production npm run front-end:build
RUN npm run back-end:build
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
ENTRYPOINT ["/usr/app/src/front-end/docker-entrypoint.sh"]
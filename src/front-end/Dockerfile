FROM --platform=linux/amd64 docker.io/node:16
COPY . /usr/app
WORKDIR /usr/app
RUN yarn install
RUN npm run front-end:build
RUN npm run back-end:build
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
ENTRYPOINT ["/usr/app/src/front-end/docker-entrypoint.sh"]

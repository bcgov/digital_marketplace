FROM --platform=linux/amd64 docker.io/node:16
WORKDIR /usr/app
COPY ./src /usr/app/src
COPY package.json ./
COPY yarn.lock ./
COPY ./lib /usr/app/lib
COPY gruntfile.js ./
COPY ./grunt-configs ./grunt-configs
COPY tsconfig.json ./

RUN yarn install --frozen-lockfile --production=true
RUN yarn run front-end:build
RUN yarn run back-end:build
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/node", "build/back-end/back-end/start.js"]

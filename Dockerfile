FROM --platform=linux/amd64 docker.io/node:14
WORKDIR /usr/app
COPY ./src /usr/app/src
COPY package*.json ./
COPY gruntfile.js ./
COPY ./grunt-configs ./grunt-configs
# COPY tsconfig.json ./

RUN npm install
RUN npm run front-end:build
RUN npm run back-end:build
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/node", "build/back-end/back-end/start.js"]

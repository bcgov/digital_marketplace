FROM docker.io/node:10-jessie
COPY . /usr/app
WORKDIR /usr/app
# to avoid git picking up file permission changes when attaching to Docker container via VS Code
RUN git config core.filemode false
RUN npm install
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
CMD npm run migrations:latest && npm run front-end:watch & npm run back-end:watch
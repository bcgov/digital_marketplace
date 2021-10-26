FROM --platform=linux/amd64 docker.io/node:10-jessie
COPY . /usr/app
WORKDIR /usr/app
EXPOSE 3000
RUN chmod -R 775 /usr/app
ENTRYPOINT ["/usr/app/src/front-end/docker-entrypoint.sh"]
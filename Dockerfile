FROM node:10-jessie
RUN apt-get update
RUN apt-get -y install sendmail
COPY . /usr/app
WORKDIR /usr/app
<<<<<<< HEAD
<<<<<<< HEAD
RUN npm install
RUN NODE_ENV=production npm run front-end:build
RUN npm run back-end:build
=======
=======
RUN apt-get update
RUN apt-get -y install sendmail
>>>>>>> fdb1348d... install sendmail Dockerfile  marketplace
RUN npm install && NODE_ENV=development npm run front-end:build
>>>>>>> 32054a9c... Ajout de script demarrage service, template keycloak, retirer dependance Gmail, instructions installation
RUN chmod -R 775 /usr/app
RUN chown -R node:root /usr/app
EXPOSE 3000
CMD npm start

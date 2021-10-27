#!/bin/bash

chown -R node:root /usr/app
npm install

if [ "${NODE_ENV}" != "development" ]
    then
        NODE_ENV=production npm run front-end:build
        npm run back-end:build
        npm start

    else
        # to avoid git picking up file permission changes when attaching to Docker container via VS Code
        git config core.filemode false
        npm run migrations:latest && npm run front-end:watch & npm run back-end:watch
fi


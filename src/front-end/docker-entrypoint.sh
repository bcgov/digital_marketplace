#!/bin/bash

if [ "${NODE_ENV}" != "development" ]
    then
        npm start
    else
        # to avoid git picking up file permission changes when attaching to Docker container via VS Code
        git config core.filemode false
        npm run migrations:latest && npm run front-end:watch & npm run back-end:watch
fi

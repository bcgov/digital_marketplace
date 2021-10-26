#!/bin/bash
# to avoid git picking up file permission changes when attaching to Docker container via VS Code
chown -R node:root /usr/app
git config core.filemode false
npm install
npm run migrations:latest && npm run front-end:watch & npm run back-end:watch
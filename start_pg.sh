#!/bin/bash

#doc conteneur PG: https://github.com/sclorg/postgresql-container/tree/generated/12

source .env

if [ ! "$(docker ps -q -f name=postgresql_database)" ]; 
then
    if [ "$(docker ps -aq -f status=exited -f name=postgresql_database)" ]; 
    then
        docker start postgresql_database
    else
        docker run -d --name postgresql_database -e POSTGRESQL_USER=$DATABASE_USERNAME -e POSTGRESQL_PASSWORD=$DATABASE_PASSWORD -e POSTGRESQL_DATABASE=$DATABASE_NAME -p 5432:5432 centos/postgresql-10-centos7
    fi
else
    docker stop postgresql_database
    docker start postgresql_database
fi

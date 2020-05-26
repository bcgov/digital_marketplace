#!/bin/bash

#doc conteneur PG: https://github.com/sclorg/postgresql-container/tree/generated/12

source .env

PG_STATE="$(docker inspect -f '{{.State.Running}}' postgresql_database)"

if [ $PG_STATE = "true" ]; 
then docker stop postgresql_database
     docker start postgresql_database
elif [ $PG_STATE = "false" ];
then docker start postgresql_database
else docker run -d --name postgresql_database -e POSTGRESQL_USER=$DATABASE_USERNAME -e POSTGRESQL_PASSWORD=$DATABASE_PASSWORD -e POSTGRESQL_DATABASE=$DATABASE_NAME -p 5432:5432 postgresql-12-centos7
fi

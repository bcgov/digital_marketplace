#!/bin/bash

#doc Keycloak: https://www.keycloak.org/getting-started/getting-started-docker

source .env

KC_STATE="$(docker inspect -f '{{.State.Running}}' keycloak)"

if [ $KC_STATE = "true" ]; 
then docker stop keycloak
     docker start keycloak
elif [ $KC_STATE = "false" ];
then docker start keycloak
else docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_USER=$KEYCLOAK_ADMIN_USER -e KEYCLOAK_PASSWORD=$KEYCLOAK_ADMIN_PASS quay.io/keycloak/keycloak
fi
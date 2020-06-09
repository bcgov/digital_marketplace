#!/bin/bash

#doc Keycloak: https://www.keycloak.org/getting-started/getting-started-docker

source .env

KC_STATE="$(docker inspect -f '{{.State.Running}}' keycloak)"

if [ -z "$KC_STATE" ]
then docker run -d --name keycloak -p 8080:8080 -e KEYCLOAK_USER=$KEYCLOAK_ADMIN_USER -e KEYCLOAK_PASSWORD=$KEYCLOAK_ADMIN_PASS -v $(pwd):/tmp quay.io/keycloak/keycloak
elif [ $KC_STATE = "true" ]; 
then docker stop keycloak
     docker start keycloak
elif [ $KC_STATE = "false" ];
then docker start keycloak
else echo "Erreur dans la détection de l'état du conteneur Keycloak."
fi
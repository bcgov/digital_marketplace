#!/bin/bash

# Store the original IFS
OIFS="$IFS"
# Update the IFS to only include newline
IFS=$'\n'

    #Test your custom vars here:

    #?ROOTURL?
    if [ ! "$1" ];
    then read -p "Root Url: " ROOTURL
    else ROOTURL=$1
    fi

    #?GITHUBID?
    if [ ! "$2" ];
    then read -p "Github Client ID: " GITHUBID
    else GITHUBID=$2
    fi

    #?GITHUBSECRET?
    if [ ! "$3" ];
    then read -p "Github Client Secret: " GITHUBSECRET
    else GITHUBSECRET=$3
    fi

    #?KEYCLOAKURL?
    if [ ! "$4" ];
    then read -p "Keycloak Url: " KEYCLOAKURL
    else KEYCLOAKURL=$4
    fi

    #Add generated or constant Custom vars
    
    #?IDIRCLIENTSECRET?
    IDIRCLIENTSECRET="$(uuidgen)"

for REALMFILE in realms/*.template.json; do
    PRODREALMFILE="${REALMFILE%%.*}.json"

    while read -r LINE || [ -n "$LINE" ]; do
        
        #Secret Regeneration
        #?UUID?
        if [[ $LINE == *"?UUID?"* ]]; then
            LINE=${LINE//\?UUID\?/"$(uuidgen)"}
        fi

        #Add your custom vars swap here:

        #?ROOTURL?
        if [[ $LINE == *"?ROOTURL?"* ]]; then
            LINE=${LINE//\?ROOTURL\?/"${ROOTURL}"}
        fi

        #?GITHUBID?
        if [[ $LINE == *"?GITHUBID?"* ]]; then
            LINE=${LINE//\?GITHUBID\?/"${GITHUBID}"}
        fi

        #?GITHUBSECRET?
        if [[ $LINE == *"?GITHUBSECRET?"* ]]; then
            LINE=${LINE//\?GITHUBSECRET\?/"${GITHUBSECRET}"}
        fi

        #?KEYCLOAKURL?
        if [[ $LINE == *"?KEYCLOAKURL?"* ]]; then
            LINE=${LINE//\?KEYCLOAKURL\?/"${KEYCLOAKURL}"}
        fi

        #?IDIRCLIENTSECRET?
        if [[ $LINE == *"?IDIRCLIENTSECRET?"* ]]; then
            LINE=${LINE//\?IDIRCLIENTSECRET\?/"${IDIRCLIENTSECRET}"}
        fi

        echo $LINE
    done < "${REALMFILE}" > "${PRODREALMFILE}"

    rm "${REALMFILE}"
done

# Reset IFS
IFS="$OIFS"
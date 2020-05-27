# Prérequis:
- NodeJS 10 (nvm, npm)
- docker / podman

# Procédure
- Cloner le dépot
- Installer les dépendances
    ```bash
    nvm use 10 #Si utilisation de nvm 
    npm install
    ```
- Créer le fichier .env à partir du fichier sample.env
    * Les valeurs DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME seront utilisées pour la création du conteneur PostgreSQL
    * Les valeurs KEYCLOAK_ADMIN_USER et KEYCLOAK_ADMIN_PASS seront utilisées pour la création du conteneur Keycloak
- Démarrer le conteneur keycloak
    ```bash
    chmod +x keycloak/start.sh
    keycloak/start.sh
    ```
- Configurer Keycloak
    * S'authentifier comme admin à Keycloak http://localhost:8080
    * Créer un realm "IDIR"
        * Créer au moins 2 usagers et leur assigner un mot de passe
        * Importer le client keycloak-devex (keycloak/IDIR-client-keycloak-devex.json)
        * Dans l'onglet Credentials choisir "Client Id and Secret" et prendre note le "Secret"
        * Dans la section "Realm settings" prendre en note l'url du endpoint "OpenID endpoint Configuration"
    * Créer un realm "devexchange"
        * Créer un Identity provider "GitHub"
            * Créer un "OAUTH apps" au https://github.com/settings/developers
                * Application name : "Devexchange local"
                * Homepage URL : "http://localhost:3000"
                * Autorization callback url : "http://localhost:3000"
            * Renseigner "Client Id" et "Client Secret" avec les valeurs fournies par GitHub
            * Dans l'onglet Mappers, créer un mapper nommé "loginSource" de type "Hardcoded Attribute" avec "User Attribute" : "loginSource" et "User Attribute Value" : "GITHUB"
        * Créer un Identity provider "Keycloak OpenID connect" nommé "idir"
            * Importer la config à l'aide de l'url du Endpoint Config OIDC du realm IDIR noté précedement.
            * Dans "Client Authentication" choisir "Client secret sent as post"
            * Client ID : "keycloak-devex"
            * Client Secret : le "Secret" noté lors de la création du realm "IDIR"
            * Dans l'onglet Mappers, créer un mapper nommé "loginSource" de type "Hardcoded Attribute" avec "User Attribute" : "loginSource" et "User Attribute Value" : "IDIR"
        * Importer le client devex-local (keycloak/devexchange-client-devex-local.json)
        * Dans l'onglet Credentials choisir "Client Id and Secret" et prendre note le "Secret", celui-ci doit être copié dans le fichier .env (KEYCLOAK_CLIENT_SECRET)
- Démarrer le conteneur PostgreSQL
    ```bash
    chmod +x start_pg.sh
    ./start_pg.sh
    ```
- Créer le schéma SQL
    ```bash
    npm run migrations:latest
    ```
- Compiler le front-end
    ```bash
    npm run front-end:build
    ```
- Démarrer le backend
    ```bash
    npm run start
    ```
- L'application est maintenant disponible au http://localhost:3000
- S'authenfier avec un premier usager créé dans le realm "IDIR" via le bouton "Sign In" en utilisation le lien "IDIR"
- Dans keycloak, dans le realm "devexchange", dans la section Roles, créer un role "dm_admin" 
- Dans la section Users. Éditer l'usager utilisé. Dans l'onglet Role Mappings, ajouter le role "dm_admin" dans les "Assigned Roles". Cet usager sera "admin" de l'application.

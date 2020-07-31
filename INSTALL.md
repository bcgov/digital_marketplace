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

- Créer l'image keycloak : https://github.com/CQEN-QDCE/digital_marketplace/tree/experimentation/keycloak

- Démarrer Keycloak
    ```bash
    chmod +x keycloak/start.sh
    keycloak/start.sh
    ```
- Récupérer le secret du client:
    * Dans la console d'administration: http://localhost:8080
    * Choisir le realm DigitalMarketplace
    * Clients -> dm_app -> Onglet Credentials
    * Copier le "secret" dans le fichier .env (KEYCLOAK_CLIENT_SECRET)

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

# Environnement CodeReady

- S'authentifier à CodeReady et choisir la section Workspaces du menu gauche.

 - Cliquer bouton "Add Workspace"

 - Choisir un nom (Workspace Name) et charger le devfile (Champ URL of Devfile) depuis l'URL suivant: https://raw.githubusercontent.com/CQEN-QDCE/digital_marketplace/experimentation/codeready/devfile.yaml

- Changer les valeurs des variables PGSQL dans le devfile.yaml
  ```yaml
      - name: POSTGRESQL_USER
        value: marketplace
      - name: POSTGRESQL_PASSWORD
        value: marketplace00
      - name: POSTGRESQL_DATABASE
        value: marketplace
  ```
- Cliquer "Create & Open" au bas de l'écran, l'environnement va s'initialiser.

- Une fois l'environnement démarré, créer une copie du fichier sample.env nommée .env

- Dans le fichier .env, changer les valeurs suivantes: 
     ```bash
	 POSTGRESQL_SERVICE_HOST="postgresql-database"
	 POSTGRESQL_SERVICE_PORT="5432"
	 DATABASE_USERNAME="[Tel que défini dans devfile]"
	 DATABASE_PASSWORD="[Tel que défini dans devfile]"
	 DATABASE_NAME="[Tel que défini dans devfile]"
	```

 - Démarrer l'app une première fois pour générer la route. Ouvrir un terminal via le menu "Terminal" -> "Open Terminal in specific container" -> nodejs:
     ```bash
	cd digital-marketplace

	npm run front-end:build
	npm run back-end:build
	npm run migrations:latest

	npm run start
	```

- À la suite du "npm run start" CodeReady vous affichera l'URL de la route pour tester l'application. Prendre cette URL en note.

## Keycloak

Vous pouvez utiliser une instance Keycloak existante ou en déployer une dans un project Openshift. Utiliser l'url généré par CodeReady pour configurer le client dm-app.

Vous pouvez déployer un instance rapidement dans un project Openshift à partir du template keycloak : 
https://github.com/CQEN-QDCE/digital_marketplace/blob/experimentation/openshift/templates

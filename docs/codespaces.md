# Codespaces

For near-instant access to a working development environment without the need to install or run anything on your local machine, try using our remote devcontainer on GitHub Codespaces. This remote container has all dependencies installed and runs the latest migrations (it runs `npm install` and `npm run migrations:latest` every time it starts up).

## Accessing the Codespace

You can create and access a codespace either via the browser or by connecting directly to it in your VS Code editor. (Note: the browser experience may be laggy compared with the in-editor experience)

### Browser
- [Follow these instructions](https://docs.github.com/en/codespaces/developing-in-codespaces/creating-a-codespace#creating-a-codespace) to create and access a new codespace from the repository homepage

### VS Code Editor

- Add the [GitHub Codespaces extension](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces)
- [Follow these instructions](https://docs.github.com/en/codespaces/developing-in-codespaces/using-codespaces-in-visual-studio-code) to use the Remote Explorer to sign in, create a codespace and connect to it from your editor.

## First-Time Codespace Set-Up

You only need to do the following the first time you set up the codespace.

### Add Environment Variables
- Copy the `sample.env` (run commands from within the remote container, i.e. browser or VS Code terminal)
```bash
cp sample.env .env
```
- Add `POSTGRES_URL="postgresql://digitalmarketplace:digitalmarketplace@localhost:5432/digitalmarketplace"` to the `.env` file.
- Add additional desired environment variables to the `.env` file (refer to the [Environment Variables](https://github.com/button-inc/digital_marketplace/blob/main/README.md#environment-variables) section in the README)

### Run Migrations
- Run `npm run migrations: latest`

## Using the Codespace

 Use `git`, etc., as you would normally.

### Quick-Start the App
- Run `npm run back-end:watch` to start the back-end server (restarts on source changes)
- In a second terminal, run `npm run front-end:watch` to build the front-end source code (rebuilds on source changes)
- A toast will pop up with a link to see the app running in the browser

### Access the Database
- Click on the connect icon on the bottom bar
![Connect icon](https://github.com/button-inc/digital_marketplace/blob/main/docs/images/connectIcon.png)
- Connect to the container database
![Container database](https://github.com/button-inc/digital_marketplace/blob/main/docs/images/containerDatabase.png)
- Create SQL statements inside the Container database.session.sql
- Run the SQL statements
![SQL statements](https://github.com/button-inc/digital_marketplace/blob/main/docs/images/sqlStatements.png)

### Testing, Linting, etc.
- See the [NPM Scripts](https://github.com/button-inc/digital_marketplace/blob/main/README.md#npm-scripts) section of the README for a list of available scripts

const path = require("path");
const moduleAlias = require("module-alias");
moduleAlias.addAlias("back-end", __dirname);
moduleAlias.addAlias("shared", path.resolve(__dirname, "../shared"));
moduleAlias.addAlias("migrations", path.resolve(__dirname, "../migrations"));
moduleAlias();
const server = require("./index.js");
server.startServer();

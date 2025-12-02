import { resolve } from "path";
import moduleAlias, { addAlias } from "module-alias";
addAlias("back-end", __dirname);
addAlias("shared", resolve(__dirname, "../shared"));
addAlias("migrations", resolve(__dirname, "../migrations"));
moduleAlias();
import { startServer } from "./index.js";
startServer();

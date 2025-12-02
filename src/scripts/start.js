import { resolve } from "path";
import moduleAlias, { addAlias } from "module-alias";
addAlias("scripts", __dirname);
addAlias("back-end", resolve(__dirname, "../back-end"));
addAlias("shared", resolve(__dirname, "../shared"));
addAlias("migrations", resolve(__dirname, "../migrations"));
moduleAlias();
import "./index.js";

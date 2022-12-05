import * as exercise from "learn-front-end/solutions/02-single-counter";
import { process } from "front-end/lib/framework";

const element = document.getElementById("main") || document.body;
process.start(exercise.app, element, true);

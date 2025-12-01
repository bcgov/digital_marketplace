import "../sass/index.scss";
import "./styles/tailwind.css";
import { VITE_NODE_ENV } from "front-end/config";
import app from "front-end/lib/app";
import { process } from "front-end/lib/framework";
import { debounce, set } from "lodash";
import { adt } from "shared/lib/types";

const element = document.getElementById("main") || document.body;
const debug = VITE_NODE_ENV === "development";
const process_ = process.start(app, element, debug);

// Expose application process in development.
if (debug) {
  set(window, "process", process_);
}

const hideNavMenus = debounce(
  () => {
    process_.dispatch(adt("nav", adt("toggleMobileMenu" as const, false)));
    process_.dispatch(
      adt("nav", adt("toggleDesktopAccountDropdown" as const, false))
    );
    process_.dispatch(
      adt("nav", adt("toggleDesktopContextualDropdown" as const, false))
    );
    process_.dispatch(
      adt("nav", adt("toggleMobileContextualDropdown" as const, false))
    );
  },
  500,
  { leading: true }
);

// Collapse nav menus on window resize.
window.addEventListener("resize", hideNavMenus);

/**
 * This module was adapted from visionmedia's page.js.
 * Page.js is licensed under the MIT license.
 *
 * https://github.com/visionmedia/page.js/blob/master/index.js
 */

import { parseUrl, type Url } from "front-end/lib/framework/router";
import url from "url";

export default function clickHandler(
  dispatchUrl: (url: Url) => void
): (e: MouseEvent) => false | void {
  return (e) => {
    if ((e.which || e.button) !== 1) {
      return;
    }

    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    if (e.defaultPrevented) {
      return;
    }

    // ensure link
    // use shadow dom when available if not, fall back to composedPath()
    // for browsers that only have shady
    let el: Node | null = (e as any).target;
    const eventPath =
      (e as any).path || (e.composedPath ? e.composedPath() : null);

    if (eventPath) {
      for (const node of eventPath) {
        if (!node.nodeName) {
          continue;
        }
        if (node.nodeName.toUpperCase() !== "A") {
          continue;
        }
        if (!node.href) {
          continue;
        }

        el = node;
        break;
      }
    }

    // continue ensure link
    // el.nodeName for svg links are 'a' instead of 'A'
    while (el && "A" !== el.nodeName.toUpperCase()) {
      el = el.parentNode;
    }
    if (!el || "A" !== el.nodeName.toUpperCase()) {
      return;
    }

    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (
      (el as any).hasAttribute("download") ||
      (el as any).getAttribute("rel") === "external"
    ) {
      return;
    }

    // Check if link is defined.
    const link = (el as any).getAttribute("href");
    if (!link) {
      return;
    }

    // Check for mailto: in the href
    if (link && link.indexOf("mailto:") > -1) {
      return;
    }

    // Check for file: in the href
    if (link && link.indexOf("file:") > -1) {
      return;
    }

    // check target
    // svg target is an object and its desired value is in .baseVal property
    if ((el as any).target) {
      return;
    }

    // x-origin
    const parsed = url.parse(link);
    const sameProtocol =
      !parsed.protocol || parsed.protocol === window.location.protocol;
    const sameHostname =
      !parsed.hostname || parsed.hostname === window.location.hostname;
    const samePort =
      !parsed.hostname ||
      parsed.port === window.location.port ||
      (window.location.port === "" &&
        (parsed.port == "80" || parsed.port == "443"));
    if (!sameProtocol || !sameHostname || !samePort) {
      return;
    }

    // rebuild path
    let path = (el as any).pathname + (el as any).search;

    path = path[0] !== "/" ? "/" + path : path;

    e.preventDefault();

    dispatchUrl(parseUrl(path));

    return;
  };
}

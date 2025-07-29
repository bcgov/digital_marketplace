import { FRONT_END_BUILD_DIR } from "back-end/config";
import {
  FileResponseBody,
  makeTextResponseBody,
  nullRequestBodyHandler,
  Router,
  TextResponseBody,
  tryMakeAnyCompressedFileResponseBody
} from "back-end/lib/server";
import { ServerHttpMethod } from "back-end/lib/types";
import Bowser from "bowser";
import { isArray } from "lodash";
import { join, resolve } from "path";

function isValidBrowser(userAgent: string): boolean {
  const parsed = Bowser.parse(userAgent);
  return parsed.browser.name !== "Internet Explorer";
}

function coerceHeaderToString(header: string | string[] | undefined): string {
  if (isArray(header)) {
    return header[0] || "";
  } else if (header) {
    return header;
  } else {
    return "";
  }
}

const ALWAYS_ALLOWED_FILES = /\.(css|js|svg|png|jpg|ico|woff|woff2|md|txt)$/;

function makeRouter(
  fallbackHtmlFile: "index.html" | "downtime.html"
): Router<any, any, any, any, FileResponseBody | TextResponseBody, any, any> {
  const fallbackFilePath = join(FRONT_END_BUILD_DIR, fallbackHtmlFile);
  return [
    {
      method: ServerHttpMethod.Get,
      path: "*path",
      handler: nullRequestBodyHandler(async (request) => {
        const fileResponseBody = (() => {
          const acceptEncodingHeader = coerceHeaderToString(
            request.headers["accept-encoding"]
          );
          const filePath = join(FRONT_END_BUILD_DIR, resolve(request.path));
          const isSupportedBrowser = isValidBrowser(
            coerceHeaderToString(request.headers["user-agent"])
          );
          if (isSupportedBrowser || filePath.match(ALWAYS_ALLOWED_FILES)) {
            // Browser is supported by front-end, or user is requesting CSS file.
            return (
              tryMakeAnyCompressedFileResponseBody(
                filePath,
                acceptEncodingHeader
              ) ||
              tryMakeAnyCompressedFileResponseBody(
                fallbackFilePath,
                acceptEncodingHeader
              )
            );
          } else {
            // Otherwise, indicate that browser is unsupported.
            return tryMakeAnyCompressedFileResponseBody(
              join(FRONT_END_BUILD_DIR, "unsupported-browser.html"),
              acceptEncodingHeader
            );
          }
        })();
        return {
          code: 200,
          headers: {},
          session: request.session,
          body: fileResponseBody || makeTextResponseBody("File Not Found")
        };
      })
    }
  ];
}

export default makeRouter;

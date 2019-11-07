import { FRONT_END_BUILD_DIR } from 'back-end/config';
import { FileResponseBody, makeTextResponseBody, Response, Router, TextResponseBody, tryMakeFileResponseBodyWithGzip } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { join, resolve } from 'path';

function makeRouter(fallbackHtmlFile: 'index.html' | 'downtime.html'): Router<any, FileResponseBody | TextResponseBody, any> {
  const fallbackFilePath = join(FRONT_END_BUILD_DIR, fallbackHtmlFile);
  return [{
    method: ServerHttpMethod.Get,
    path: '*',
    handler: {
      async transformRequest(request) {
        return null;
      },
      async respond(request): Promise<Response<FileResponseBody | TextResponseBody, unknown>> {
        const filePath = join(FRONT_END_BUILD_DIR, resolve(request.path));
        let fileResponseBody = tryMakeFileResponseBodyWithGzip(filePath);
        fileResponseBody = fileResponseBody || tryMakeFileResponseBodyWithGzip(fallbackFilePath);
        return {
          code: 200,
          headers: {},
          session: request.session,
          body: fileResponseBody || makeTextResponseBody('File Not Found')
        };
      }
    }
  }];
}

export default makeRouter;

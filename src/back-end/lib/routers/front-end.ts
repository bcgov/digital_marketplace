import { FRONT_END_BUILD_DIR } from 'back-end/config';
import { FileResponseBody, makeTextResponseBody, nullRequestBodyHandler, Router, TextResponseBody, tryMakeFileResponseBodyWithGzip } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { join, resolve } from 'path';

function makeRouter(fallbackHtmlFile: 'index.html' | 'downtime.html'): Router<any, any, any, any, FileResponseBody | TextResponseBody, any, any> {
  const fallbackFilePath = join(FRONT_END_BUILD_DIR, fallbackHtmlFile);
  return [{
    method: ServerHttpMethod.Get,
    path: '*',
    handler: nullRequestBodyHandler(async request => {
      const filePath = join(FRONT_END_BUILD_DIR, resolve(request.path));
      let fileResponseBody = tryMakeFileResponseBodyWithGzip(filePath);
      fileResponseBody = fileResponseBody || tryMakeFileResponseBodyWithGzip(fallbackFilePath);
      return {
        code: 200,
        headers: {},
        session: request.session,
        body: fileResponseBody || makeTextResponseBody('File Not Found')
      };
    })
  }];
}

export default makeRouter;

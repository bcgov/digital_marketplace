import { FRONT_END_BUILD_DIR } from 'back-end/config';
import { FileResponseBody, makeTextResponseBody, nullRequestBodyHandler, Router, TextResponseBody, tryMakeAnyCompressedFileResponseBody} from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import { isArray } from 'lodash';
import { join, resolve } from 'path';

function coerceHeaderToString(header: string | string[] | undefined): string {
  if (isArray(header)) {
    return header[0] || '';
  } else if (header) {
    return header;
  } else {
    return '';
  }
}

function makeRouter(fallbackHtmlFile: 'index.html' | 'downtime.html'): Router<any, any, any, any, FileResponseBody | TextResponseBody, any, any> {
  const fallbackFilePath = join(FRONT_END_BUILD_DIR, fallbackHtmlFile);
  return [{
    method: ServerHttpMethod.Get,
    path: '*',
    handler: nullRequestBodyHandler(async request => {
      const filePath = join(FRONT_END_BUILD_DIR, resolve(request.path));
      const acceptEncodingHeader = coerceHeaderToString(request.headers['accept-encoding']);
      const fileResponseBody = tryMakeAnyCompressedFileResponseBody(filePath, acceptEncodingHeader)
                            || tryMakeAnyCompressedFileResponseBody(fallbackFilePath, acceptEncodingHeader);
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

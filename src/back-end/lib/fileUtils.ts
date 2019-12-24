import { createReadStream, existsSync } from 'fs';
import shajs from 'sha.js';
import { FilePermissions } from 'shared/lib/resources/file';
import { UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export function hashFile(originalName: string, filePath: string, filePermissions: Array<FilePermissions<Id, UserType>>): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!existsSync(filePath)) { return reject(new Error('file does not exist')); }
    const hash = shajs('sha1');
    hash.update(originalName);
    hash.update(filePermissions.map(permission => permission.value).join());
    const stream = createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('base64')));
    stream.on('error', err => reject(err));
  });
}

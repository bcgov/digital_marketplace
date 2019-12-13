import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export interface PublicFile {
  id: Id;
  createdAt: Date;
  createdBy: User;
  fileBlob: string;
  name: string;
}

export function fileBlobPath(file: PublicFile) {
  return `/api/fileBlobs/${file.fileBlob}`;
}

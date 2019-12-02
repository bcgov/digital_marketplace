import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export interface PublicFile {
    id: Id;
    createdAt: Date;
    createdBy: User;
    fileBlob: string;
    name: string;
}

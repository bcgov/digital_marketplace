import { generateUuid } from 'back-end/lib';
import { Connection, tryDb } from 'back-end/lib/db';
import { readOneUserSlim } from 'back-end/lib/db/user';
import { ValidatedCreateRequestBody, ValidatedUpdateRequestBody } from 'back-end/lib/resources/content';
import { valid } from 'shared/lib/http';
import { Content, ContentSlim } from 'shared/lib/resources/content';
import { Session } from 'shared/lib/resources/session';
import { UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { getValidValue, isInvalid } from 'shared/lib/validation';

interface RawContent extends Omit<Content, 'createdBy' | 'updatedBy'> {
  createdBy: Id;
  updatedBy: Id;
}

type RawContentSlim = ContentSlim;

interface RootContentRecord {
  id: Id;
  createdAt: Date;
  createdBy: Id;
  slug: string;
  fixed: boolean;
}

interface VersionContentRecord {
  id: number;
  createdAt: Date;
  createdBy: Id;
  title: string;
  body: string;
  contentId: Id;
}

async function rawContentToContent(connection: Connection, raw: RawContent): Promise<Content> {
  const { createdBy: createdById, updatedBy: updatedById, ...restOfRaw } = raw;
  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;
  const updatedBy = updatedById ? getValidValue(await readOneUserSlim(connection, updatedById), undefined) : undefined;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined
  };
}

export function generateContentQuery(connection: Connection, full = false) {
    const query = connection<RawContent>('content')
      // Join on latest content version
      .join<RawContent>('contentVersions as version', function() {
        this
          .on('content.id', '=', 'version.contentId')
          .andOn('version.id', '=',
            connection.raw('(select max("id") from "contentVersions" as version2 where \
              version2."contentId" = content.id)'));
      })
      .select<RawContent[]>(
        'content.id',
        'content.slug',
        'version.title'
      );

    if (full) {
      query.select(
        'content.id',
        'content.createdAt',
        'content.createdBy',
        'content.fixed',
        'version.id as version',
        'version.body',
        'version.createdAt as updatedAt',
        'version.createdBy as updatedBy'

      );
    }

    return query;
}

export const readManyContent = tryDb<[], ContentSlim[]>(async (connection) => {
  const results: RawContentSlim[] = await generateContentQuery(connection, false);
  if (!results) {
    throw new Error('unable to read content');
  }

  return valid(results);
});

export const readOneContentById = tryDb<[Id, Session], Content | null>(async (connection, id, session) => {
  const result = await generateContentQuery(connection, true)
    .where({ 'content.id': id })
    .first();

  // If not an admin, then remove createdBy, updatedBy fields
  if (result) {
    if (!session || session.user.type !== UserType.Admin) {
      delete result.createdBy;
      delete result.updatedBy;
    }
  }

  return valid(result ? await rawContentToContent(connection, result) : null);
});

export const readOneContentBySlug = tryDb<[string, Session], Content | null>(async (connection, slug, session) => {
  const result = await generateContentQuery(connection, true)
    .where({ 'content.slug': slug })
    .first();

  // If not an admin, then remove createdBy, updatedBy fields
  if (result) {
    if (!session || session.user.type !== UserType.Admin) {
      delete result.createdBy;
      delete result.updatedBy;
    }
  }

  return valid(result ? await rawContentToContent(connection, result) : null);
});

export const createContent = tryDb<[ValidatedCreateRequestBody, Session], Content>(async (connection, content, session) => {
  const now = new Date();
  const { title, body, slug, fixed } = content;
  const contentId = await connection.transaction(async trx => {
    const [rootContentRecord] = await connection<RootContentRecord>('content')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        createdAt: now,
        createdBy: session?.user.id,
        slug,
        fixed
      }, '*');

    if (!rootContentRecord) {
      throw new Error('unable to create content root record');
    }

    const [versionContentRecord] = await connection<VersionContentRecord>('contentVersions')
      .transacting(trx)
      .insert({
        id: 1,
        title,
        body,
        createdAt: now,
        createdBy: session?.user.id,
        contentId: rootContentRecord.id
      }, '*');

    if (!versionContentRecord) {
      throw new Error('unable to create content version');
    }

    return rootContentRecord.id;
  });

  const dbResult = await readOneContentById(connection, contentId, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to create content');
  }
  return valid(dbResult.value);
});

export const updateContent = tryDb<[Id, ValidatedUpdateRequestBody, Session], Content>(async (connection, id, content, session) => {
  const now = new Date();
  const { title, body, slug, version } = content;
  await connection.transaction(async trx => {
    // Update slug on root record
    const [rootContentRecord] = await connection<RootContentRecord>('content')
      .transacting(trx)
      .where({ id })
      .update({
        slug
      }, '*');

    if (!rootContentRecord) {
      throw new Error('unable to update content');
    }

    const [versionContentRecord] = await connection<VersionContentRecord>('contentVersions')
      .transacting(trx)
      .insert({
        id: version,
        title,
        body,
        createdAt: now,
        createdBy: session?.user.id,
        contentId: id
      }, '*');

    if (!versionContentRecord) {
      throw new Error('unable to update content version');
    }

    return versionContentRecord;
  });

  const dbResult = await readOneContentById(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to update opportunity');
  }
  return valid(dbResult.value);
});

export const deleteContent = tryDb<[Id, Session], Content>(async (connection, id, session) => {
  const [result] = await generateContentQuery(connection, true)
    .where({ 'content.id': id });

  if (!result) {
    throw new Error('unable to retrieve content for deletion');
  }

  const [deleteResult] = await connection('content')
    .where({ 'content.id': id })
    .delete('*');

  if (!deleteResult) {
    throw new Error('unable to delete content');
  }

  return valid(await rawContentToContent(connection, result));
});

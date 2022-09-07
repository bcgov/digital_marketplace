import { generateUuid } from "back-end/lib";
import { Connection, tryDb } from "back-end/lib/db";
import { hashFile } from "back-end/lib/resources/file";
import { readFile } from "fs";
import { valid } from "shared/lib/http";
import {
  FileBlob,
  FilePermissions,
  FileRecord
} from "shared/lib/resources/file";
import { Session } from "shared/lib/resources/session";
import { UserType } from "shared/lib/resources/user";
import { Id } from "shared/lib/types";
import { isInvalid } from "shared/lib/validation";

type CreateFileParams = Partial<FileRecord> & {
  path: string;
  permissions: Array<FilePermissions<Id, UserType>>;
};

export const readOneFileById = tryDb<[Id], FileRecord | null>(
  async (connection, id) => {
    const result = await connection<FileRecord>("files")
      .where({ id })
      .select(["name", "id", "createdAt", "fileBlob"])
      .first();
    return valid(result ? result : null);
  }
);

export const readOneFileBlob = tryDb<[string], FileBlob | null>(
  async (connection, hash) => {
    const result = await connection<FileBlob>("fileBlobs")
      .where({ hash })
      .first();
    return valid(result || null);
  }
);

export const createFile = tryDb<[CreateFileParams, Id], FileRecord>(
  async (connection, fileRecord, userId) => {
    const now = new Date();
    if (!fileRecord) {
      throw new Error("unable to create file");
    }

    return valid(
      await connection.transaction(async (trx) => {
        const fileData: Buffer = await new Promise((resolve, reject) => {
          readFile(fileRecord.path, (err, data) => {
            if (err) {
              reject(new Error("error reading file"));
            }
            resolve(data);
          });
        });
        if (!fileRecord.name) {
          throw new Error("unable to create file");
        }
        const fileHash = hashFile(fileRecord.name, fileData);
        const dbResult = await readOneFileBlob(connection, fileHash);
        if (isInvalid(dbResult)) {
          throw new Error("Database error");
        }
        let fileBlob = dbResult.value;
        // Create a new blob if it doesn't already exist.
        if (!fileBlob) {
          [fileBlob] = await connection("fileBlobs").transacting(trx).insert(
            {
              hash: fileHash,
              blob: fileData
            },
            ["*"]
          );
        }
        // Insert the file record.
        const [file]: FileRecord[] = await connection("files")
          .transacting(trx)
          .insert(
            {
              name: fileRecord.name,
              id: generateUuid(),
              createdAt: now,
              createdBy: userId,
              fileBlob: fileBlob && fileBlob.hash
            },
            ["name", "id", "createdAt", "fileBlob"]
          );

        // Insert values for permissions defined in metadata
        for (const permission of fileRecord.permissions) {
          switch (permission.tag) {
            case "any":
              await connection("filePermissionsPublic")
                .transacting(trx)
                .insert({
                  file: file.id
                });
              break;

            case "user":
              await connection("filePermissionsUser").transacting(trx).insert({
                user: permission.value,
                file: file.id
              });
              break;

            case "userType":
              await connection("filePermissionsUserType")
                .transacting(trx)
                .insert({
                  userType: permission.value,
                  file: file.id
                });
              break;
          }
        }
        return file;
      })
    );
  }
);

export async function hasFilePermission(
  connection: Connection,
  session: Session | null,
  id: string
): Promise<boolean> {
  try {
    // Check public file permissions first
    let results = await connection("filePermissionsPublic as p").where({
      "p.file": id
    });
    if (results.length > 0) {
      return true;
    }

    // If authenticated, check user, user type and ownership permissions
    if (session) {
      results = await connection("filePermissionsUser as u").where({
        "u.file": id,
        "u.user": session.user.id
      });
      if (results.length > 0) {
        return true;
      }

      results = await connection("filePermissionsUserType as ut").where({
        "ut.file": id,
        "ut.userType": session.user.type
      });
      if (results.length > 0) {
        return true;
      }

      results = await connection("files").where({
        "files.id": id,
        "files.createdBy": session.user.id
      });
      if (results.length > 0) {
        return true;
      }
    }
    return false;
  } catch (exception) {
    return false;
  }
}

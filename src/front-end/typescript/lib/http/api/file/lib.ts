import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/file";

// Raw Conversion

export interface RawFileRecord extends Omit<Resource.FileRecord, "createdAt"> {
  createdAt: string;
}

export function rawFileRecordToFileRecord(
  raw: RawFileRecord
): Resource.FileRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

// Make a Create action

export interface CreateFileRequestBody {
  name: string;
  file: File;
  metadata: Resource.FileUploadMetadata;
}

export function makeCreateAction<InvalidResponse, Msg>(
  routeNamespace: string
): crud.CreateAction<
  CreateFileRequestBody,
  Resource.FileRecord,
  InvalidResponse,
  Msg
> {
  return (body, handleResponse) => {
    const multipartBody = new FormData();
    multipartBody.append("name", body.name);
    multipartBody.append("file", body.file);
    multipartBody.append("metadata", JSON.stringify(body.metadata));
    return crud.makeCreateAction<
      FormData,
      RawFileRecord,
      Resource.FileRecord,
      InvalidResponse,
      Msg
    >(routeNamespace, rawFileRecordToFileRecord)(multipartBody, handleResponse);
  };
}

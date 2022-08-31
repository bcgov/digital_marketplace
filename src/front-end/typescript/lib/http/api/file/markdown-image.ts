import * as RichMarkdownEditor from "front-end/lib/components/form-field/rich-markdown-editor";
import * as Resource from "shared/lib/resources/file";
import { invalid, isValid, valid } from "shared/lib/http";
import * as files from "front-end/lib/http/api/file";
import { adt } from "shared/lib/types";

export function makeUploadImage(
  metadata: Resource.FileUploadMetadata = [adt("any")]
): RichMarkdownEditor.UploadImage {
  return (file) => {
    return files.create(
      {
        name: file.name,
        file,
        metadata
      },
      (result) => {
        if (isValid(result)) {
          return valid({
            name: result.value.name,
            url: Resource.encodeFileIdToMarkdownImageUrl(result.value.id)
          });
        } else {
          return invalid(["Unable to upload file."]);
        }
      }
    ) as ReturnType<RichMarkdownEditor.UploadImage>;
  };
}

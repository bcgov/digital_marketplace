import * as React from "react";

import type { OurFileRouter } from "front-end/lib/components/platejs/lib/uploadthing";
import type {
  ClientUploadedFileData,
  UploadFilesOptions
} from "uploadthing/types";

import { generateReactHelpers } from "@uploadthing/react";
import { toast } from "sonner";
import { z } from "zod";
import * as api from "front-end/lib/http/api";
import { isValid } from "shared/lib/validation";
import * as Resource from "shared/lib/resources/file";
import { fileBlobPath } from "front-end/lib";
import { adt } from "shared/lib/types";

export type UploadedFile<T = unknown> = ClientUploadedFileData<T>;

interface UseUploadFileProps
  extends Pick<
    UploadFilesOptions<OurFileRouter["editorUploader"]>,
    "headers" | "onUploadBegin" | "onUploadProgress" | "skipPolling"
  > {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
  ...props
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadThing(file: File) {
    setIsUploading(true);
    setUploadingFile(file);

    try {
      // Use the existing upload API instead of UploadThing
      const uploadCommand = api.files.markdownImages.makeUploadImage([
        adt("any")
      ])(file);

      // Simulate progress while upload is happening
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 10;
          return next >= 90 ? 90 : next;
        });
      }, 100);

      // Execute the command and wait for result
      const result: any = await new Promise((resolve) => {
        uploadCommand.value().then(resolve);
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (isValid(result as any)) {
        // Get the encoded URL from upload response (FILE_ID:uuid format)
        const encodedUrl = (result as any).value.url;
        const fileName = (result as any).value.name || file.name;

        // Convert FILE_ID:uuid to actual blob URL for preview
        const fileId = Resource.decodeMarkdownImageUrlToFileId(encodedUrl);
        const displayUrl = fileId ? fileBlobPath({ id: fileId }) : encodedUrl;

        // Create UploadThing-compatible response format
        const uploadedFile = {
          key: fileId || `file-${Date.now()}`,
          name: fileName,
          size: file.size,
          type: file.type,
          url: displayUrl,
          appUrl: displayUrl
        } as UploadedFile;

        setUploadedFile(uploadedFile);
        onUploadComplete?.(uploadedFile);

        return uploadedFile;
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      const message =
        errorMessage.length > 0
          ? errorMessage
          : "Something went wrong, please try again later.";

      toast.error(message);

      onUploadError?.(error);

      // Mock upload for unauthenticated users
      const mockUploadedFile = {
        key: "mock-key-0",
        appUrl: `https://mock-app-url.com/${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      } as UploadedFile;

      // Simulate upload progress
      let progress = 0;

      const simulateProgress = async () => {
        while (progress < 100) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          progress += 2;
          setProgress(Math.min(progress, 100));
        }
      };

      await simulateProgress();

      setUploadedFile(mockUploadedFile);

      return mockUploadedFile;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile
  };
}

export const { uploadFiles, useUploadThing } =
  generateReactHelpers<OurFileRouter>();

export function getErrorMessage(err: unknown) {
  const unknownError = "Something went wrong, please try again later.";

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => {
      return issue.message;
    });

    return errors.join("\n");
  } else if (err instanceof Error) {
    return err.message;
  } else {
    return unknownError;
  }
}

export function showErrorToast(err: unknown) {
  const errorMessage = getErrorMessage(err);

  return toast.error(errorMessage);
}

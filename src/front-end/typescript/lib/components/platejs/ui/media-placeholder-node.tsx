"use client";

import * as React from "react";

import type { TPlaceholderElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import {
  PlaceholderPlugin,
  PlaceholderProvider,
  updateUploadHistory
} from "@platejs/media/react";
import { AudioLines, FileUp, Film, ImageIcon, Loader2Icon } from "lucide-react";
import { KEYS } from "platejs";
import { PlateElement, useEditorPlugin, withHOC } from "platejs/react";
import { useFilePicker } from "use-file-picker";

import { cn } from "./utils";
import { useUploadFile } from "front-end/lib/components/platejs/hooks/use-upload-file";

const CONTENT: Record<
  string,
  {
    accept: string[];
    content: React.ReactNode;
    icon: React.ReactNode;
  }
> = {
  [KEYS.audio]: {
    accept: ["audio/*"],
    content: "Add an audio file",
    icon: <AudioLines />
  },
  [KEYS.file]: {
    accept: ["*"],
    content: "Add a file",
    icon: <FileUp />
  },
  [KEYS.img]: {
    accept: ["image/*"],
    content: "Add an image",
    icon: <ImageIcon />
  },
  [KEYS.video]: {
    accept: ["video/*"],
    content: "Add a video",
    icon: <Film />
  }
};

export const PlaceholderElement = withHOC(
  PlaceholderProvider,
  function PlaceholderElement(props: PlateElementProps<TPlaceholderElement>) {
    const { editor, element } = props;

    const { api } = useEditorPlugin(PlaceholderPlugin);

    const { isUploading, progress, uploadedFile, uploadFile, uploadingFile } =
      useUploadFile();

    const loading = isUploading && uploadingFile;

    const currentContent = CONTENT[element.mediaType];

    const isImage = element.mediaType === KEYS.img;

    const imageRef = React.useRef<HTMLImageElement>(null);

    const { openFilePicker } = useFilePicker({
      accept: currentContent.accept,
      multiple: true,
      onFilesSelected: ({ plainFiles: updatedFiles }) => {
        const firstFile = updatedFiles[0];
        const restFiles = updatedFiles.slice(1);

        replaceCurrentPlaceholder(firstFile);

        if (restFiles.length > 0) {
          editor.getTransforms(PlaceholderPlugin).insert.media(restFiles);
        }
      }
    });

    const replaceCurrentPlaceholder = React.useCallback(
      (file: File) => {
        void uploadFile(file);
        api.placeholder.addUploadingFile(element.id as string, file);
      },
      [api.placeholder, element.id, uploadFile]
    );

    React.useEffect(() => {
      if (!uploadedFile) return;

      const path = editor.api.findPath(element);

      editor.tf.withoutSaving(() => {
        editor.tf.removeNodes({ at: path });

        const node = {
          children: [{ text: "" }],
          initialHeight: imageRef.current?.height,
          initialWidth: imageRef.current?.width,
          isUpload: true,
          name: element.mediaType === KEYS.file ? uploadedFile.name : "",
          placeholderId: element.id as string,
          type: element.mediaType!,
          url: uploadedFile.url
        };

        editor.tf.insertNodes(node, { at: path });

        updateUploadHistory(editor, node);
      });

      api.placeholder.removeUploadingFile(element.id as string);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uploadedFile, element.id]);

    // React dev mode will call React.useEffect twice
    const isReplaced = React.useRef(false);

    /** Paste and drop */
    React.useEffect(() => {
      if (isReplaced.current) return;

      isReplaced.current = true;
      const currentFiles = api.placeholder.getUploadingFile(
        element.id as string
      );

      if (!currentFiles) return;

      replaceCurrentPlaceholder(currentFiles);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReplaced]);

    return (
      <PlateElement className="tw:my-1" {...props}>
        {(!loading || !isImage) && (
          <div
            className={cn(
              "tw:flex tw:cursor-pointer tw:items-center tw:rounded-sm tw:bg-muted tw:p-3 tw:pr-9 tw:select-none tw:hover:bg-primary/10"
            )}
            onClick={() => !loading && openFilePicker()}
            contentEditable={false}>
            <div className="tw:relative tw:mr-3 tw:flex tw:text-muted-foreground/80 tw:[&_svg]:size-6">
              {currentContent.icon}
            </div>
            <div className="tw:text-sm tw:whitespace-nowrap tw:text-muted-foreground">
              <div>
                {loading ? uploadingFile?.name : currentContent.content}
              </div>

              {loading && !isImage && (
                <div className="tw:mt-1 tw:flex tw:items-center tw:gap-1.5">
                  <div>{formatBytes(uploadingFile?.size ?? 0)}</div>
                  <div>–</div>
                  <div className="tw:flex tw:items-center">
                    <Loader2Icon className="tw:mr-1 tw:size-3.5 tw:animate-spin tw:text-muted-foreground" />
                    {progress ?? 0}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isImage && loading && (
          <ImageProgress
            file={uploadingFile}
            imageRef={imageRef}
            progress={progress}
          />
        )}

        {props.children}
      </PlateElement>
    );
  }
);

export function ImageProgress({
  className,
  file,
  imageRef,
  progress = 0
}: {
  file: File;
  className?: string;
  imageRef?: React.RefObject<HTMLImageElement | null>;
  progress?: number;
}) {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!objectUrl) {
    return null;
  }

  return (
    <div className={cn("tw:relative", className)} contentEditable={false}>
      <img
        ref={imageRef}
        className="tw:h-auto tw:w-full tw:rounded-sm tw:object-cover"
        alt={file.name}
        src={objectUrl}
      />
      {progress < 100 && (
        <div className="tw:absolute tw:right-1 tw:bottom-1 tw:flex tw:items-center tw:space-x-2 tw:rounded-full tw:bg-black/50 tw:px-1 tw:py-0.5">
          <Loader2Icon className="tw:size-3.5 tw:animate-spin tw:text-muted-foreground" />
          <span className="tw:text-xs tw:font-medium tw:text-white">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: "accurate" | "normal";
  } = {}
) {
  const { decimals = 0, sizeType = "normal" } = opts;

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];

  if (bytes === 0) return "0 Byte";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === "accurate" ? accurateSizes[i] ?? "Bytest" : sizes[i] ?? "Bytes"
  }`;
}

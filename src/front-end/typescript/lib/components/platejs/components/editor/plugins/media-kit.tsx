"use client";

import { CaptionPlugin } from "@platejs/caption/react";
import {
  AudioPlugin,
  FilePlugin,
  ImagePlugin,
  MediaEmbedPlugin,
  PlaceholderPlugin,
  VideoPlugin
} from "@platejs/media/react";
import { KEYS } from "platejs";

import { AudioElement } from "front-end/lib/components/platejs/ui/media-audio-node";
import { MediaEmbedElement } from "front-end/lib/components/platejs/ui/media-embed-node";
import { FileElement } from "front-end/lib/components/platejs/ui/media-file-node";
import { ImageElement } from "front-end/lib/components/platejs/ui/media-image-node";
import { PlaceholderElement } from "front-end/lib/components/platejs/ui/media-placeholder-node";
import { MediaPreviewDialog } from "front-end/lib/components/platejs/ui/media-preview-dialog";
import { MediaUploadToast } from "front-end/lib/components/platejs/ui/media-upload-toast";
import { VideoElement } from "front-end/lib/components/platejs/ui/media-video-node";

export const MediaKit = [
  ImagePlugin.configure({
    options: { disableUploadInsert: true },
    render: { afterEditable: MediaPreviewDialog, node: ImageElement }
  }),
  MediaEmbedPlugin.withComponent(MediaEmbedElement),
  VideoPlugin.withComponent(VideoElement),
  AudioPlugin.withComponent(AudioElement),
  FilePlugin.withComponent(FileElement),
  PlaceholderPlugin.configure({
    options: { disableEmptyPlaceholder: true },
    render: { afterEditable: MediaUploadToast, node: PlaceholderElement }
  }),
  CaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed]
      }
    }
  })
];

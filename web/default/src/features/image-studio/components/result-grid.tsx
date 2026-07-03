/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  Copy,
  Download,
  ImageIcon,
  PackageOpen,
  Pencil,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState, type WheelEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";

import {
  copyImageToClipboard,
  downloadImage,
  downloadImagesAsZip,
  imageFileName,
} from "../lib/image-utils";
import type { GeneratedImage, GenerationRecord } from "../types";

type ResultGridProps = {
  record: GenerationRecord | null;
  error: string | null;
  onRetry: () => void;
  onEditImage: (image: GeneratedImage) => void;
  isGenerating: boolean;
};

function UsageBar({ record }: { record: GenerationRecord }) {
  const { t } = useTranslation();
  const usage = record.usage;
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <Badge variant="secondary">{record.model}</Badge>
      <span>{t(record.size)}</span>
      {record.quality && <span>{t(record.quality)}</span>}
      <span>{t("{{count}} images", { count: record.images.length })}</span>
      {usage && (
        <span className="tabular-nums">
          {t("Took {{seconds}}s", {
            seconds: (usage.durationMs / 1000).toFixed(1),
          })}
        </span>
      )}
    </div>
  );
}

export function ResultGrid({
  record,
  error,
  onRetry,
  onEditImage,
  isGenerating,
}: ResultGridProps) {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);

  if (error) {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-destructive text-sm break-all">{error}</p>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onRetry}
            disabled={isGenerating}
          >
            <RefreshCw className="size-3.5" />
            {t("Retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <Empty className="h-full min-h-[360px] border-none py-0">
        {!isGenerating && (
          <div className="from-primary/10 via-primary/5 to-background relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm">
            <div className="bg-primary/20 absolute -top-6 -right-6 size-12 rounded-full blur-xl" />
            <ImageIcon className="text-primary/70 relative size-8" />
            <Sparkles className="text-primary/60 absolute top-3 right-3 size-3.5" />
          </div>
        )}
        <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
          {isGenerating ? (
            <>
              <span className="animate-pulse">{t("Thinking")}</span>
              <span className="flex h-5 items-end gap-1" aria-hidden="true">
                <span className="bg-primary/40 h-2 w-1 animate-pulse rounded-full" />
                <span className="bg-primary/60 h-4 w-1 animate-pulse rounded-full [animation-delay:120ms]" />
                <span className="bg-primary/80 h-5 w-1 animate-pulse rounded-full [animation-delay:240ms]" />
                <span className="bg-primary/60 h-3 w-1 animate-pulse rounded-full [animation-delay:360ms]" />
                <span className="bg-primary/40 h-2 w-1 animate-pulse rounded-full [animation-delay:480ms]" />
              </span>
            </>
          ) : (
            <p className="text-foreground text-base font-medium">
              {t("Enter a prompt to start generating images")}
            </p>
          )}
        </div>
      </Empty>
    );
  }

  const handleDownloadAll = async () => {
    const skipped = await downloadImagesAsZip(
      record.images,
      `images-${record.createdAt}`,
      record.outputFormat,
    );
    if (skipped > 0) {
      toast.warning(
        t("{{count}} images could not be packed", { count: skipped }),
      );
    }
  };

  const handleCopy = async (image: GeneratedImage) => {
    try {
      await copyImageToClipboard(image.src);
      toast.success(t("Image copied to clipboard"));
    } catch {
      toast.error(t("Copy failed, please download instead"));
    }
  };

  const handleOpenPreview = (image: GeneratedImage) => {
    setPreviewZoom(1);
    setPreviewRotation(0);
    setPreviewImage(image);
  };

  const handleClosePreview = () => {
    setPreviewImage(null);
    setPreviewZoom(1);
    setPreviewRotation(0);
  };

  const handleZoomIn = () => {
    setPreviewZoom((currentZoom) => Math.min(currentZoom + 0.25, 3));
  };

  const handleZoomOut = () => {
    setPreviewZoom((currentZoom) => Math.max(currentZoom - 0.25, 0.5));
  };

  const handleRotatePreview = () => {
    setPreviewRotation((currentRotation) => (currentRotation + 90) % 360);
  };

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setPreviewZoom((currentZoom) => {
      const zoomDelta = event.deltaY < 0 ? 0.1 : -0.1;
      return Math.min(Math.max(currentZoom + zoomDelta, 0.5), 3);
    });
  };

  const handleResetPreview = () => {
    setPreviewZoom(1);
    setPreviewRotation(0);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <UsageBar record={record} />
        {record.images.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleDownloadAll()}
          >
            <PackageOpen className="size-3.5" />
            {t("Download all")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {record.images.map((image, index) => (
          <div
            key={image.id}
            className="group bg-muted/30 relative overflow-hidden rounded-lg border"
          >
            <button
              type="button"
              className="block w-full"
              onClick={() => handleOpenPreview(image)}
            >
              <img
                src={image.src}
                alt={record.prompt.slice(0, 80)}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
            </button>
            <div className="absolute inset-x-0 bottom-0 hidden items-center justify-end gap-1 bg-background/25 p-1.5 backdrop-blur-[1px] group-hover:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  void downloadImage(
                    image.src,
                    imageFileName(index, image.src, record.outputFormat),
                  )
                }
                aria-label={t("Download")}
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => void handleCopy(image)}
                aria-label={t("Copy image")}
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onEditImage(image)}
                aria-label={t("Edit this image")}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) handleClosePreview();
        }}
      >
        <DialogContent
          className="bg-transparent p-0 shadow-none ring-0 sm:max-w-none [&_[data-slot=dialog-close]]:bg-foreground/45 [&_[data-slot=dialog-close]]:text-background [&_[data-slot=dialog-close]]:backdrop-blur-md [&_[data-slot=dialog-close]]:hover:bg-foreground/60"
          overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-[1.5px]"
        >
          <DialogTitle className="sr-only">{t("Image preview")}</DialogTitle>
          {previewImage && (
            <div
              className="flex h-[96vh] w-screen min-w-0 flex-col items-center justify-start px-6 pt-4 pb-3"
              onClick={handleClosePreview}
            >
              <div
                className="flex min-h-0 max-w-[86vw] flex-1 items-center justify-center overflow-hidden"
                onWheel={handlePreviewWheel}
              >
                <img
                  src={previewImage.src}
                  alt={record.prompt.slice(0, 80)}
                  className="max-h-none max-w-none rounded-lg object-contain transition-transform duration-150"
                  style={{
                    height: `${previewZoom * 100}%`,
                    transform: `rotate(${previewRotation}deg)`,
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
              <div
                className="mt-2 flex flex-col gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                {previewImage.revisedPrompt && (
                  <p className="text-muted-foreground mx-auto max-h-16 max-w-[min(86vw,720px)] overflow-auto text-center text-xs leading-relaxed">
                    <span className="font-medium">{t("Prompt")}: </span>
                    {previewImage.revisedPrompt}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border bg-background/95 p-1.5 shadow-sm backdrop-blur-sm sm:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleZoomOut}
                    disabled={previewZoom <= 0.5}
                    aria-label={t("Zoom out")}
                  >
                    <ZoomOut className="size-3.5" />
                  </Button>
                  <span className="text-muted-foreground min-w-12 text-center text-xs tabular-nums">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleZoomIn}
                    disabled={previewZoom >= 3}
                    aria-label={t("Zoom in")}
                  >
                    <ZoomIn className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRotatePreview}
                    aria-label={t("Rotate")}
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleResetPreview}
                    aria-label={t("Reset view")}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void handleCopy(previewImage)}
                    aria-label={t("Copy image")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      void downloadImage(
                        previewImage.src,
                        imageFileName(
                          record.images.findIndex(
                            (item) => item.id === previewImage.id,
                          ),
                          previewImage.src,
                          record.outputFormat,
                        ),
                      )
                    }
                    aria-label={t("Download")}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      onEditImage(previewImage);
                      handleClosePreview();
                    }}
                    aria-label={t("Edit this image")}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type PreviewPhoto = {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string;
};

const TARGET_PHOTO_BYTES = 420 * 1024;
const MAX_SUBMIT_PHOTO_BYTES = 1024 * 1024;
const PHOTO_OUTPUT_TYPE = "image/jpeg";
const RESIZE_STEPS = [1400, 1200, 1000, 800];
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.44, 0.36];

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image preview failed"));
    };
    image.src = url;
  });
}

function compressedFileName(name: string) {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

async function compressImageFile(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file.size <= MAX_SUBMIT_PHOTO_BYTES ? file : null;
  }

  try {
    const image = await loadImage(file);
    let bestFile: File | null = file.size <= MAX_SUBMIT_PHOTO_BYTES ? file : null;

    for (const maxDimension of RESIZE_STEPS) {
      const scale = Math.min(1, maxDimension / image.naturalWidth, maxDimension / image.naturalHeight);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) continue;

      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, PHOTO_OUTPUT_TYPE, quality);
        if (!blob) continue;

        const nextFile = new File([blob], compressedFileName(file.name), {
          type: PHOTO_OUTPUT_TYPE,
          lastModified: file.lastModified
        });
        bestFile = nextFile;
        if (blob.size <= TARGET_PHOTO_BYTES || blob.size <= MAX_SUBMIT_PHOTO_BYTES) {
          return nextFile;
        }
      }
    }

    return bestFile;
  } catch {
    return file.size <= MAX_SUBMIT_PHOTO_BYTES ? file : null;
  }

  return null;
}

export function ProductPhotoUploadInput({ disabled }: { disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<PreviewPhoto[]>([]);
  const [previews, setPreviews] = useState<PreviewPhoto[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, []);

  function syncInputFiles(nextPreviews: PreviewPhoto[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    nextPreviews.forEach((preview) => transfer.items.add(preview.file));
    inputRef.current.files = transfer.files;
  }

  function setOrderedPreviews(updater: (current: PreviewPhoto[]) => PreviewPhoto[]) {
    setPreviews((current) => {
      const next = updater(current);
      syncInputFiles(next);
      return next;
    });
  }

  function removePreview(id: string) {
    setOrderedPreviews((current) => {
      const removed = current.find((preview) => preview.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((preview) => preview.id !== id);
    });
  }

  function clearPreviews() {
    setUploadNotice(null);
    setOrderedPreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url));
      return [];
    });
  }

  function movePreview(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setOrderedPreviews((current) => {
      const sourceIndex = current.findIndex((preview) => preview.id === sourceId);
      const targetIndex = current.findIndex((preview) => preview.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setIsProcessing(true);
    setUploadNotice(null);
    syncInputFiles([]);
    try {
      const compressedFiles = (await Promise.all(files.map((file) => compressImageFile(file)))).filter(
        (file): file is File => Boolean(file)
      );
      const skippedCount = files.length - compressedFiles.length;
      if (skippedCount > 0) {
        setUploadNotice(
          `${skippedCount} photo(s) were skipped because the browser could not optimize them under the Vercel upload limit. Please retry as JPG or PNG.`
        );
      }
      setOrderedPreviews((current) => [
        ...current,
        ...compressedFiles.map((file, index) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${current.length + index}`,
          file,
          name: file.name,
          size: file.size,
          url: URL.createObjectURL(file)
        }))
      ]);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="photoUpload">
      <input
        ref={inputRef}
        name="photos"
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || isProcessing}
        onChange={(event) => {
          void handleFiles(Array.from(event.currentTarget.files ?? []));
        }}
      />
      {previews.length ? (
        <>
          <div className="photoPreviewToolbar">
            <span>{`Selected photos ${previews.length}${isProcessing ? " · optimizing" : ""}`}</span>
            <button type="button" onClick={clearPreviews} disabled={disabled || isProcessing}>
              Clear all
            </button>
          </div>
          {uploadNotice ? <p className="photoOrderHint danger">{uploadNotice}</p> : null}
          <div className="photoPreviewGrid" aria-label="Selected product photo preview. Drag to reorder.">
            {previews.map((preview, index) => (
              <figure
                className={`photoPreviewItem${draggingId === preview.id ? " dragging" : ""}`}
                draggable={!disabled && !isProcessing}
                key={preview.id}
                onDragStart={(event) => {
                  setDraggingId(preview.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", preview.id);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  const sourceId = draggingId ?? event.dataTransfer.getData("text/plain");
                  if (sourceId) movePreview(sourceId, preview.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingId(null);
                }}
              >
                <img src={preview.url} alt={`Selected product photo ${index + 1}`} />
                <button
                  className="photoPreviewRemove"
                  type="button"
                  onClick={() => removePreview(preview.id)}
                  onDragStart={(event) => event.preventDefault()}
                  disabled={disabled || isProcessing}
                  aria-label={`Remove ${preview.name}`}
                >
                  x
                </button>
                <figcaption>
                  <strong>{index + 1}</strong>
                  <span>{preview.name}</span>
                  <small>{formatFileSize(preview.size)}</small>
                </figcaption>
              </figure>
            ))}
            <p className="photoOrderHint">
              Photos are optimized before upload. Drag to reorder; this order is used as generation reference.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="muted">{isProcessing ? "Optimizing photos." : "Select photos to preview them here."}</p>
          {uploadNotice ? <p className="photoOrderHint danger">{uploadNotice}</p> : null}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type PreviewPhoto = {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string;
};

const MAX_PHOTO_DIMENSION = 1400;
const TARGET_PHOTO_BYTES = 420 * 1024;
const PHOTO_OUTPUT_TYPE = "image/jpeg";

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

async function compressImageFile(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / image.naturalWidth, MAX_PHOTO_DIMENSION / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.44]) {
      const blob = await canvasToBlob(canvas, PHOTO_OUTPUT_TYPE, quality);
      if (!blob) continue;
      if (blob.size <= TARGET_PHOTO_BYTES || quality === 0.44) {
        return new File([blob], compressedFileName(file.name), {
          type: PHOTO_OUTPUT_TYPE,
          lastModified: file.lastModified
        });
      }
    }
  } catch {
    return file;
  }

  return file;
}

export function ProductPhotoUploadInput({ disabled }: { disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<PreviewPhoto[]>([]);
  const [previews, setPreviews] = useState<PreviewPhoto[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    try {
      const compressedFiles = await Promise.all(files.map((file) => compressImageFile(file)));
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
            <span>{`선택된 새 사진 ${previews.length}개${isProcessing ? " · 최적화 중" : ""}`}</span>
            <button type="button" onClick={clearPreviews} disabled={disabled || isProcessing}>
              전체삭제
            </button>
          </div>
          <div className="photoPreviewGrid" aria-label="선택한 상품 사진 미리보기. 드래그해서 순서를 바꿀 수 있습니다.">
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
                <img src={preview.url} alt={`선택한 상품 사진 ${index + 1}`} />
                <button
                  className="photoPreviewRemove"
                  type="button"
                  onClick={() => removePreview(preview.id)}
                  onDragStart={(event) => event.preventDefault()}
                  disabled={disabled || isProcessing}
                  aria-label={`${preview.name} 삭제`}
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
              사진은 업로드 전에 자동으로 용량을 줄입니다. 드래그하면 바로 순서가 바뀌고, 이 순서대로 생성에 참고합니다.
            </p>
          </div>
        </>
      ) : (
        <p className="muted">
          {isProcessing ? "사진을 최적화하는 중입니다." : "사진을 선택하면 여기에서 바로 미리볼 수 있습니다."}
        </p>
      )}
    </div>
  );
}

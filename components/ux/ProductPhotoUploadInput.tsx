"use client";

import { useEffect, useRef, useState } from "react";

type PreviewPhoto = {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProductPhotoUploadInput({ disabled }: { disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<PreviewPhoto[]>([]);
  const [previews, setPreviews] = useState<PreviewPhoto[]>([]);

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

  function removePreview(id: string) {
    setPreviews((current) => {
      const removed = current.find((preview) => preview.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      const next = current.filter((preview) => preview.id !== id);
      syncInputFiles(next);
      return next;
    });
  }

  return (
    <div className="photoUpload">
      <input
        ref={inputRef}
        name="photos"
        type="file"
        accept="image/*"
        multiple
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          setPreviews((current) => {
            current.forEach((preview) => URL.revokeObjectURL(preview.url));
            return files.map((file, index) => ({
              id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
              file,
              name: file.name,
              size: file.size,
              url: URL.createObjectURL(file)
            }));
          });
        }}
      />
      {previews.length ? (
        <div className="photoPreviewGrid" aria-label="선택한 상품 사진 미리보기">
          {previews.map((preview, index) => (
            <figure className="photoPreviewItem" key={preview.id}>
              <img src={preview.url} alt={`선택한 상품 사진 ${index + 1}`} />
              <button
                className="photoPreviewRemove"
                type="button"
                onClick={() => removePreview(preview.id)}
                aria-label={`${preview.name} 삭제`}
              >
                ×
              </button>
              <figcaption>
                <strong>{index + 1}</strong>
                <span>{preview.name}</span>
                <small>{formatFileSize(preview.size)}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="muted">사진을 선택하면 여기에서 바로 미리볼 수 있습니다.</p>
      )}
    </div>
  );
}

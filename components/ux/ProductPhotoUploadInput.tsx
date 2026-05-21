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
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
          setOrderedPreviews((current) => [
            ...current,
            ...files.map((file, index) => ({
              id: `${file.name}-${file.size}-${file.lastModified}-${current.length + index}`,
              file,
              name: file.name,
              size: file.size,
              url: URL.createObjectURL(file)
            }))
          ]);
          event.currentTarget.value = "";
        }}
      />
      {previews.length ? (
        <>
          <div className="photoPreviewToolbar">
            <span>선택된 새 사진 {previews.length}개</span>
            <button type="button" onClick={clearPreviews} disabled={disabled}>
              전체삭제
            </button>
          </div>
          <div className="photoPreviewGrid" aria-label="선택한 상품 사진 미리보기. 드래그해서 순서를 바꿀 수 있습니다.">
            {previews.map((preview, index) => (
              <figure
                className={`photoPreviewItem${draggingId === preview.id ? " dragging" : ""}`}
                draggable={!disabled}
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
            <p className="photoOrderHint">사진을 드래그하면 바로 순서가 바뀝니다. 이 순서대로 생성에 참고됩니다.</p>
          </div>
        </>
      ) : (
        <p className="muted">사진을 선택하면 여기에서 바로 미리볼 수 있습니다.</p>
      )}
    </div>
  );
}

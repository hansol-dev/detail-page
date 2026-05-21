"use client";

import { useState } from "react";
import type { Asset } from "@/lib/types";

export function ExistingProductPhotos({ assets, disabled = false }: { assets: Asset[]; disabled?: boolean }) {
  const [keptAssets, setKeptAssets] = useState(assets);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function moveAsset(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setKeptAssets((current) => {
      const sourceIndex = current.findIndex((asset) => asset.id === sourceId);
      const targetIndex = current.findIndex((asset) => asset.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  }

  if (!keptAssets.length) {
    return <p className="muted">저장된 상품 사진이 없습니다.</p>;
  }

  return (
    <div className="photoPreviewGrid existingPhotoGrid" aria-label="저장된 상품 사진. 드래그해서 순서를 바꿀 수 있습니다.">
      {keptAssets.map((asset, index) => (
        <figure
          className={`photoPreviewItem${draggingId === asset.id ? " dragging" : ""}`}
          draggable={!disabled}
          key={asset.id}
          onDragStart={(event) => {
            setDraggingId(asset.id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", asset.id);
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            const sourceId = draggingId ?? event.dataTransfer.getData("text/plain");
            if (sourceId) moveAsset(sourceId, asset.id);
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
          <input type="hidden" name="retainedPhotoAssetIds" value={asset.id} />
          <img src={`/api/assets/${asset.id}`} alt={`저장된 상품 사진 ${index + 1}`} />
          <button
            className="photoPreviewRemove"
            type="button"
            onClick={() => setKeptAssets((current) => current.filter((item) => item.id !== asset.id))}
            onDragStart={(event) => event.preventDefault()}
            aria-label={`저장된 상품 사진 ${index + 1} 삭제`}
            disabled={disabled}
          >
            ×
          </button>
          <figcaption>
            <strong>{index + 1}</strong>
            <span>{asset.storageKey.split(/[\\/]/).pop() ?? "상품 사진"}</span>
            <small>저장됨</small>
          </figcaption>
        </figure>
      ))}
      <p className="photoOrderHint">저장된 사진도 드래그하면 바로 순서가 바뀝니다.</p>
    </div>
  );
}

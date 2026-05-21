"use client";

import { useState } from "react";
import type { Asset } from "@/lib/types";

export function ExistingProductPhotos({ assets, disabled = false }: { assets: Asset[]; disabled?: boolean }) {
  const [keptAssets, setKeptAssets] = useState(assets);

  if (!keptAssets.length) {
    return <p className="muted">저장된 상품 사진이 없습니다.</p>;
  }

  return (
    <div className="photoPreviewGrid existingPhotoGrid" aria-label="저장된 상품 사진">
      {keptAssets.map((asset, index) => (
        <figure className="photoPreviewItem" key={asset.id}>
          <input type="hidden" name="retainedPhotoAssetIds" value={asset.id} />
          <img src={`/api/assets/${asset.id}`} alt={`저장된 상품 사진 ${index + 1}`} />
          <button
            className="photoPreviewRemove"
            type="button"
            onClick={() => setKeptAssets((current) => current.filter((item) => item.id !== asset.id))}
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
    </div>
  );
}

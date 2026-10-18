"use client";

import { useState } from "react";
import { presignUploadAction, setProductImageAction } from "../../actions";

/**
 * Product images live in S3 and are only accepted once the uploader confirms
 * the brand holds the rights to use them. Images are for catalogue display;
 * SizeMemo does not derive any measurement from photographs.
 */
export function ImagePanel({ productId, imageKey, rightsConfirmed, s3 }: { productId: string; imageKey: string | null; rightsConfirmed: boolean; s3: boolean }) {
  const [rights, setRights] = useState(rightsConfirmed);
  const [status, setStatus] = useState<string | null>(null);

  async function upload(file: File) {
    setStatus("Requesting upload URL…");
    const r = await presignUploadAction("product_image", file.name, file.type);
    if (!r.ok) return setStatus(r.error);
    const put = await fetch(r.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!put.ok) return setStatus(`Upload failed (${put.status}).`);
    await setProductImageAction(productId, r.key, rights);
    setStatus(`Uploaded ${r.key.split("/").slice(-1)[0]}`);
  }

  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div>
        <h3>Product imagery</h3>
        <p className="small muted">
          Images are stored in Amazon S3 for catalogue display only. SizeMemo never estimates body or garment measurements from photographs.
        </p>
        <p className="small">{imageKey ? <>Current image: <span className="mono">{imageKey}</span></> : "No image on file."}</p>
      </div>
      <div className="stack">
        <label className="row small" style={{ alignItems: "flex-start" }}>
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
          <span>I confirm we own or are licensed to use this image, and any model shown has consented to its use.</span>
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={!rights || !s3}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          aria-label="Upload product image"
        />
        {!s3 && <p className="tiny muted">S3 is not configured in this environment (set SIZEMEMO_S3_BUCKET).</p>}
        {status && <p className="tiny">{status}</p>}
      </div>
    </div>
  );
}

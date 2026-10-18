import { SAMPLE_CSV } from "@/lib/feedback-import";
import { s3Configured } from "@/lib/integrations/s3";
import { bedrockEnabled } from "@/lib/ai/bedrock";
import { ImportClient } from "./ImportClient";

export const metadata = { title: "Import feedback" };

export default function ImportPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Return feedback import</div>
          <h1>Import return reasons</h1>
          <p>
            Paste or upload a returns export. Each row is matched to a product by SKU, then classified{" "}
            {bedrockEnabled() ? "with Amazon Bedrock" : "with the keyword classifier"}. Large files can be dropped into S3, where a Lambda
            worker imports and classifies them in the background.
          </p>
        </div>
      </div>
      <ImportClient sample={SAMPLE_CSV} s3={s3Configured()} />
    </>
  );
}

"use client";

import { useState } from "react";
import { App, Button, Image, Input, Space, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { MAX_PHOTO_BYTES, type MediaKind } from "@/lib/media-rules";

const { Text } = Typography;

/**
 * Photo field: upload a photo from the computer, or paste a link.
 * The uploaded photo is saved on our server and its link is put in the field;
 * it is used once the form is saved.
 */
export function PhotoUpload({
  value,
  onChange,
  kind,
  placeholder,
}: {
  value: string;
  onChange: (url: string) => void;
  kind: MediaKind;
  placeholder?: string;
}) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);

  const pick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_PHOTO_BYTES) {
        message.error("The photo is too big. The limit is 3 MB.");
        return;
      }
      setBusy(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        const res = await fetch("/api/v1/admin/media", { method: "POST", body: form, credentials: "include" });
        const body = await res.json().catch(() => ({}));
        const url = body?.url ?? body?.data?.url;
        if (!res.ok || !url) throw new Error(body?.error || "Upload failed.");
        onChange(url);
        message.success("Photo uploaded. Save to use it.");
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Space.Compact style={{ width: "100%" }}>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <Button icon={<UploadOutlined />} loading={busy} onClick={pick}>
          Upload
        </Button>
      </Space.Compact>
      {value ? (
        <Space align="start">
          <Image src={value} alt="Photo preview" width={120} height={72} style={{ objectFit: "cover", borderRadius: 8 }} />
          <Button size="small" type="text" danger onClick={() => onChange("")}>
            Remove
          </Button>
        </Space>
      ) : (
        <Text type="secondary" className="text-[11px]">
          JPG, PNG or WebP, up to 3 MB.
        </Text>
      )}
    </Space>
  );
}

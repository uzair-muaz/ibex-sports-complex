"use client";

import { Button, Card, Input, Space, Typography } from "antd";
import type { Faq } from "@/lib/app-settings";

const { Text } = Typography;

/**
 * Super admin: the support FAQs shown in the app and on the website.
 * `faqs === null` means the built-in ones (written from the current rules).
 * Saved with the page's Save button.
 */
export function FaqsCard({
  faqs,
  builtIn,
  onChange,
}: {
  faqs: Faq[] | null;
  builtIn: Faq[];
  onChange: (faqs: Faq[] | null) => void;
}) {
  const shown = faqs ?? builtIn;
  const set = (i: number, patch: Partial<Faq>) => onChange(shown.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <Card title="Support FAQs">
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Text type="secondary">
          {faqs === null
            ? "Using the built-in FAQs. They update by themselves when you change points, advance % or the cancellation notice. Edit one to write your own."
            : "Using your own FAQs. Numbers here don't update by themselves when the rules change."}
        </Text>
        {shown.map((f, i) => (
          <Space key={i} orientation="vertical" style={{ width: "100%" }}>
            <Input
              placeholder="Question"
              maxLength={200}
              value={f.question}
              onChange={(e) => set(i, { question: e.target.value })}
            />
            <Input.TextArea
              placeholder="Answer"
              maxLength={1500}
              autoSize={{ minRows: 2, maxRows: 6 }}
              value={f.answer}
              onChange={(e) => set(i, { answer: e.target.value })}
            />
            <Button danger size="small" onClick={() => onChange(shown.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </Space>
        ))}
        <Space wrap>
          {shown.length < 30 && (
            <Button onClick={() => onChange([...shown, { question: "", answer: "" }])}>Add question</Button>
          )}
          {faqs !== null && <Button onClick={() => onChange(null)}>Go back to built-in FAQs</Button>}
        </Space>
      </Space>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Typography } from "antd";

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

type AnalyticsRefreshCountdownProps = {
  /** ISO timestamp when the next hourly freshness rebuild is due. */
  nextRefreshAt?: string | null;
  lastRebuiltAt?: string | null;
};

export function AnalyticsRefreshCountdown({
  nextRefreshAt,
  lastRebuiltAt,
}: AnalyticsRefreshCountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const targetMs = nextRefreshAt
    ? new Date(nextRefreshAt).getTime()
    : lastRebuiltAt
      ? new Date(lastRebuiltAt).getTime() + 60 * 60 * 1000
      : null;

  if (!targetMs || Number.isNaN(targetMs)) {
    return (
      <Typography.Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
        <Typography.Text type="secondary">
          Rollups refresh at most hourly when you open this page.
        </Typography.Text>
      </Typography.Paragraph>
    );
  }

  const remainingMs = targetMs - now.getTime();
  const due = remainingMs <= 0;
  const remaining = formatRemaining(remainingMs);
  const lastLabel = lastRebuiltAt
    ? new Date(lastRebuiltAt).toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <Typography.Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
      {due ? (
        <>
          Next refresh{" "}
          <Typography.Text strong>due now</Typography.Text>
          {" — "}
          open/refresh this page to rebuild.
        </>
      ) : (
        <>
          Next refresh in{" "}
          <Typography.Text strong code>
            {remaining}
          </Typography.Text>
        </>
      )}
      {lastLabel ? (
        <Typography.Text type="secondary">
          {" "}
          (last rebuilt {lastLabel})
        </Typography.Text>
      ) : null}
    </Typography.Paragraph>
  );
}

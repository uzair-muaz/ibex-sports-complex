"use client";

import { Alert, Card, Form, Input, InputNumber, Switch, Typography } from "antd";
import type { AppFirstRules } from "@/lib/app-settings";

const { Text } = Typography;

/**
 * App Settings → "App first": extra benefits for booking in the app.
 * Everything is off until launch day, when both store apps are live.
 */
export function AppFirstCard({
  value,
  onChange,
}: {
  value: AppFirstRules;
  onChange: (patch: Partial<AppFirstRules>) => void;
}) {
  const anyOn = value.pointsAppOnly || value.websiteWindowOn;
  return (
    <Card title="App first (move customers to the app)">
      <Alert
        type={anyOn ? "warning" : "info"}
        showIcon
        style={{ marginBottom: 16 }}
        title={anyOn ? "Some app-only rules are ON for customers now." : "All app-only rules are off."}
        description={
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>Launch day: first make sure the app is live on BOTH the Play Store and the App Store.</li>
            <li>Paste both store links below. The website then shows &quot;Get the app&quot; banners.</li>
            <li>Turn on the rules below and save.</li>
            <li>Each week, check Reports → the &quot;From&quot; column (website or app).</li>
          </ol>
        }
      />
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Form.Item
          label="Reward points only in the app"
          extra={
            <Text type="secondary">
              On: only bookings made in the app earn points, and points can only be used in the app. Website and
              staff bookings earn nothing. Points customers already have are kept.
            </Text>
          }
        >
          <Switch checked={value.pointsAppOnly} onChange={(v) => onChange({ pointsAppOnly: v })} />
        </Form.Item>
        <Form.Item
          label="Limit how far ahead the website can book"
          extra={
            <Text type="secondary">
              On: the website can book only {value.websiteBookingWindowDays} day{value.websiteBookingWindowDays === 1 ? "" : "s"}{" "}
              ahead (today counts). The app keeps each sport&apos;s own limit. Staff are never limited.
            </Text>
          }
        >
          <div className="flex items-center gap-3">
            <Switch checked={value.websiteWindowOn} onChange={(v) => onChange({ websiteWindowOn: v })} />
            <InputNumber
              min={1}
              max={365}
              value={value.websiteBookingWindowDays}
              onChange={(v) => typeof v === "number" && onChange({ websiteBookingWindowDays: Math.round(v) })}
              suffix="days"
            />
          </div>
        </Form.Item>
        <Form.Item label="Play Store link" extra={<Text type="secondary">Starts with https://play.google.com/</Text>}>
          <Input
            value={value.playStoreUrl ?? ""}
            placeholder="https://play.google.com/store/apps/details?id=…"
            onChange={(e) => onChange({ playStoreUrl: e.target.value || null })}
          />
        </Form.Item>
        <Form.Item label="App Store link" extra={<Text type="secondary">Starts with https://apps.apple.com/</Text>}>
          <Input
            value={value.appStoreUrl ?? ""}
            placeholder="https://apps.apple.com/app/…"
            onChange={(e) => onChange({ appStoreUrl: e.target.value || null })}
          />
        </Form.Item>
      </div>
      <Text type="secondary">
        App-only promo codes: tick &quot;App only&quot; on a code in Admin → Promo codes. That works even while these
        switches are off.
      </Text>
    </Card>
  );
}

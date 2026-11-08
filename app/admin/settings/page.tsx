"use client";

import { PhotoUpload } from "@/components/admin/PhotoUpload";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
} from "antd";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { FaqsCard } from "@/components/admin/FaqsCard";
import {
  fetchAdminAppSettings,
  saveAdminAppSettings,
} from "@/lib/tanstack/requests/admin-settings.requests";
import type { BankAccount, Faq, ResolvedAppSettings, SportRules } from "@/lib/app-settings";

const { Text } = Typography;

/** Any length from 1 hour to 6 hours, in 30-minute steps. The super admin picks each sport's list. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function durationOptions(_sport: SportRules["sport"]) {
  const min = 60;
  const out: { value: number; label: string }[] = [];
  for (let m = min; m <= 360; m += 30) {
    const h = m / 60;
    out.push({ value: m, label: `${m} min (${h} h)` });
  }
  return out;
}

export default function AdminAppSettingsPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [draft, setDraft] = useState<ResolvedAppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [builtInFaqs, setBuiltInFaqs] = useState<Faq[]>([]);

  const query = useQuery({
    queryKey: ["admin", "app-settings"],
    queryFn: fetchAdminAppSettings,
    enabled: !!session && isSuperAdmin,
  });

  useEffect(() => {
    if (!session || isSuperAdmin) return;
    router.push("/admin/bookings");
  }, [session, isSuperAdmin, router]);

  useEffect(() => {
    if (query.data?.settings) setDraft(query.data.settings);
    if (query.data?.builtInFaqs) setBuiltInFaqs(query.data.builtInFaqs);
  }, [query.data]);

  if (!isSuperAdmin) return null;

  const setVenue = (key: keyof ResolvedAppSettings["venue"], value: unknown) =>
    setDraft((d) => (d ? { ...d, venue: { ...d.venue, [key]: value } } : d));

  const setPayments = (patch: Partial<ResolvedAppSettings["payments"]>) =>
    setDraft((d) => (d ? { ...d, payments: { ...d.payments, ...patch } } : d));
  const setBankAccount = (i: number, patch: Partial<BankAccount>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            payments: {
              ...d.payments,
              bankAccounts: d.payments.bankAccounts.map((a, j) => (j === i ? { ...a, ...patch } : a)),
            },
          }
        : d,
    );
  const addBankAccount = () =>
    setPayments({
      bankAccounts: [
        ...(draft?.payments.bankAccounts ?? []),
        { bankName: "", accountTitle: "", accountNumber: "", iban: null },
      ],
    });
  const removeBankAccount = (i: number) =>
    setPayments({ bankAccounts: (draft?.payments.bankAccounts ?? []).filter((_, j) => j !== i) });

  const setLoyalty = (patch: Partial<ResolvedAppSettings["loyalty"]>) =>
    setDraft((d) => (d ? { ...d, loyalty: { ...d.loyalty, ...patch } } : d));

  const setSport = (sport: SportRules["sport"], patch: Partial<SportRules>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            sports: d.sports.map((s) => {
              if (s.sport !== sport) return s;
              const next = { ...s, ...patch };
              if (!next.durationsMinutes.includes(next.defaultDurationMinutes)) {
                next.defaultDurationMinutes = next.durationsMinutes[0] ?? next.defaultDurationMinutes;
              }
              return next;
            }),
          }
        : d,
    );

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { settings, builtInFaqs: builtIn } = await saveAdminAppSettings({
        faqs: draft.faqs,
        venue: draft.venue,
        cancellationNoticeMinutes: draft.cancellationNoticeMinutes,
        loyalty: draft.loyalty,
        payments: draft.payments,
        membership: draft.membership,
        sports: draft.sports.map((s) => ({
          sport: s.sport,
          label: s.label,
          showInApp: s.showInApp,
          imageUrl: s.imageUrl,
          badge: s.badge,
          durationsMinutes: s.durationsMinutes,
          defaultDurationMinutes: s.defaultDurationMinutes,
          bookingWindowDays: s.bookingWindowDays,
          sortOrder: s.sortOrder,
        })),
      });
      setDraft(settings);
      setBuiltInFaqs(builtIn);
      message.success("Settings saved");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="App Settings"
      description="Venue details and booking rules for the mobile app"
      onRefresh={() => query.refetch()}
      isLoading={query.isFetching}
      actionButton={
        <Button type="primary" onClick={save} loading={saving} disabled={!draft}>
          Save changes
        </Button>
      }
    >
      {!draft ? (
        <AdminTableSkeleton />
      ) : (
        <Form layout="vertical" className="flex flex-col gap-4">
          <Card title="Venue and contacts">
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Form.Item label="Venue name">
                <Input value={draft.venue.name} onChange={(e) => setVenue("name", e.target.value)} />
              </Form.Item>
              <Form.Item label="Branch name">
                <Input
                  value={draft.venue.branchName}
                  onChange={(e) => setVenue("branchName", e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Opening hours text">
                <Input
                  value={draft.venue.hoursLabel}
                  onChange={(e) => setVenue("hoursLabel", e.target.value)}
                  placeholder="Open 24 hours"
                />
              </Form.Item>
              <Form.Item label="Email">
                <Input value={draft.venue.email} onChange={(e) => setVenue("email", e.target.value)} />
              </Form.Item>
              <Form.Item label="Phone">
                <Input value={draft.venue.phone} onChange={(e) => setVenue("phone", e.target.value)} />
              </Form.Item>
              <Form.Item label="WhatsApp">
                <Input
                  value={draft.venue.whatsApp}
                  onChange={(e) => setVenue("whatsApp", e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Latitude">
                <InputNumber
                  className="w-full"
                  value={draft.venue.latitude}
                  step={0.0001}
                  onChange={(v) => typeof v === "number" && setVenue("latitude", v)}
                />
              </Form.Item>
              <Form.Item label="Longitude">
                <InputNumber
                  className="w-full"
                  value={draft.venue.longitude}
                  step={0.0001}
                  onChange={(v) => typeof v === "number" && setVenue("longitude", v)}
                />
              </Form.Item>
              <Form.Item label="Google Maps link" extra={<Text type="secondary">Leave empty to use the pin above.</Text>}>
                <Input
                  placeholder="https://maps.app.goo.gl/…"
                  value={draft.venue.mapUrl ?? ""}
                  onChange={(e) => setVenue("mapUrl", e.target.value || null)}
                />
              </Form.Item>
              <Form.Item label="Instagram link" extra={<Text type="secondary">Leave empty to hide the icon.</Text>}>
                <Input
                  value={draft.venue.instagramUrl ?? ""}
                  onChange={(e) => setVenue("instagramUrl", e.target.value || null)}
                />
              </Form.Item>
              <Form.Item label="Facebook link" extra={<Text type="secondary">Leave empty to hide the icon.</Text>}>
                <Input
                  value={draft.venue.facebookUrl ?? ""}
                  onChange={(e) => setVenue("facebookUrl", e.target.value || null)}
                />
              </Form.Item>
            </div>
            <Form.Item label="Address">
              <Input.TextArea
                rows={2}
                value={draft.venue.address}
                onChange={(e) => setVenue("address", e.target.value)}
              />
            </Form.Item>
            <Form.Item
              label="Home screen note (optional)"
              extra={<Text type="secondary">A short line on the app&apos;s Home, e.g. “Night slots now open”.</Text>}
            >
              <Input
                maxLength={120}
                value={draft.venue.facilityNote ?? ""}
                onChange={(e) => setVenue("facilityNote", e.target.value || null)}
              />
            </Form.Item>
          </Card>

          <Card title="Booking rules">
            <Form.Item
              label="Customers can cancel until (minutes before start)"
              extra={<Text type="secondary">240 minutes = 4 hours.</Text>}
            >
              <InputNumber
                min={0}
                max={10080}
                step={30}
                value={draft.cancellationNoticeMinutes}
                onChange={(v) =>
                  typeof v === "number" &&
                  setDraft({ ...draft, cancellationNoticeMinutes: v })
                }
              />
            </Form.Item>
          </Card>

          <Card title="Payments">
            <Form.Item
              label="Advance to pay before the booking is confirmed (%)"
              extra={
                <Text type="secondary">
                  Worked out on the total after points, rounded up to a whole rupee.
                </Text>
              }
            >
              <InputNumber
                min={0}
                max={100}
                value={draft.payments.minAdvancePercent}
                onChange={(v) =>
                  typeof v === "number" &&
                  setDraft({ ...draft, payments: { ...draft.payments, minAdvancePercent: Math.round(v) } })
                }
              />
            </Form.Item>

            <Text strong>Bank accounts shown in the app</Text>
            {draft.payments.bankAccounts.map((acc, i) => (
              <div key={i} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
                {(["bankName", "accountTitle", "accountNumber", "iban"] as const).map((field) => (
                  <Input
                    key={field}
                    placeholder={
                      { bankName: "Bank name", accountTitle: "Account title", accountNumber: "Account number", iban: "IBAN (optional)" }[field]
                    }
                    value={acc[field] ?? ""}
                    onChange={(e) => setBankAccount(i, { [field]: e.target.value })}
                  />
                ))}
                <Button danger onClick={() => removeBankAccount(i)}>
                  Remove
                </Button>
              </div>
            ))}
            {draft.payments.bankAccounts.length < 5 && (
              <Button className="mt-2" onClick={addBankAccount}>
                Add bank account
              </Button>
            )}
            <Form.Item className="mt-4" label="Note under the bank details">
              <Input
                maxLength={300}
                value={draft.payments.transferNote}
                onChange={(e) => setPayments({ transferNote: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Note after the customer sends a screenshot">
              <Input
                maxLength={300}
                value={draft.payments.verificationNote}
                onChange={(e) => setPayments({ verificationNote: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="How the rest of the price is paid">
              <Input
                maxLength={300}
                value={draft.payments.balanceNote}
                onChange={(e) => setPayments({ balanceNote: e.target.value })}
              />
            </Form.Item>
          </Card>

          <Card title="Membership rules">
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
              {(
                [
                  ["weekdayAdvanceHours", "Notice to book with hours, Mon–Fri (hours)", 168],
                  ["weekendAdvanceHours", "Notice to book with hours, Sat–Sun (hours)", 168],
                  ["carryOverGraceDays", "Days after a plan ends that unused hours carry over", 90],
                ] as const
              ).map(([key, label, max]) => (
                <Form.Item key={key} label={label}>
                  <InputNumber
                    min={0}
                    max={max}
                    value={draft.membership[key]}
                    onChange={(v) =>
                      typeof v === "number" &&
                      setDraft({ ...draft, membership: { ...draft.membership, [key]: Math.round(v) } })
                    }
                  />
                </Form.Item>
              ))}
            </div>
          </Card>

          <Card title="Reward points">
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Form.Item label="Customers earn points">
                <Select
                  value={draft.loyalty.earnBasis}
                  onChange={(v: "per_pkr" | "per_hour") => setLoyalty({ earnBasis: v })}
                  options={[
                    { value: "per_pkr", label: "For the amount they spend" },
                    { value: "per_hour", label: "For the hours they play" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label={
                  draft.loyalty.earnBasis === "per_pkr"
                    ? "Points earned for every block spent"
                    : "Points earned per hour played"
                }
              >
                <InputNumber
                  min={0}
                  value={draft.loyalty.earnPoints}
                  onChange={(v) => typeof v === "number" && setLoyalty({ earnPoints: Math.round(v) })}
                />
              </Form.Item>
              {draft.loyalty.earnBasis === "per_pkr" && (
                <Form.Item label="Block size (PKR)" extra={<Text type="secondary">e.g. 10 points for every PKR 100</Text>}>
                  <InputNumber
                    min={1}
                    value={draft.loyalty.earnPerPkr}
                    onChange={(v) => typeof v === "number" && setLoyalty({ earnPerPkr: Math.round(v) })}
                  />
                </Form.Item>
              )}
              <Form.Item label="PKR value of 1 point">
                <InputNumber
                  min={0.01}
                  step={0.5}
                  value={draft.loyalty.pkrPerPoint}
                  onChange={(v) => typeof v === "number" && setLoyalty({ pkrPerPoint: v })}
                />
              </Form.Item>
              <Form.Item label="Minimum points before they can be used">
                <InputNumber
                  min={0}
                  value={draft.loyalty.minRedeemPoints}
                  onChange={(v) => typeof v === "number" && setLoyalty({ minRedeemPoints: Math.round(v) })}
                />
              </Form.Item>
              <Form.Item label="Most of the court fee points can pay (%)">
                <InputNumber
                  min={0}
                  max={100}
                  value={draft.loyalty.maxRedeemPercent}
                  onChange={(v) => typeof v === "number" && setLoyalty({ maxRedeemPercent: Math.round(v) })}
                />
              </Form.Item>
              <Form.Item label="Sign-up bonus points">
                <InputNumber
                  min={0}
                  value={draft.loyalty.signUpBonusPoints}
                  onChange={(v) => typeof v === "number" && setLoyalty({ signUpBonusPoints: Math.round(v) })}
                />
              </Form.Item>
              <Form.Item label="Earn points on hours paid with membership">
                <Switch
                  checked={draft.loyalty.earnOnMembershipHours}
                  onChange={(v) => setLoyalty({ earnOnMembershipHours: v })}
                />
              </Form.Item>
            </div>
            <Text type="secondary">
              The app uses these rules now. The website will switch to them when the points work
              (Phase 10) is done.
            </Text>
          </Card>

          {draft.sports.map((s) => (
            <Card
              key={s.sport}
              title={s.label}
              extra={
                <span className="flex items-center gap-2">
                  <Text type="secondary">Show in app</Text>
                  <Switch
                    checked={s.showInApp}
                    onChange={(v) => setSport(s.sport, { showInApp: v })}
                  />
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <Form.Item label="Name in the app">
                  <Input
                    value={s.label}
                    maxLength={40}
                    onChange={(e) => setSport(s.sport, { label: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Badge (optional)">
                  <Input
                    value={s.badge ?? ""}
                    maxLength={30}
                    placeholder="Most Popular"
                    onChange={(e) => setSport(s.sport, { badge: e.target.value || null })}
                  />
                </Form.Item>
                <Form.Item label="Durations customers can pick">
                  <Select
                    mode="multiple"
                    value={s.durationsMinutes}
                    options={durationOptions(s.sport)}
                    onChange={(v: number[]) =>
                      v.length > 0 &&
                      setSport(s.sport, { durationsMinutes: [...v].sort((a, b) => a - b) })
                    }
                  />
                </Form.Item>
                <Form.Item label="Selected by default">
                  <Select
                    value={s.defaultDurationMinutes}
                    options={s.durationsMinutes.map((m) => ({ value: m, label: `${m} min` }))}
                    onChange={(v: number) => setSport(s.sport, { defaultDurationMinutes: v })}
                  />
                </Form.Item>
                <Form.Item label="How many days ahead customers can book">
                  <InputNumber
                    min={1}
                    max={365}
                    value={s.bookingWindowDays}
                    onChange={(v) =>
                      typeof v === "number" && setSport(s.sport, { bookingWindowDays: v })
                    }
                  />
                </Form.Item>
                <Form.Item label="Order on Home">
                  <InputNumber
                    value={s.sortOrder}
                    onChange={(v) => typeof v === "number" && setSport(s.sport, { sortOrder: v })}
                  />
                </Form.Item>
              </div>
              <Form.Item label="Photo" extra={<Text type="secondary">Upload a photo, or paste https://… or /images/…</Text>}>
                <PhotoUpload
                  kind="sport_photo"
                  value={s.imageUrl}
                  onChange={(imageUrl) => setSport(s.sport, { imageUrl })}
                />
              </Form.Item>
            </Card>
          ))}

          <FaqsCard
            faqs={draft.faqs}
            builtIn={builtInFaqs}
            onChange={(faqs) => setDraft({ ...draft, faqs })}
          />
        </Form>
      )}
    </AdminLayout>
  );
}

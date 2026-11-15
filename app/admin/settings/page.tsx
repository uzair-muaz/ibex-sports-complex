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
  Space,
  Switch,
  Typography,
} from "antd";
import { BUILT_IN_SPORTS, sportCodeFromName } from "@/lib/sport-rules";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { FaqsCard } from "@/components/admin/FaqsCard";
import { AppFirstCard } from "@/components/admin/AppFirstCard";
import {
  fetchAdminAppSettings,
  saveAdminAppSettings,
} from "@/lib/tanstack/requests/admin-settings.requests";
import type { BankAccount, Faq, ResolvedAppSettings, SportRules } from "@/lib/app-settings";
import { exampleCancelDeadline, minutesInWords } from "@/lib/notice-time-text";

const { Text } = Typography;

/** Plain-words help under the carry-over rule, worked out from the number typed. */
function membershipRuleHint(value: number) {
  return (
    <Text type="secondary">
      {value === 0
        ? "Unused hours move to the new plan only if the member renews before their plan ends. Once it ends, they're lost."
        : `If a member renews within ${value} day${value === 1 ? "" : "s"} after their plan ends, their unused hours move to the new plan. After that, unused hours are lost.`}
    </Text>
  );
}

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
  const [newSportName, setNewSportName] = useState("");
  const [removedSports, setRemovedSports] = useState<string[]>([]);
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

  // Take out an added sport (saved on "Save changes"; refused while a court uses it).
  const removeSport = (code: string) => {
    if (!draft) return;
    setDraft({ ...draft, sports: draft.sports.filter((s) => s.sport !== code) });
    setRemovedSports((prev) => [...new Set([...prev, code])]);
  };

  // A new sport: a code made from its name (e.g. TABLE_TENNIS), hidden until turned on.
  const addSport = () => {
    if (!draft) return;
    const label = newSportName.trim();
    const code = sportCodeFromName(label);
    if (!label || !code) return void message.error("Type a sport name using letters.");
    if (draft.sports.some((s) => s.sport === code)) return void message.error(`${label} is already in the list.`);
    setDraft({
      ...draft,
      sports: [
        ...draft.sports,
        {
          sport: code,
          label,
          showInApp: false,
          imageUrl: "",
          badge: null,
          durationsMinutes: [60, 90, 120],
          defaultDurationMinutes: 60,
          bookingWindowDays: 14,
          sortOrder: Math.max(0, ...draft.sports.map((s) => s.sortOrder)) + 1,
        },
      ],
    });
    setNewSportName("");
    setRemovedSports((prev) => prev.filter((c) => c !== code));
    message.success(`${label} added. Press Save changes to keep it.`);
  };

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
        appFirst: draft.appFirst,
        removeSports: removedSports.length ? removedSports : undefined,
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
      setRemovedSports([]);
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
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              Customers see these details in the app, on the website and in emails.
            </Text>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Form.Item label="Venue name" extra={<Text type="secondary">For example: IBEX Sports Complex.</Text>}>
                <Input value={draft.venue.name} onChange={(e) => setVenue("name", e.target.value)} />
              </Form.Item>
              <Form.Item label="Branch name" extra={<Text type="secondary">Which branch this is, for example: IBEX Islamabad.</Text>}>
                <Input
                  value={draft.venue.branchName}
                  onChange={(e) => setVenue("branchName", e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Opening hours (shown to customers)" extra={<Text type="secondary">Only the words customers read, for example: Open 24 hours. It doesn&apos;t change which times can be booked.</Text>}>
                <Input
                  value={draft.venue.hoursLabel}
                  onChange={(e) => setVenue("hoursLabel", e.target.value)}
                  placeholder="Open 24 hours"
                />
              </Form.Item>
              <Form.Item label="Contact email" extra={<Text type="secondary">Customers use this email to contact you.</Text>}>
                <Input value={draft.venue.email} onChange={(e) => setVenue("email", e.target.value)} />
              </Form.Item>
              <Form.Item label="Contact phone number" extra={<Text type="secondary">With the country code, for example: +92 325 5429429.</Text>}>
                <Input value={draft.venue.phone} onChange={(e) => setVenue("phone", e.target.value)} />
              </Form.Item>
              <Form.Item label="WhatsApp number" extra={<Text type="secondary">Customers tap this to message you on WhatsApp. Use the country code, for example: +92 325 5429429.</Text>}>
                <Input
                  value={draft.venue.whatsApp}
                  onChange={(e) => setVenue("whatsApp", e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Map pin: latitude" extra={<Text type="secondary">The first number of the venue&apos;s location on Google Maps (for example 33.6844). In Google Maps, right-click the venue and click the numbers to copy them.</Text>}>
                <InputNumber
                  className="w-full"
                  value={draft.venue.latitude}
                  step={0.0001}
                  onChange={(v) => typeof v === "number" && setVenue("latitude", v)}
                />
              </Form.Item>
              <Form.Item label="Map pin: longitude" extra={<Text type="secondary">The second number of the same location (for example 73.0479).</Text>}>
                <InputNumber
                  className="w-full"
                  value={draft.venue.longitude}
                  step={0.0001}
                  onChange={(v) => typeof v === "number" && setVenue("longitude", v)}
                />
              </Form.Item>
              <Form.Item label="Google Maps link (optional)" extra={<Text type="secondary">The link that opens when customers tap &quot;Directions&quot;. In Google Maps, open the venue, press Share and copy the link. Leave it empty to use the map pin above.</Text>}>
                <Input
                  placeholder="https://maps.app.goo.gl/…"
                  value={draft.venue.mapUrl ?? ""}
                  onChange={(e) => setVenue("mapUrl", e.target.value || null)}
                />
              </Form.Item>
              <Form.Item label="Instagram page link (optional)" extra={<Text type="secondary">Leave it empty to hide the Instagram icon.</Text>}>
                <Input
                  value={draft.venue.instagramUrl ?? ""}
                  onChange={(e) => setVenue("instagramUrl", e.target.value || null)}
                />
              </Form.Item>
              <Form.Item label="Facebook page link (optional)" extra={<Text type="secondary">Leave it empty to hide the Facebook icon.</Text>}>
                <Input
                  value={draft.venue.facebookUrl ?? ""}
                  onChange={(e) => setVenue("facebookUrl", e.target.value || null)}
                />
              </Form.Item>
            </div>
            <Form.Item label="Full address" extra={<Text type="secondary">The address customers see and use to find you.</Text>}>
              <Input.TextArea
                rows={2}
                value={draft.venue.address}
                onChange={(e) => setVenue("address", e.target.value)}
              />
            </Form.Item>
            <Form.Item
              label="Short message on the app&apos;s home screen (optional)"
              extra={<Text type="secondary">One short line every customer sees when they open the app, for example: &quot;Night slots now open&quot;. Leave it empty to show nothing.</Text>}
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
              label="How late can customers cancel? (minutes before the booking starts)"
              extra={
                <Space orientation="vertical" size={2} style={{ marginTop: 4 }}>
                  <Text strong>
                    {draft.cancellationNoticeMinutes} minutes = {minutesInWords(draft.cancellationNoticeMinutes)}
                  </Text>
                  <Text type="secondary">
                    {draft.cancellationNoticeMinutes === 0
                      ? "Customers can cancel on the website or app right up to the start time."
                      : `Customers can cancel on the website or app until ${minutesInWords(draft.cancellationNoticeMinutes)} before their booking starts. For example, a booking at 8:00 PM can be cancelled until ${exampleCancelDeadline(draft.cancellationNoticeMinutes)}.`}
                  </Text>
                  <Text type="secondary">
                    After that, they can&apos;t cancel themselves and need to contact you. Staff can still cancel any booking from the admin. Tip: 60 = 1 hour, 1440 = 1 day.
                  </Text>
                </Space>
              }
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
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              Customers pay an advance by bank transfer and upload a screenshot. Staff check it in Payments,
              and the customer pays the rest at the venue.
            </Text>
            <Form.Item
              label="Advance payment needed to confirm a booking (%)"
              extra={
                <Text type="secondary">
                  {draft.payments.minAdvancePercent === 0
                    ? "0 = no advance needed."
                    : `Example: for a PKR 4,000 booking, the customer must pay at least PKR ${Math.ceil((4000 * draft.payments.minAdvancePercent) / 100).toLocaleString()} first. Until staff check that payment, the booking shows as reserved. 100 = full payment in advance.`}
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

            <Text strong>Bank accounts customers send the advance to</Text>
            <Text type="secondary" style={{ display: "block" }}>
              Customers see these on the payment screen in the app. Double-check the account number. Up to 5 accounts.
            </Text>
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
            <Form.Item className="mt-4" label="Message under the bank details" extra={<Text type="secondary">Shown on the payment screen, for example: Please write your booking number in the transfer reference.</Text>}>
              <Input
                maxLength={300}
                value={draft.payments.transferNote}
                onChange={(e) => setPayments({ transferNote: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Message after the customer uploads a payment screenshot" extra={<Text type="secondary">For example: Thanks! Our team will check your payment and confirm your booking shortly.</Text>}>
              <Input
                maxLength={300}
                value={draft.payments.verificationNote}
                onChange={(e) => setPayments({ verificationNote: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="Message about paying the rest" extra={<Text type="secondary">Tells customers how to pay what is left after the advance, for example: Pay the remaining balance at the venue.</Text>}>
              <Input
                maxLength={300}
                value={draft.payments.balanceNote}
                onChange={(e) => setPayments({ balanceNote: e.target.value })}
              />
            </Form.Item>
          </Card>

          <Card title="Membership rules">
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              Members can pay for any free slot with their hours, at any time, right up to the start.
            </Text>
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {(
                [
                  ["carryOverGraceDays", "Days to renew and keep unused hours", 90],
                ] as const
              ).map(([key, label, max]) => (
                <Form.Item key={key} label={label} extra={membershipRuleHint(draft.membership[key])}>
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
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              Customers with an account collect points after they play, and can use them later as a discount on the
              court fee.
            </Text>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Form.Item label="How do customers earn points?" extra={<Text type="secondary">By the money they pay, or by how long they play.</Text>}>
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
                    ? "Points given for each amount spent"
                    : "Points given for each hour played"
                }
                extra={
                  <Text type="secondary">
                    {draft.loyalty.earnBasis === "per_pkr"
                      ? `Example: with these settings, a customer who pays PKR 4,000 gets ${(Math.floor(4000 / Math.max(1, draft.loyalty.earnPerPkr)) * draft.loyalty.earnPoints).toLocaleString()} points.`
                      : `Example: a customer who plays 1 hour gets ${draft.loyalty.earnPoints} points; 1 hour 30 minutes gets ${Math.round(draft.loyalty.earnPoints * 1.5)}.`}
                  </Text>
                }
              >
                <InputNumber
                  min={0}
                  value={draft.loyalty.earnPoints}
                  onChange={(v) => typeof v === "number" && setLoyalty({ earnPoints: Math.round(v) })}
                />
              </Form.Item>
              {draft.loyalty.earnBasis === "per_pkr" && (
                <Form.Item label="…for every (PKR)" extra={<Text type="secondary">Together with the number above. For example: 10 points for every PKR 100 paid.</Text>}>
                  <InputNumber
                    min={1}
                    value={draft.loyalty.earnPerPkr}
                    onChange={(v) => typeof v === "number" && setLoyalty({ earnPerPkr: Math.round(v) })}
                  />
                </Form.Item>
              )}
              <Form.Item
                label="How much is 1 point worth? (PKR)"
                extra={
                  <Text type="secondary">
                    {`The discount a customer gets for each point they use. Example: 100 points = PKR ${Math.floor(100 * draft.loyalty.pkrPerPoint).toLocaleString()} off.`}
                  </Text>
                }
              >
                <InputNumber
                  min={0.01}
                  step={0.5}
                  value={draft.loyalty.pkrPerPoint}
                  onChange={(v) => typeof v === "number" && setLoyalty({ pkrPerPoint: v })}
                />
              </Form.Item>
              <Form.Item
                label="Fewest points a customer can use at once"
                extra={
                  <Text type="secondary">
                    {draft.loyalty.minRedeemPoints === 0
                      ? "0 = customers can use any number of points."
                      : `A customer needs at least ${draft.loyalty.minRedeemPoints} points before they can use them on a booking.`}
                  </Text>
                }
              >
                <InputNumber
                  min={0}
                  value={draft.loyalty.minRedeemPoints}
                  onChange={(v) => typeof v === "number" && setLoyalty({ minRedeemPoints: Math.round(v) })}
                />
              </Form.Item>
              <Form.Item
                label="Points can pay up to (% of the court fee)"
                extra={
                  <Text type="secondary">
                    {`Example: for a PKR 4,000 court fee, points can take off at most PKR ${Math.floor((4000 * draft.loyalty.maxRedeemPercent) / 100).toLocaleString()}; the customer pays the rest. 100 = points can pay the whole fee. 0 = points can't be used.`}
                  </Text>
                }
              >
                <InputNumber
                  min={0}
                  max={100}
                  value={draft.loyalty.maxRedeemPercent}
                  onChange={(v) => typeof v === "number" && setLoyalty({ maxRedeemPercent: Math.round(v) })}
                />
              </Form.Item>
              <Form.Item label="Welcome points for new accounts" extra={<Text type="secondary">Given once when a customer creates an account. 0 = no welcome points.</Text>}>
                <InputNumber
                  min={0}
                  value={draft.loyalty.signUpBonusPoints}
                  onChange={(v) => typeof v === "number" && setLoyalty({ signUpBonusPoints: Math.round(v) })}
                />
              </Form.Item>
              <Form.Item label="Give points when members pay with their membership hours" extra={<Text type="secondary">Off: members only get points for what they pay in money. On: they also get points for the time paid with hours.</Text>}>
                <Switch
                  checked={draft.loyalty.earnOnMembershipHours}
                  onChange={(v) => setLoyalty({ earnOnMembershipHours: v })}
                />
              </Form.Item>
            </div>
            <Text type="secondary">
              The website and the app both use these rules.
            </Text>
          </Card>

          <AppFirstCard
            value={draft.appFirst}
            onChange={(patch) => setDraft({ ...draft, appFirst: { ...draft.appFirst, ...patch } })}
          />

          {draft.sports.map((s) => (
            <Card
              key={s.sport}
              title={s.label}
              extra={
                <span className="flex items-center gap-2">
                  {!(BUILT_IN_SPORTS as readonly string[]).includes(s.sport) && (
                    <Button size="small" type="text" danger onClick={() => removeSport(s.sport)}>
                      Remove
                    </Button>
                  )}
                  <Text type="secondary">Show in the app</Text>
                  <Switch
                    checked={s.showInApp}
                    onChange={(v) => setSport(s.sport, { showInApp: v })}
                  />
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <Form.Item label="Sport name customers see" extra={<Text type="secondary">Shown on the website and in the app.</Text>}>
                  <Input
                    value={s.label}
                    maxLength={40}
                    onChange={(e) => setSport(s.sport, { label: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Small label on the sport card (optional)" extra={<Text type="secondary">A short tag on the sport in the app, for example: Most Popular. Leave it empty for none.</Text>}>
                  <Input
                    value={s.badge ?? ""}
                    maxLength={30}
                    placeholder="Most Popular"
                    onChange={(e) => setSport(s.sport, { badge: e.target.value || null })}
                  />
                </Form.Item>
                <Form.Item label="Booking lengths customers can choose" extra={<Text type="secondary">The lengths shown on the website and in the app. Pick one or more.</Text>}>
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
                <Form.Item label="Length chosen at the start" extra={<Text type="secondary">Already selected when a customer starts booking. They can change it.</Text>}>
                  <Select
                    value={s.defaultDurationMinutes}
                    options={s.durationsMinutes.map((m) => ({ value: m, label: `${m} min` }))}
                    onChange={(v: number) => setSport(s.sport, { defaultDurationMinutes: v })}
                  />
                </Form.Item>
                <Form.Item
                  label="How many days ahead customers can book"
                  extra={<Text type="secondary">{`Example: ${s.bookingWindowDays} = customers can book from today up to ${s.bookingWindowDays} days from now.`}</Text>}
                >
                  <InputNumber
                    min={1}
                    max={365}
                    value={s.bookingWindowDays}
                    onChange={(v) =>
                      typeof v === "number" && setSport(s.sport, { bookingWindowDays: v })
                    }
                  />
                </Form.Item>
                <Form.Item label="Position in the app&apos;s sports list" extra={<Text type="secondary">Smaller numbers come first: 1 shows first, then 2, and so on.</Text>}>
                  <InputNumber
                    value={s.sortOrder}
                    onChange={(v) => typeof v === "number" && setSport(s.sport, { sortOrder: v })}
                  />
                </Form.Item>
              </div>
              <Form.Item label="Photo" extra={<Text type="secondary">Shown on the sport card in the app. Press Upload to choose a photo.</Text>}>
                <PhotoUpload
                  kind="sport_photo"
                  value={s.imageUrl}
                  onChange={(imageUrl) => setSport(s.sport, { imageUrl })}
                />
              </Form.Item>
            </Card>
          ))}

          <Card title="Add a sport">
            <Text type="secondary">
              Type the sport&apos;s name and press Add. It starts hidden from the app: set its photo,
              lengths and &quot;Show in app&quot;, press Save changes, then add its courts in Admin → Courts.
            </Text>
            <Space.Compact className="mt-3" style={{ width: "100%", maxWidth: 420 }}>
              <Input
                placeholder="e.g. Table Tennis"
                maxLength={40}
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                onPressEnter={addSport}
              />
              <Button onClick={addSport}>Add</Button>
            </Space.Compact>
          </Card>

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

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Input, Segmented, Select, Table, Tag, Typography } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { bffFetch } from "@/lib/bff/client";
import {
  AUDIENCE_LABELS,
  BROADCAST_AUDIENCES,
  BROADCAST_KINDS,
  KIND_LABELS,
  type BroadcastAudience,
  type BroadcastKind,
} from "@/lib/broadcast-rules";
import type { AdminBroadcast } from "@/lib/broadcast";
import type { AdminClosure } from "@/lib/closure-admin";

const { Text } = Typography;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "—";

export default function MessagesPage() {
  return (
    <Suspense>
      <Messages />
    </Suspense>
  );
}

/** Admin → Messages: tell customers something in the app (bell + phone push). */
function Messages() {
  const params = useSearchParams();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const fromClosure = params.get("closure");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<BroadcastKind>("venue_news");
  const [audience, setAudience] = useState<BroadcastAudience>(fromClosure ? "closure" : "one");
  const [closureId, setClosureId] = useState<string | undefined>(fromClosure ?? undefined);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const key = ["admin", "broadcasts"];
  const history = useQuery({ queryKey: key, queryFn: () => bffFetch<{ items: AdminBroadcast[] }>("/api/v1/admin/broadcasts") });
  const closures = useQuery({
    queryKey: ["admin", "closures", false],
    enabled: audience === "closure",
    queryFn: () => bffFetch<{ items: AdminClosure[] }>("/api/v1/admin/closures"),
  });

  const payload = { title, body, kind, audience, closureId, email };
  const ready =
    title.trim().length >= 3 &&
    body.trim().length >= 3 &&
    (audience !== "closure" || !!closureId) &&
    (audience !== "one" || email.includes("@"));

  const send = async () => {
    setBusy(true);
    try {
      const count = await bffFetch<{ customers: number; withApp: number; guestBookings: number }>("/api/v1/admin/broadcasts", {
        method: "POST",
        body: JSON.stringify({ ...payload, dryRun: true }),
      });
      if (count.customers === 0) {
        message.info(count.guestBookings ? `Nobody with an account. ${count.guestBookings} guest booking(s): please call them.` : "Nobody to send to.");
        return;
      }
      modal.confirm({
        title: `Send to ${count.customers} customer${count.customers === 1 ? "" : "s"}?`,
        content: (
          <div className="text-sm">
            <p>It shows in the app&apos;s bell for all of them. {count.withApp} of them have the app on a phone and can get a push.</p>
            {kind === "offer" && <p>Offers are only pushed to customers who switched on offers in their settings.</p>}
            {count.guestBookings > 0 && <p>{count.guestBookings} guest booking(s) have no account: please call them.</p>}
            <p>This can&apos;t be undone.</p>
          </div>
        ),
        okText: "Send",
        onOk: async () => {
          try {
            const r = await bffFetch<{ broadcast: { inAppCount: number; pushSent: number; pushLogged: number } }>("/api/v1/admin/broadcasts", {
              method: "POST",
              body: JSON.stringify({ ...payload, confirm: true }),
            });
            message.success(`Sent to ${r.broadcast.inAppCount} customer${r.broadcast.inAppCount === 1 ? "" : "s"}.`);
            setTitle("");
            setBody("");
            void queryClient.invalidateQueries({ queryKey: key });
          } catch (e) {
            message.error((e as Error).message);
          }
        },
      });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Messages"
      description="Send a message to customers. It shows in the app's bell and as a phone push."
      onRefresh={() => void queryClient.invalidateQueries({ queryKey: key })}
      isLoading={history.isFetching}
    >
      <div className="flex flex-col gap-4">
        {isSuperAdmin ? (
          <Card title="New message">
            <div className="flex max-w-2xl flex-col gap-4">
              <div>
                <Text strong>Who gets it</Text>
                <div className="mt-1">
                  <Segmented
                    value={audience}
                    onChange={(v) => setAudience(v as BroadcastAudience)}
                    options={BROADCAST_AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABELS[a] }))}
                  />
                </div>
                {audience === "closure" && (
                  <Select
                    className="mt-2"
                    style={{ width: "100%" }}
                    placeholder="Pick the closure"
                    loading={closures.isPending}
                    value={closureId}
                    onChange={setClosureId}
                    options={(closures.data?.items ?? []).map((c) => ({
                      value: c.id,
                      label: `${when(c.startsAt)} – ${when(c.endsAt)} · ${c.courts.join(", ")} · ${c.affectedBookings ?? 0} booking(s)`,
                    }))}
                  />
                )}
                {audience === "one" && (
                  <Input className="mt-2" placeholder="Customer email" value={email} onChange={(e) => setEmail(e.target.value)} />
                )}
              </div>
              <div>
                <Text strong>Kind</Text>
                <div className="mt-1">
                  <Segmented
                    value={kind}
                    onChange={(v) => setKind(v as BroadcastKind)}
                    options={BROADCAST_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
                  />
                </div>
              </div>
              <Input maxLength={80} showCount placeholder="Title, e.g. Padel courts closed on Friday" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input.TextArea
                rows={4}
                maxLength={500}
                showCount
                placeholder="Message, e.g. Padel courts are closed on Friday 9 AM–2 PM for glass repair. Sorry for the trouble!"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div>
                <Button type="primary" icon={<SendOutlined />} disabled={!ready} loading={busy} onClick={send}>
                  Check and send
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Alert type="info" showIcon title="Only the super admin can send messages." />
        )}

        <Card title="Sent messages" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            loading={history.isPending}
            dataSource={history.data?.items ?? []}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            scroll={{ x: 820 }}
            locale={{ emptyText: "No messages sent yet." }}
            columns={[
              { title: "Sent", dataIndex: "sentAt", width: 170, render: when },
              {
                title: "Message",
                key: "msg",
                render: (_, b) => (
                  <div className="text-xs leading-5">
                    <div className="font-semibold">{b.title}</div>
                    <div className="opacity-80">{b.body}</div>
                  </div>
                ),
              },
              { title: "Kind", dataIndex: "kind", render: (k: BroadcastKind) => <Tag color={k === "offer" ? "purple" : "blue"}>{k === "offer" ? "Offer" : "Venue news"}</Tag> },
              {
                title: "To",
                key: "to",
                render: (_, b) => (b.audience === "one" ? b.email : AUDIENCE_LABELS[b.audience as BroadcastAudience]),
              },
              {
                title: "Reached",
                key: "reached",
                render: (_, b) => (
                  <div className="text-xs leading-5">
                    <div>{b.inAppCount} in the app</div>
                    <div>{b.pushSent ? `${b.pushSent} phone(s)` : b.pushLogged ? `Push off on this server (${b.pushLogged})` : "No phones"}</div>
                    {b.guestBookings > 0 && <div>{b.guestBookings} guest booking(s) to call</div>}
                  </div>
                ),
              },
              { title: "By", dataIndex: "sentBy", render: (v: string | null) => v ?? "—" },
            ]}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}

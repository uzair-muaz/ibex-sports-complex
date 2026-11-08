"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Alert, Button, Table, Tag, Typography } from "antd";
import { bffFetch } from "@/lib/bff/client";
import { AREA_LABELS, type AuditArea } from "@/lib/audit-rules";
import type { AuditItem } from "@/lib/audit";

const { Text } = Typography;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "—";

type Page = { items: AuditItem[]; total: number; nextCursor: string | null };

/** Audit log rows with "Load more". Filters go in as query params. */
export function AuditTable({
  filters,
  onPickStaff,
  compact,
}: {
  filters: Record<string, string | undefined | null>;
  onPickStaff?: (id: string, name: string) => void;
  compact?: boolean;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  const qs = params.toString();

  const query = useInfiniteQuery({
    queryKey: ["admin", "audit", qs],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => bffFetch<Page>(`/api/v1/admin/audit?${qs}${pageParam ? `&cursor=${pageParam}` : ""}`),
    getNextPageParam: (last) => last.nextCursor,
  });

  if (query.error) return <Alert type="error" showIcon title={(query.error as Error).message} />;
  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <Table<AuditItem>
        rowKey="id"
        size="small"
        loading={query.isPending}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 820 }}
        locale={{ emptyText: "No changes recorded yet." }}
        expandable={{
          rowExpandable: (r) => r.changes.length > 0,
          expandedRowRender: (r) => (
            <Table
              size="small"
              rowKey="path"
              pagination={false}
              dataSource={r.changes}
              columns={[
                { title: "What", dataIndex: "path", width: 260, render: (p: string) => <Text code>{p}</Text> },
                { title: "Before", dataIndex: "from", render: (v: string) => <Text type="secondary" className="break-all text-xs">{v}</Text> },
                { title: "After", dataIndex: "to", render: (v: string) => <span className="break-all text-xs">{v}</span> },
              ]}
            />
          ),
        }}
        columns={[
          { title: "When", dataIndex: "at", width: 170, render: when },
          {
            title: "Who",
            key: "by",
            width: 150,
            render: (_, r) =>
              r.by ? (
                onPickStaff ? (
                  <Button type="link" size="small" className="px-0" onClick={() => onPickStaff(r.by!.id, r.by!.name)}>
                    {r.by.name}
                  </Button>
                ) : (
                  r.by.name
                )
              ) : (
                <Text type="secondary">Unknown</Text>
              ),
          },
          ...(compact
            ? []
            : [{ title: "Area", dataIndex: "area", width: 160, render: (a: AuditArea) => <Tag>{AREA_LABELS[a] ?? a}</Tag> }]),
          {
            title: "What happened",
            key: "summary",
            render: (_, r) => (
              <div className="text-sm">
                {r.summary}
                {r.changes.length > 0 && <Text type="secondary" className="text-xs"> · {r.changes.length} field(s)</Text>}
                {!compact && r.customerId && (
                  <>
                    {" "}
                    <Link href={`/admin/customers/${r.customerId}`} className="text-xs">
                      customer
                    </Link>
                  </>
                )}
              </div>
            ),
          },
        ]}
      />
      <div className="flex items-center gap-3">
        {query.hasNextPage && (
          <Button onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage}>
            Load more
          </Button>
        )}
        <Text type="secondary" className="text-xs">
          Showing {rows.length} of {total}
        </Text>
      </div>
    </div>
  );
}

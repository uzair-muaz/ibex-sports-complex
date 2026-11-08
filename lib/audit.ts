/**
 * Audit log: record who changed what. Server-only.
 * audit() never throws: a failed log line must never break the change itself.
 */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { AUDIT_AREAS, diffChanges, type AuditArea, type AuditChange } from "@/lib/audit-rules";
import { decodeCursor, encodeCursor } from "@/lib/api/my-bookings";
import { toPkIso } from "@/lib/api/time";

export type AuditActor = { userId?: string | null; id?: string | null; role?: string | null };

export type AuditEntry = {
  actor: AuditActor;
  area: AuditArea;
  action: string;
  summary: string;
  targetId?: string | { toString(): string } | null;
  targetLabel?: string | null;
  customerId?: string | { toString(): string } | null;
  /** Give before/after to list what changed, or pass `changes` yourself. */
  before?: unknown;
  after?: unknown;
  onlyAfterKeys?: boolean;
  changes?: AuditChange[];
};

const oid = (v: unknown) => (v && mongoose.isValidObjectId(String(v)) ? String(v) : null);

export async function audit(e: AuditEntry): Promise<void> {
  try {
    await connectDB();
    const changes =
      e.changes ?? (e.before !== undefined || e.after !== undefined ? diffChanges(e.before, e.after, { onlyAfterKeys: e.onlyAfterKeys }) : []);
    await AuditLog.create({
      actorId: oid(e.actor.userId ?? e.actor.id),
      actorRole: e.actor.role ?? "unknown",
      area: e.area,
      action: e.action,
      targetId: e.targetId ? String(e.targetId) : null,
      targetLabel: e.targetLabel?.slice(0, 200) ?? null,
      customerId: oid(e.customerId),
      summary: e.summary.slice(0, 500),
      changes,
    });
  } catch (err) {
    console.error("[audit] could not record:", err);
  }
}

/** Plain copy of a document (for before/after). */
export function snapshot<T>(doc: T): Record<string, unknown> | null {
  if (!doc) return null;
  const d = doc as unknown as { toObject?: () => unknown };
  const plain = typeof d.toObject === "function" ? d.toObject() : doc;
  return JSON.parse(JSON.stringify(plain)) as Record<string, unknown>;
}

export async function listAudit(params: {
  area?: string | null;
  actorId?: string | null;
  customerId?: string | null;
  targetId?: string | null;
  q?: string | null;
  from?: Date | null;
  to?: Date | null;
  cursor?: string | null;
  limit?: number;
}) {
  const offset = decodeCursor(params.cursor);
  if (offset === null) return null;
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 50)));
  const filter: Record<string, unknown> = {};
  if (params.area && AUDIT_AREAS.includes(params.area as AuditArea)) filter.area = params.area;
  if (oid(params.actorId)) filter.actorId = params.actorId;
  if (oid(params.customerId)) filter.customerId = params.customerId;
  if (params.targetId) filter.targetId = params.targetId;
  if (params.from || params.to) {
    filter.createdAt = { ...(params.from ? { $gte: params.from } : {}), ...(params.to ? { $lt: params.to } : {}) };
  }
  const q = params.q?.trim();
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 80), "i");
    filter.$or = [{ summary: re }, { targetLabel: re }];
  }
  await connectDB();
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).populate("actorId", "name email").lean(),
    AuditLog.countDocuments(filter),
  ]);
  return {
    items: rows.map((r) => {
      const actor = r.actorId as unknown as { _id: unknown; name?: string; email?: string } | null;
      return {
        id: r._id.toString(),
        at: toPkIso(r.createdAt),
        by: actor ? { id: String(actor._id), name: actor.name ?? actor.email ?? "Staff" } : null,
        role: r.actorRole,
        area: r.area,
        action: r.action,
        targetId: r.targetId ?? null,
        targetLabel: r.targetLabel ?? null,
        customerId: r.customerId ? String(r.customerId) : null,
        summary: r.summary,
        changes: r.changes ?? [],
      };
    }),
    total,
    nextCursor: offset + rows.length < total ? encodeCursor(offset + rows.length) : null,
  };
}

export type AuditItem = NonNullable<Awaited<ReturnType<typeof listAudit>>>["items"][number];

"use server";

import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { revalidatePath } from "next/cache";
import {
  resolveCustomerActor,
  requireStaffActor,
  type StaffActorOpts,
} from "@/lib/action-auth";

export async function createSupportTicket(
  input: {
    topic: string;
    message: string;
    bookingId?: string;
  },
  opts?: { actorUserId?: string; trustedApiActor?: boolean },
) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }
  if (!input.topic.trim() || !input.message.trim()) {
    return { success: false as const, error: "Topic and message are required" };
  }

  await connectDB();
  const ticket = await SupportTicket.create({
    userId: gate.userId,
    topic: input.topic.trim(),
    bookingId: input.bookingId || undefined,
    status: "open",
    messages: [
      {
        authorType: "user",
        authorId: gate.userId,
        body: input.message.trim(),
        createdAt: new Date(),
      },
    ],
  });

  revalidatePath("/account/support");
  revalidatePath("/admin/support");
  return {
    success: true as const,
    ticket: JSON.parse(JSON.stringify(ticket)),
  };
}

export async function getMySupportTickets(opts?: {
  actorUserId?: string;
  trustedApiActor?: boolean;
}) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  const tickets = await SupportTicket.find({ userId: gate.userId })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    success: true as const,
    tickets: JSON.parse(JSON.stringify(tickets)),
  };
}

export async function replyToMyTicket(
  input: {
    ticketId: string;
    message: string;
  },
  opts?: { actorUserId?: string; trustedApiActor?: boolean },
) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }
  if (!input.message.trim()) {
    return { success: false as const, error: "Message is required" };
  }

  await connectDB();
  const ticket = await SupportTicket.findOne({
    _id: input.ticketId,
    userId: gate.userId,
  });
  if (!ticket) return { success: false as const, error: "Ticket not found" };
  if (ticket.status === "closed") {
    return { success: false as const, error: "Ticket is closed" };
  }

  ticket.messages.push({
    authorType: "user",
    authorId: gate.userId as unknown as import("mongoose").Types.ObjectId,
    body: input.message.trim(),
    createdAt: new Date(),
  });
  await ticket.save();

  revalidatePath("/account/support");
  return { success: true as const, ticket: JSON.parse(JSON.stringify(ticket)) };
}

export async function adminListSupportTickets(opts?: StaffActorOpts) {
  const gate = await requireStaffActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  const tickets = await SupportTicket.find()
    .populate("userId", "name email")
    .sort({ updatedAt: -1 })
    .lean();

  return {
    success: true as const,
    tickets: JSON.parse(JSON.stringify(tickets)),
  };
}

export async function adminReplySupportTicket(
  input: {
    ticketId: string;
    message: string;
    close?: boolean;
  },
  opts?: StaffActorOpts,
) {
  const gate = await requireStaffActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }
  if (!input.message.trim()) {
    return { success: false as const, error: "Message is required" };
  }

  await connectDB();
  const ticket = await SupportTicket.findById(input.ticketId);
  if (!ticket) return { success: false as const, error: "Ticket not found" };

  ticket.messages.push({
    authorType: "admin",
    authorId: gate.userId as unknown as import("mongoose").Types.ObjectId,
    body: input.message.trim(),
    createdAt: new Date(),
  });
  if (input.close) ticket.status = "closed";
  await ticket.save();

  revalidatePath("/admin/support");
  return { success: true as const };
}

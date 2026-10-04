"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useClaimBookingsMutation,
  useUpdateMyProfileMutation,
} from "@/lib/tanstack/hooks/mutations";
import { useMyProfile } from "@/lib/tanstack/hooks/queries";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AccountProfilePage() {
  const { update } = useSession();
  const profileQuery = useMyProfile();
  const updateProfile = useUpdateMyProfileMutation();
  const claimBookings = useClaimBookingsMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [claimedNote, setClaimedNote] = useState("");
  const [claimedOnce, setClaimedOnce] = useState(false);

  useEffect(() => {
    if (!profileQuery.data?.user) return;
    const user = profileQuery.data.user as {
      name?: string;
      email?: string;
      phone?: string;
      image?: string;
    };
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setImage(user.image || null);
  }, [profileQuery.data]);

  useEffect(() => {
    if (profileQuery.error) {
      toast.error(
        profileQuery.error instanceof Error
          ? profileQuery.error.message
          : "Failed to load profile",
      );
    }
  }, [profileQuery.error]);

  useEffect(() => {
    if (!profileQuery.isSuccess || claimedOnce) return;
    setClaimedOnce(true);
    claimBookings.mutate(undefined, {
      onSuccess: (claim) => {
        if (claim.claimed > 0) {
          setClaimedNote(
            `Linked ${claim.claimed} past booking${claim.claimed === 1 ? "" : "s"} to your account.`,
          );
        }
      },
    });
    // Intentionally omit claimBookings from deps — run once after profile loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQuery.isSuccess, claimedOnce]);

  const onSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, phone });
      await update({ name, phone });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  if (profileQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 md:p-8">
      {claimedNote ? (
        <div className="rounded-xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 px-4 py-3 text-sm text-[#2DD4BF]">
          {claimedNote}
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        {image ? (
          <Image
            src={image}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold text-white">
            {name.slice(0, 1).toUpperCase() || "?"}
          </div>
        )}
        <div>
          <p className="font-semibold text-white">{name || "Player"}</p>
          <p className="text-sm text-zinc-400">{email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-950 border-white/10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            disabled
            className="bg-zinc-950 border-white/10 opacity-70"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03XXXXXXXXX"
            className="bg-zinc-950 border-white/10"
          />
          <p className="text-xs text-zinc-500">
            Required for bookings. Use a Pakistani mobile number.
          </p>
        </div>
      </div>

      <Button
        onClick={onSave}
        disabled={updateProfile.isPending}
        className="rounded-xl bg-[#2DD4BF] text-[#0F172A] font-semibold hover:bg-[#14B8A6]"
      >
        {updateProfile.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Save profile
      </Button>
    </div>
  );
}

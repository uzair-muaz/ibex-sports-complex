"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useClaimBookingsMutation,
  useSetMyPasswordMutation,
  useUpdateMyProfileMutation,
} from "@/lib/tanstack/hooks/mutations";
import { useMyProfile } from "@/lib/tanstack/hooks/queries";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ProfileUser = {
  name?: string;
  email?: string;
  phone?: string;
  image?: string;
  hasPassword?: boolean;
  hasGoogleAuth?: boolean;
};

export default function AccountProfilePage() {
  const { update } = useSession();
  const profileQuery = useMyProfile();
  const updateProfile = useUpdateMyProfileMutation();
  const setPassword = useSetMyPasswordMutation();
  const claimBookings = useClaimBookingsMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);
  const [claimedNote, setClaimedNote] = useState("");
  const [claimedOnce, setClaimedOnce] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!profileQuery.data?.user) return;
    const user = profileQuery.data.user as ProfileUser;
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setImage(user.image || null);
    setHasPassword(!!user.hasPassword);
    setHasGoogleAuth(!!user.hasGoogleAuth);
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

  const onSavePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await setPassword.mutateAsync({
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
      });
      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(
        hasPassword
          ? "Password updated"
          : "Password set — you can also sign in with email now",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
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
    <div className="max-w-3xl space-y-6">
      {claimedNote ? (
        <div className="rounded-2xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 px-4 py-3 text-sm text-[#2DD4BF]">
          {claimedNote}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/10 bg-gradient-to-r from-[#2DD4BF]/10 via-transparent to-transparent px-5 py-5 sm:px-6">
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2DD4BF]/15 text-xl font-bold text-[#2DD4BF] ring-1 ring-[#2DD4BF]/25">
                {name.slice(0, 1).toUpperCase() || "?"}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-white">
                {name || "Player"}
              </p>
              <p className="text-sm text-zinc-400">{email}</p>
              {hasGoogleAuth ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Signed in with Google
                  {!hasPassword ? " · no email password yet" : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-zinc-900/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="h-11 rounded-xl border-white/10 bg-zinc-900/80 opacity-70"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XXXXXXXXX"
                className="h-11 rounded-xl border-white/10 bg-zinc-900/80"
              />
              <p className="text-xs text-zinc-500">
                Required for bookings. Use a Pakistani mobile number.
              </p>
            </div>
          </div>

          <Button
            onClick={onSave}
            disabled={updateProfile.isPending}
            className="h-11 rounded-xl bg-[#2DD4BF] px-5 font-semibold text-[#0F172A] hover:bg-[#14B8A6]"
          >
            {updateProfile.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save profile
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-white">
            {hasPassword ? "Change password" : "Set a password"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {hasPassword
              ? "Update the password you use for email sign-in."
              : "You signed in with Google. Add a password so you can also sign in with email."}
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {hasPassword ? (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-zinc-900/80"
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-11 rounded-xl border-white/10 bg-zinc-900/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-zinc-900/80"
              />
            </div>
          </div>

          <Button
            onClick={onSavePassword}
            disabled={setPassword.isPending}
            className="h-11 rounded-xl bg-white/10 px-5 font-semibold text-white hover:bg-white/15"
          >
            {setPassword.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {hasPassword ? "Update password" : "Set password"}
          </Button>
        </div>
      </section>
    </div>
  );
}

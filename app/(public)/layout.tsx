import { PublicSiteShell } from "@/components/layout/PublicSiteShell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicSiteShell>{children}</PublicSiteShell>;
}

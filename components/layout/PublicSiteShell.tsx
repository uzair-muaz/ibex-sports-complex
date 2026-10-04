import { Navbar } from "@/components/Navbar";
import { DiscountBanner } from "@/components/DiscountBanner";
import { ConditionalFooter } from "@/components/ConditionalFooter";

type PublicSiteShellProps = {
  children: React.ReactNode;
};

/** Server shell — client islands live in Navbar / DiscountBanner. */
export function PublicSiteShell({ children }: PublicSiteShellProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <Navbar />
      <DiscountBanner className="fixed left-0 right-0 z-40 top-16 sm:top-17" />
      {children}
      <ConditionalFooter />
    </div>
  );
}

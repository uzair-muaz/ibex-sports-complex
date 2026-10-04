import { ConditionalPublicChrome } from "@/components/layout/ConditionalPublicChrome";

type PublicSiteShellProps = {
  children: React.ReactNode;
};

/** Server shell — marketing vs app chrome is decided client-side by path. */
export function PublicSiteShell({ children }: PublicSiteShellProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <ConditionalPublicChrome>{children}</ConditionalPublicChrome>
    </div>
  );
}

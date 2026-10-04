import Image from "next/image";

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footerNote?: string;
};

/** Split brand + form layout matching the admin sign-in page (Tailwind / public). */
export function AuthShell({
  eyebrow = "Member access",
  title,
  description,
  children,
  footerNote = "Book courts, track rewards, manage membership",
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_20%,rgba(45,212,191,0.14),transparent),radial-gradient(ellipse_40%_35%_at_85%_80%,rgba(45,212,191,0.08),transparent)]"
      />

      {/* Reserve space for fixed navbar so the split panel can center in the rest */}
      <div className="h-16 shrink-0 sm:h-[4.5rem]" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row">
        <aside className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 lg:justify-between lg:py-14">
          <div className="hidden lg:block" aria-hidden />

          <div className="max-w-md">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="IBEX"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
                priority
              />
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">
                  IBEX Sports Complex
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-[#2DD4BF]">
                  {eyebrow}
                </p>
              </div>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-zinc-400">
              {description}
            </p>
          </div>

          <p className="mt-10 text-xs text-zinc-500 lg:mt-0">{footerNote}</p>
        </aside>

        <main className="flex flex-1 items-center justify-center px-6 pb-16 lg:px-12 lg:pb-0">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

export const authInputClassName =
  "h-11 w-full rounded-xl border-0 bg-white/5 px-3.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-500 focus:ring-2 focus:ring-[#2DD4BF]/50";

export const authPrimaryButtonClassName =
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] text-sm font-semibold text-[#0F172A] transition hover:bg-[#14B8A6] disabled:opacity-60";

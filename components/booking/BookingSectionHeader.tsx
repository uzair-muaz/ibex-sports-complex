type BookingSectionHeaderProps = {
  title: React.ReactNode;
  subtitle: string;
};

export function BookingSectionHeader({
  title,
  subtitle,
}: BookingSectionHeaderProps) {
  return (
    <div className="mb-0 pb-6">
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-2 leading-[0.9]">
        {title}
      </h1>
      <p className="text-zinc-400 text-base md:text-lg max-w-xl mt-3">
        {subtitle}
      </p>
    </div>
  );
}

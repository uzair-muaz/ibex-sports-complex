type BookingChipItem = {
  key: string;
  label: string;
};

type BookingChipSelectorProps = {
  items: BookingChipItem[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  className?: string;
};

export function BookingChipSelector({
  items,
  activeKey,
  onSelect,
  className = "mb-4",
}: BookingChipSelectorProps) {
  return (
    <div
      className={`${className} flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap`}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={`w-full px-8 py-3 rounded-full text-xs font-bold border transition-all sm:w-auto sm:shrink-0 ${
            activeKey === item.key
              ? "bg-[#2DD4BF] border-[#2DD4BF] text-black"
              : "bg-transparent border-white/10 text-zinc-500 hover:border-white/20"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

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
    <div className={`${className} overflow-x-auto no-scrollbar flex gap-3`}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={`flex-none px-8 py-3 rounded-full text-xs font-bold border transition-all ${
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

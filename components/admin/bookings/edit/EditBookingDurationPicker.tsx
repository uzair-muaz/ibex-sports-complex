"use client";

import { Form } from "antd";
import type { DurationPreset } from "./types";

type EditBookingDurationPickerProps = {
  presets: DurationPreset[];
  durationHours: number;
  onChange: (hours: number) => void;
};

export function EditBookingDurationPicker({
  presets,
  durationHours,
  onChange,
}: EditBookingDurationPickerProps) {
  return (
    <Form.Item label="Duration" required className="mb-0">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.hours}
            type="button"
            onClick={() => onChange(preset.hours)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              durationHours === preset.hours
                ? "border-teal-400 bg-teal-500/20 text-teal-200"
                : "border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] text-[var(--ant-color-text)] hover:border-[var(--ant-color-primary)]"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </Form.Item>
  );
}

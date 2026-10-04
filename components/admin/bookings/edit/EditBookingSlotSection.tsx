"use client";

import { Typography } from "antd";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import { AdminAvailableSlotGrid } from "@/components/admin/AdminAvailableSlotGrid";
import { AdminPageLoader } from "@/components/admin/loaders";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { formatAdminBookingEndLabel } from "@/lib/admin-booking-slots";
import { formatTime12 } from "@/lib/utils";
import type { Court } from "@/types";

const { Text } = Typography;

type SavedBookingPricing = {
  totalPrice: number;
  originalPrice?: number;
  discountAmount?: number;
};

type EditBookingSlotSectionProps = {
  isInitialSlotLoading: boolean;
  courts: Court[];
  quotableQuotes: AvailableStartTimeQuote[];
  selectedQuote: AvailableStartTimeQuote | null;
  durationHours: number;
  quotesRefreshing: boolean;
  savedBookingPricing: SavedBookingPricing | null;
  onSelectQuote: (quote: AvailableStartTimeQuote) => void;
};

export function EditBookingSlotSection({
  isInitialSlotLoading,
  courts,
  quotableQuotes,
  selectedQuote,
  durationHours,
  quotesRefreshing,
  savedBookingPricing,
  onSelectQuote,
}: EditBookingSlotSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Text className="text-sm text-[var(--ant-color-text)]">
          Available start times
          <span className="ml-2 font-normal text-[var(--ant-color-text-secondary)]">
            (court assigned automatically; past times today hidden unless this
            booking)
          </span>
        </Text>
      </div>

      {isInitialSlotLoading ? (
        <AdminPageLoader label="Loading available slots..." />
      ) : courts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--ant-color-text-secondary)]">
          No courts available for this court type.
        </p>
      ) : (
        <AdminAvailableSlotGrid
          quotes={quotableQuotes}
          selectedQuote={selectedQuote}
          durationHours={durationHours}
          courts={courts}
          onSelect={onSelectQuote}
          isLoading={quotesRefreshing}
          emptyMessage="No available slots for this date and duration."
          formatTime12={formatTime12}
          formatEndLabel={(start, dur) =>
            formatAdminBookingEndLabel(start, dur)
          }
        />
      )}

      {selectedQuote && selectedQuote.totalPrice > 0 && (
        <div className="mt-4 space-y-3 rounded-lg border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] p-4">
          <p className="text-sm text-[var(--ant-color-text-secondary)]">
            Pricing for the selected slot (saved on update if time or date
            changed).
          </p>
          <PriceBreakdown
            originalPrice={selectedQuote.originalPrice}
            totalPrice={selectedQuote.totalPrice}
            discounts={selectedQuote.appliedDiscounts}
            discountAmount={selectedQuote.discountAmount}
          />
          {savedBookingPricing ? (
            <p className="border-t border-[var(--ant-color-border)] pt-1 text-xs text-[var(--ant-color-text-secondary)]">
              Currently saved on booking: PKR{" "}
              {savedBookingPricing.totalPrice.toLocaleString()}
              {selectedQuote.totalPrice !== savedBookingPricing.totalPrice ? (
                <span className="text-amber-500/90">
                  {" "}
                  — will update after you save if the slot or discounts changed.
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

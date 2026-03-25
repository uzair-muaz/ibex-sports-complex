"use client";

import { AppliedDiscount } from "@/types";

interface PriceBreakdownProps {
  originalPrice: number;
  discounts?: AppliedDiscount[];
  discountAmount?: number;
  totalPrice: number;
  showOriginalOnly?: boolean;
  compact?: boolean;
  className?: string;
}

export function PriceBreakdown({
  originalPrice,
  discounts = [],
  discountAmount = 0,
  totalPrice,
  showOriginalOnly = false,
  compact = false,
  className = "",
}: PriceBreakdownProps) {
  const hasDiscounts = discounts.length > 0 && discountAmount > 0;

  // If no discounts or showOriginalOnly, just show the price
  if (!hasDiscounts || showOriginalOnly) {
    return (
      <div className={className}>
        <span className="text-[#2DD4BF] font-semibold">
          PKR {totalPrice.toLocaleString()}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400 line-through">
            PKR {originalPrice.toLocaleString()}
          </span>
          <span className="text-[#2DD4BF] font-semibold">
            PKR {totalPrice.toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-green-400">
          You save PKR {discountAmount.toLocaleString()}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Subtotal */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">Subtotal</span>
        <span className="text-zinc-300">
          PKR {originalPrice.toLocaleString()}
        </span>
      </div>

      {/* Individual discounts */}
      {discounts.map((discount, index) => (
        <div
          key={discount.discountId || index}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-green-400">
            {discount.name}{" "}
            <span className="text-zinc-500">
              (
              {discount.type === "percentage"
                ? `${discount.value}%`
                : `PKR ${discount.value}`}
              )
            </span>
          </span>
          <span className="text-green-400">
            -PKR {discount.amountSaved.toLocaleString()}
          </span>
        </div>
      ))}

      {/* Divider */}
      <div className="border-t border-zinc-800 my-2" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">Total</span>
        <span className="text-[#2DD4BF] font-bold text-lg">
          PKR {totalPrice.toLocaleString()}
        </span>
      </div>

      {/* Savings badge */}
      {discountAmount > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-md px-3 py-2 text-center">
          <span className="text-green-400 text-sm font-medium">
            You save PKR {discountAmount.toLocaleString()}!
          </span>
        </div>
      )}
    </div>
  );
}

// Simple inline price display with discount
export function InlinePrice({
  originalPrice,
  discountAmount = 0,
  totalPrice,
  className = "",
}: {
  originalPrice: number;
  discountAmount?: number;
  totalPrice: number;
  className?: string;
}) {
  const hasDiscount = discountAmount > 0;

  if (!hasDiscount) {
    return (
      <span className={`text-[#2DD4BF] font-semibold ${className}`}>
        PKR {totalPrice.toLocaleString()}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="text-zinc-500 line-through text-sm mr-2">
        PKR {originalPrice.toLocaleString()}
      </span>
      <span className="text-[#2DD4BF] font-semibold">
        PKR {totalPrice.toLocaleString()}
      </span>
    </span>
  );
}

"use client";

import { Tag } from "antd";
import {
  isDiscountCurrentlyActive,
  usesTierSplitDiscount,
} from "@/lib/discount-utils";
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from "@/lib/date-time";
import type { Discount } from "@/types";

export function DiscountStatusTag({ discount }: { discount: Discount }) {
  const isCurrentlyActive = isDiscountCurrentlyActive(discount);

  if (!discount.isActive) {
    return <Tag>Disabled</Tag>;
  }

  if (isCurrentlyActive) {
    return <Tag color="cyan">Live</Tag>;
  }

  const nowKey = toDateKeyInTimezone(new Date(), BUSINESS_TIMEZONE);
  const validFromKey = toDateKeyInTimezone(
    new Date(discount.validFrom),
    BUSINESS_TIMEZONE,
  );

  if (nowKey < validFromKey) {
    return <Tag color="gold">Scheduled</Tag>;
  }

  return <Tag color="error">Expired</Tag>;
}

export function DiscountTypeTag({ discount }: { discount: Discount }) {
  if (usesTierSplitDiscount(discount)) {
    return <Tag>mixed</Tag>;
  }
  return <Tag>{discount.type}</Tag>;
}

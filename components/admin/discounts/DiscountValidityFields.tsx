"use client";

import React from "react";
import { Checkbox, DatePicker, Form } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { DiscountFormState } from "./discountHelpers";

type DiscountValidityFieldsProps = {
  discountForm: DiscountFormState;
  setDiscountForm: React.Dispatch<React.SetStateAction<DiscountFormState>>;
};

export function DiscountValidityFields({
  discountForm,
  setDiscountForm,
}: DiscountValidityFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Form.Item label="Valid From">
          <DatePicker
            className="w-full"
            value={
              discountForm.validFrom ? dayjs(discountForm.validFrom) : null
            }
            onChange={(date: Dayjs | null) =>
              setDiscountForm({
                ...discountForm,
                validFrom: date?.toDate(),
              })
            }
          />
        </Form.Item>
        <Form.Item label="Valid Until">
          <DatePicker
            className="w-full"
            value={
              discountForm.validUntil
                ? dayjs(discountForm.validUntil)
                : null
            }
            onChange={(date: Dayjs | null) =>
              setDiscountForm({
                ...discountForm,
                validUntil: date?.toDate(),
              })
            }
            disabledDate={(current) =>
              discountForm.validFrom
                ? !!current &&
                  current.isBefore(dayjs(discountForm.validFrom), "day")
                : false
            }
          />
        </Form.Item>
      </div>

      <Form.Item className="mb-0">
        <Checkbox
          checked={discountForm.isActive}
          onChange={(e) =>
            setDiscountForm({
              ...discountForm,
              isActive: e.target.checked,
            })
          }
        >
          Active (discount will be applied when conditions match)
        </Checkbox>
      </Form.Item>
    </>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import {
  useDiscounts,
  useDiscountById,
  getQueryLoadingState,
} from "@/lib/tanstack/hooks/queries";
import {
  useCreateDiscountMutation,
  useUpdateDiscountMutation,
  useDeleteDiscountMutation,
  useToggleDiscountActiveMutation,
} from "@/lib/tanstack/hooks/mutations";
import { type DayRuleInput } from "@/app/actions/discounts";
import {
  formatDiscountValue,
  formatTimeRestriction,
  formatCourtTypes,
  formatBookingDurationRange,
  formatPricingTierLabel,
  formatDiscountValueSummary,
  isDiscountCurrentlyActive,
  inferDiscountCategory,
  inferTierDiscountMode,
  usesTierSplitDiscount,
  isValidDayRule,
  DAY_LABELS,
} from "@/lib/discount-utils";
import { formatLocalDate } from "@/lib/utils";
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from "@/lib/date-time";
import type {
  Discount,
  CourtType,
  DiscountPricingTier,
  DiscountCategory,
  TierDiscountMode,
  DayRuleRateMode,
} from "@/types";

const { Text } = Typography;

const COURT_TYPES: CourtType[] = ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"];

type DayRuleForm = {
  days: number[];
  rateMode: DayRuleRateMode;
  type: "percentage" | "fixed";
  value: number;
  peakType: "percentage" | "fixed";
  peakValue: number | "";
  offPeakType: "percentage" | "fixed";
  offPeakValue: number | "";
};

const emptyDayRule = (): DayRuleForm => ({
  days: [],
  rateMode: "uniform",
  type: "percentage",
  value: 0,
  peakType: "percentage",
  peakValue: "",
  offPeakType: "percentage",
  offPeakValue: "",
});

function isDayRuleFormSplit(rule: DayRuleForm): boolean {
  return rule.rateMode === "split";
}

function isDayRuleFormValid(rule: DayRuleForm): boolean {
  if (!rule.days.length) return false;
  if (isDayRuleFormSplit(rule)) {
    return (
      (rule.peakValue !== "" && Number(rule.peakValue) > 0) ||
      (rule.offPeakValue !== "" && Number(rule.offPeakValue) > 0)
    );
  }
  return rule.value > 0;
}

function dayRuleFormToInput(rule: DayRuleForm): DayRuleInput | null {
  if (!isDayRuleFormValid(rule)) return null;

  if (isDayRuleFormSplit(rule)) {
    const peakDiscount =
      rule.peakValue !== "" && Number(rule.peakValue) > 0
        ? { type: rule.peakType, value: Number(rule.peakValue) }
        : undefined;
    const offPeakDiscount =
      rule.offPeakValue !== "" && Number(rule.offPeakValue) > 0
        ? { type: rule.offPeakType, value: Number(rule.offPeakValue) }
        : undefined;
    const primary = peakDiscount ?? offPeakDiscount!;
    return {
      days: rule.days,
      rateMode: "split",
      type: primary.type,
      value: primary.value,
      peakDiscount,
      offPeakDiscount,
    };
  }

  return {
    days: rule.days,
    rateMode: "uniform",
    type: rule.type,
    value: rule.value,
  };
}

function getDaysClaimedByOtherRules(
  rules: DayRuleForm[],
  excludeIndex: number,
): Set<number> {
  const claimed = new Set<number>();
  for (let i = 0; i < rules.length; i++) {
    if (i === excludeIndex) continue;
    for (const day of rules[i].days) claimed.add(day);
  }
  return claimed;
}

function normalizeDayRulesFromDiscount(
  dayRules: Discount["dayRules"] | undefined,
): DayRuleForm[] {
  if (!Array.isArray(dayRules)) return [];
  return dayRules
    .filter(
      (r): r is NonNullable<(typeof dayRules)[number]> =>
        !!r && Array.isArray(r.days) && r.days.length > 0,
    )
    .map((r) => {
      const split =
        r.rateMode === "split" ||
        (r.peakDiscount != null && r.peakDiscount.value > 0) ||
        (r.offPeakDiscount != null && r.offPeakDiscount.value > 0);
      const pk = r.peakDiscount;
      const ok = r.offPeakDiscount;
      return {
        days: [...r.days]
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
          .sort((a, b) => a - b),
        rateMode: split ? ("split" as const) : ("uniform" as const),
        type: (r.type === "fixed" ? "fixed" : "percentage") as
          | "percentage"
          | "fixed",
        value: Number(r.value) || 0,
        peakType: (pk?.type ?? "percentage") as "percentage" | "fixed",
        peakValue:
          pk != null && pk.value > 0 ? pk.value : ("" as number | ""),
        offPeakType: (ok?.type ?? "percentage") as "percentage" | "fixed",
        offPeakValue:
          ok != null && ok.value > 0 ? ok.value : ("" as number | ""),
      };
    })
    .filter((r) => isDayRuleFormValid(r));
}

type DiscountFormState = {
  name: string;
  discountCategory: DiscountCategory;
  tierDiscountMode: TierDiscountMode;
  type: "percentage" | "fixed";
  value: number;
  peakType: "percentage" | "fixed";
  peakValue: number | "";
  offPeakType: "percentage" | "fixed";
  offPeakValue: number | "";
  courtTypes: CourtType[];
  minBookingHours: number | "";
  pricingTier: DiscountPricingTier;
  allDay: boolean;
  startHour: number;
  endHour: number;
  validFrom: Date | undefined;
  validUntil: Date | undefined;
  isActive: boolean;
  dayScheduleEnabled: boolean;
  dayRules: DayRuleForm[];
};

function discountToFormState(discount: Discount): DiscountFormState {
  const category = inferDiscountCategory(discount);
  const mode = inferTierDiscountMode(discount);
  const pk = discount.peakDiscount;
  const ok = discount.offPeakDiscount;
  const normalizedDayRules = normalizeDayRulesFromDiscount(discount.dayRules);

  return {
    name: discount.name,
    discountCategory: category,
    tierDiscountMode: mode,
    type: discount.type,
    value: discount.value,
    peakType: (pk?.type ?? "percentage") as "percentage" | "fixed",
    peakValue: (pk != null && pk.value > 0
      ? pk.value
      : "") as number | "",
    offPeakType: (ok?.type ?? "percentage") as "percentage" | "fixed",
    offPeakValue: (ok != null && ok.value > 0
      ? ok.value
      : "") as number | "",
    courtTypes: Array.isArray(discount.courtTypes) ? discount.courtTypes : [],
    minBookingHours: (discount.minBookingHours != null
      ? discount.minBookingHours
      : "") as number | "",
    pricingTier: discount.pricingTier ?? "any",
    allDay: discount.allDay ?? true,
    startHour: discount.startHour ?? 6,
    endHour: discount.endHour ?? 23,
    validFrom: new Date(discount.validFrom),
    validUntil: new Date(discount.validUntil),
    isActive: discount.isActive,
    dayScheduleEnabled: normalizedDayRules.length > 0,
    dayRules: normalizedDayRules,
  };
}

function dayRulesForUpdate(
  editing: Discount | null,
  enabled: boolean,
  payload: DayRuleInput[] | null,
): DayRuleInput[] | null | undefined {
  if (enabled) return payload;
  if (editing && (editing.dayRules ?? []).some(isValidDayRule)) {
    return null;
  }
  return undefined;
}

export default function DiscountsPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  const discountsQuery = useDiscounts({ enabled: !!session && isAdmin });
  const { isInitialLoading, isRefreshing } = getQueryLoadingState(discountsQuery);
  const discounts = (discountsQuery.data ?? []) as Discount[];

  const createDiscountMutation = useCreateDiscountMutation();
  const updateDiscountMutation = useUpdateDiscountMutation();
  const deleteDiscountMutation = useDeleteDiscountMutation();
  const toggleDiscountActiveMutation = useToggleDiscountActiveMutation();

  const [showDiscountDrawer, setShowDiscountDrawer] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDiscount, setDeletingDiscount] = useState<Discount | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Discount | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const discountByIdQuery = useDiscountById(editingDiscountId, {
    enabled: showDiscountDrawer && !!editingDiscountId,
  });
  const { isInitialLoading: isLoadingEdit } =
    getQueryLoadingState(discountByIdQuery);

  const [discountForm, setDiscountForm] = useState({
    name: "",
    discountCategory: "flat" as DiscountCategory,
    tierDiscountMode: "uniform" as TierDiscountMode,
    type: "percentage" as "percentage" | "fixed",
    value: 0,
    peakType: "percentage" as "percentage" | "fixed",
    peakValue: "" as number | "",
    offPeakType: "percentage" as "percentage" | "fixed",
    offPeakValue: "" as number | "",
    courtTypes: [] as CourtType[],
    minBookingHours: "" as number | "",
    pricingTier: "any" as DiscountPricingTier,
    allDay: true,
    startHour: 6,
    endHour: 23,
    validFrom: new Date() as Date | undefined,
    validUntil: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d;
    })() as Date | undefined,
    isActive: true,
    dayScheduleEnabled: false,
    dayRules: [] as DayRuleForm[],
  });

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/admin/bookings");
    }
  }, [session, isAdmin, router]);

  useEffect(() => {
    if (discountsQuery.error) {
      message.error(
        discountsQuery.error instanceof Error
          ? discountsQuery.error.message
          : "Failed to load discounts",
      );
    }
  }, [discountsQuery.error, message]);

  useEffect(() => {
    if (!discountByIdQuery.data) return;
    const fresh = discountByIdQuery.data as Discount;
    setEditingDiscount(fresh);
    setDiscountForm(discountToFormState(fresh));
  }, [discountByIdQuery.data]);

  const isSubmitting =
    createDiscountMutation.isPending || updateDiscountMutation.isPending;
  const isDeleting = deleteDiscountMutation.isPending;
  const togglingDiscountId = toggleDiscountActiveMutation.isPending
    ? (toggleDiscountActiveMutation.variables ?? null)
    : null;

  const handleDiscountSubmit = async () => {
    if (!discountForm.validFrom || !discountForm.validUntil) {
      message.warning("Please select valid from and valid until dates");
      return;
    }

    const isFlat = discountForm.discountCategory === "flat";
    const isSplit =
      !isFlat &&
      discountForm.tierDiscountMode === "split";

    const peakSlice =
      discountForm.peakValue === "" || Number(discountForm.peakValue) <= 0
        ? undefined
        : {
            type: discountForm.peakType,
            value: Number(discountForm.peakValue),
          };
    const offPeakSlice =
      discountForm.offPeakValue === "" || Number(discountForm.offPeakValue) <= 0
        ? undefined
        : {
            type: discountForm.offPeakType,
            value: Number(discountForm.offPeakValue),
          };

    if (isSplit && !peakSlice && !offPeakSlice) {
      message.warning("Add at least one peak or off-peak discount amount");
      return;
    }

    let dayRulesPayload: DayRuleInput[] | null = null;
    if (discountForm.dayScheduleEnabled) {
      if (isSplit) {
        message.warning("Day-based rates cannot be combined with peak/off-peak split");
        return;
      }
      dayRulesPayload = discountForm.dayRules
        .map(dayRuleFormToInput)
        .filter((r): r is DayRuleInput => r != null);
      if (dayRulesPayload.length === 0) {
        message.warning(
          "Add at least one day rule with selected days and a discount amount (uniform or peak/off-peak)",
        );
        return;
      }
      const seen = new Set<number>();
      for (const rule of dayRulesPayload) {
        for (const d of rule.days) {
          if (seen.has(d)) {
            message.warning(`${DAY_LABELS[d]} appears in more than one day rule`);
            return;
          }
          seen.add(d);
        }
      }
    }

    const dayRulesUpdate = dayRulesForUpdate(
      editingDiscount,
      discountForm.dayScheduleEnabled,
      dayRulesPayload,
    );

    const validFrom = formatLocalDate(discountForm.validFrom);
    const validUntil = formatLocalDate(discountForm.validUntil);

    const minH =
      discountForm.minBookingHours === ""
        ? editingDiscount
          ? null
          : undefined
        : Number(discountForm.minBookingHours);

    try {
      if (editingDiscount) {
        const baseUpdate = {
          discountId: editingDiscount._id,
          name: discountForm.name,
          courtTypes: discountForm.courtTypes,
          validFrom,
          validUntil,
          isActive: discountForm.isActive,
          discountCategory: discountForm.discountCategory,
        };

        let result;

        if (isFlat) {
          const primaryRule = dayRulesPayload?.[0];
          result = await updateDiscountMutation.mutateAsync({
            ...baseUpdate,
            type: primaryRule?.type ?? discountForm.type,
            value: primaryRule?.value ?? discountForm.value,
            ...(dayRulesUpdate !== undefined ? { dayRules: dayRulesUpdate } : {}),
          });
        } else if (isSplit) {
          result = await updateDiscountMutation.mutateAsync({
            ...baseUpdate,
            tierDiscountMode: "split",
            ...(peakSlice || offPeakSlice
              ? { type: (peakSlice ?? offPeakSlice)!.type }
              : {}),
            minBookingHours: minH as number | null | undefined,
            maxBookingHours: null,
            pricingTier: "any",
            allDay: discountForm.allDay,
            startHour: discountForm.startHour,
            endHour: discountForm.endHour,
            peakDiscount: peakSlice ?? null,
            offPeakDiscount: offPeakSlice ?? null,
          });
        } else {
          const primaryRule = dayRulesPayload?.[0];
          result = await updateDiscountMutation.mutateAsync({
            ...baseUpdate,
            tierDiscountMode: "uniform",
            type: primaryRule?.type ?? discountForm.type,
            value: primaryRule?.value ?? discountForm.value,
            minBookingHours: minH as number | null | undefined,
            maxBookingHours: null,
            pricingTier: discountForm.pricingTier,
            allDay: discountForm.allDay,
            startHour: discountForm.startHour,
            endHour: discountForm.endHour,
            ...(dayRulesUpdate !== undefined ? { dayRules: dayRulesUpdate } : {}),
          });
        }

        if (result.success) {
          setShowDiscountDrawer(false);
          setEditingDiscount(null);
          setEditingDiscountId(null);
          resetForm();
        } else {
          message.error(result.error || "Failed to update discount");
        }
      } else {
        const commonCreate = {
          name: discountForm.name,
          courtTypes: discountForm.courtTypes,
          validFrom,
          validUntil,
          isActive: discountForm.isActive,
        };

        let result;

        if (isFlat) {
          const primaryRule = dayRulesPayload?.[0];
          result = await createDiscountMutation.mutateAsync({
            ...commonCreate,
            discountCategory: "flat",
            type: primaryRule?.type ?? discountForm.type,
            value: primaryRule?.value ?? discountForm.value,
            allDay: true,
            dayRules: discountForm.dayScheduleEnabled ? dayRulesPayload ?? undefined : undefined,
          });
        } else if (isSplit) {
          result = await createDiscountMutation.mutateAsync({
            ...commonCreate,
            discountCategory: "time_based",
            tierDiscountMode: "split",
            type: peakSlice?.type ?? offPeakSlice?.type ?? "percentage",
            peakDiscount: peakSlice,
            offPeakDiscount: offPeakSlice,
            minBookingHours: minH as number | undefined,
            allDay: discountForm.allDay,
            startHour: discountForm.startHour,
            endHour: discountForm.endHour,
          });
        } else {
          const primaryRule = dayRulesPayload?.[0];
          result = await createDiscountMutation.mutateAsync({
            ...commonCreate,
            discountCategory: "time_based",
            tierDiscountMode: "uniform",
            type: primaryRule?.type ?? discountForm.type,
            value: primaryRule?.value ?? discountForm.value,
            minBookingHours: minH as number | undefined,
            pricingTier: discountForm.pricingTier,
            allDay: discountForm.allDay,
            startHour: discountForm.startHour,
            endHour: discountForm.endHour,
            dayRules: discountForm.dayScheduleEnabled ? dayRulesPayload ?? undefined : undefined,
          });
        }

        if (result.success) {
          setShowDiscountDrawer(false);
          resetForm();
        } else {
          message.error(result.error || "Failed to create discount");
        }
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const resetForm = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setDiscountForm({
      name: "",
      discountCategory: "flat",
      tierDiscountMode: "uniform",
      type: "percentage",
      value: 0,
      peakType: "percentage",
      peakValue: "",
      offPeakType: "percentage",
      offPeakValue: "",
      courtTypes: [],
      minBookingHours: "",
      pricingTier: "any",
      allDay: true,
      startHour: 6,
      endHour: 23,
      validFrom: today,
      validUntil: nextMonth,
      isActive: true,
      dayScheduleEnabled: false,
      dayRules: [],
    });
  };

  const handleEdit = (discount: Discount) => {
    const discountId = String(discount._id);
    setEditingDiscount(discount);
    setEditingDiscountId(discountId);
    setDiscountForm(discountToFormState(discount));
    setShowDiscountDrawer(true);
  };

  const handleDelete = (discount: Discount) => {
    setDeletingDiscount(discount);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingDiscount) return;

    try {
      const result = await deleteDiscountMutation.mutateAsync(
        deletingDiscount._id,
      );
      if (result.success) {
        setShowDeleteModal(false);
        setDeletingDiscount(null);
      } else {
        message.error(result.error || "Failed to delete discount");
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const handleToggleActive = async (discount: Discount) => {
    try {
      const result = await toggleDiscountActiveMutation.mutateAsync(
        discount._id,
      );
      if (!result.success) {
        message.error(result.error || "Failed to toggle discount status");
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const handleCourtTypeToggle = (courtType: CourtType) => {
    setDiscountForm((prev) => {
      const newCourtTypes = prev.courtTypes.includes(courtType)
        ? prev.courtTypes.filter((ct) => ct !== courtType)
        : [...prev.courtTypes, courtType];
      return { ...prev, courtTypes: newCourtTypes };
    });
  };

  const handleTableChange: TableProps<Discount>["onChange"] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (activeSorter?.columnKey && activeSorter.order) {
      setSortColumn(activeSorter.columnKey as keyof Discount);
      setSortDirection(activeSorter.order === "descend" ? "desc" : "asc");
    } else {
      setSortColumn(null);
      setSortDirection("asc");
    }
  };

  const compareDiscounts = useCallback(
    (a: Discount, b: Discount) => {
      if (!sortColumn) return 0;

      let aValue: unknown = a[sortColumn];
      let bValue: unknown = b[sortColumn];

      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        return sortDirection === "asc"
          ? aValue === bValue
            ? 0
            : aValue
            ? 1
            : -1
          : aValue === bValue
          ? 0
          : aValue
          ? -1
          : 1;
      }

      if (aValue == null || bValue == null) return 0;
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    },
    [sortColumn, sortDirection],
  );

  const flatDiscounts = useMemo(
    () => discounts.filter((d) => inferDiscountCategory(d) === "flat"),
    [discounts],
  );
  const timeBasedDiscountList = useMemo(
    () => discounts.filter((d) => inferDiscountCategory(d) === "time_based"),
    [discounts],
  );

  const sortedFlatDiscounts = useMemo(() => {
    if (!sortColumn) return flatDiscounts;
    return [...flatDiscounts].sort(compareDiscounts);
  }, [flatDiscounts, sortColumn, compareDiscounts]);

  const sortedTimeBasedDiscounts = useMemo(() => {
    if (!sortColumn) return timeBasedDiscountList;
    return [...timeBasedDiscountList].sort(compareDiscounts);
  }, [timeBasedDiscountList, sortColumn, compareDiscounts]);

  const sortOrderFor = (column: keyof Discount) =>
    sortColumn === column
      ? sortDirection === "asc"
        ? "ascend"
        : "descend"
      : null;

  const getStatusTag = (discount: Discount) => {
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
  };

  const renderTypeTag = (discount: Discount) => {
    if (usesTierSplitDiscount(discount)) {
      return <Tag>mixed</Tag>;
    }
    return <Tag>{discount.type}</Tag>;
  };

  const renderActions = (discount: Discount) => (
    <Space size="small">
      <Switch
        size="small"
        checked={discount.isActive}
        loading={togglingDiscountId === discount._id}
        onChange={() => handleToggleActive(discount)}
      />
      <Button
        type="text"
        icon={<EditOutlined />}
        onClick={() => handleEdit(discount)}
        title="Edit"
      />
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => handleDelete(discount)}
        title="Delete"
      />
    </Space>
  );

  const flatColumns: ColumnsType<Discount> = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        sorter: (a, b) => a.name.localeCompare(b.name),
        sortOrder: sortOrderFor("name"),
        render: (name: string) => (
          <span className="font-medium text-white text-sm">{name}</span>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        sorter: (a, b) => a.type.localeCompare(b.type),
        sortOrder: sortOrderFor("type"),
        render: (_: unknown, discount: Discount) => renderTypeTag(discount),
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        sorter: (a, b) => a.value - b.value,
        sortOrder: sortOrderFor("value"),
        render: (_: unknown, discount: Discount) => (
          <span className="text-[#2DD4BF] font-semibold text-sm">
            {formatDiscountValueSummary(discount)}
          </span>
        ),
      },
      {
        title: "Types",
        key: "courtTypes",
        render: (_: unknown, discount: Discount) => (
          <span className="text-zinc-300 text-sm">
            {formatCourtTypes(discount.courtTypes)}
          </span>
        ),
      },
      {
        title: "Valid Period",
        key: "validPeriod",
        render: (_: unknown, discount: Discount) => (
          <Space size="small">
            <CalendarOutlined className="text-zinc-500" />
            <Text type="secondary" className="text-sm">
              {new Date(discount.validFrom).toLocaleDateString()} -{" "}
              {new Date(discount.validUntil).toLocaleDateString()}
            </Text>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "isActive",
        sorter: (a, b) => Number(a.isActive) - Number(b.isActive),
        sortOrder: sortOrderFor("isActive"),
        render: (_: unknown, discount: Discount) => getStatusTag(discount),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_: unknown, discount: Discount) => renderActions(discount),
      },
    ],
    [sortColumn, sortDirection, togglingDiscountId],
  );

  const timeBasedColumns: ColumnsType<Discount> = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        sorter: (a, b) => a.name.localeCompare(b.name),
        sortOrder: sortOrderFor("name"),
        render: (name: string) => (
          <span className="font-medium text-white text-sm">{name}</span>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        sorter: (a, b) => a.type.localeCompare(b.type),
        sortOrder: sortOrderFor("type"),
        render: (_: unknown, discount: Discount) => renderTypeTag(discount),
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        sorter: (a, b) => a.value - b.value,
        sortOrder: sortOrderFor("value"),
        render: (_: unknown, discount: Discount) => (
          <span className="text-[#2DD4BF] font-semibold text-sm">
            {formatDiscountValueSummary(discount)}
          </span>
        ),
      },
      {
        title: "Types",
        key: "courtTypes",
        render: (_: unknown, discount: Discount) => (
          <span className="text-zinc-300 text-sm">
            {formatCourtTypes(discount.courtTypes)}
          </span>
        ),
      },
      {
        title: "Length",
        key: "length",
        render: (_: unknown, discount: Discount) => (
          <span className="text-zinc-300 text-sm whitespace-nowrap">
            {formatBookingDurationRange(
              discount.minBookingHours,
              discount.maxBookingHours,
            )}
          </span>
        ),
      },
      {
        title: "Tier",
        key: "tier",
        render: (_: unknown, discount: Discount) => (
          <span className="text-zinc-300 text-sm">
            {usesTierSplitDiscount(discount)
              ? "Any start (split)"
              : formatPricingTierLabel(discount.pricingTier)}
          </span>
        ),
      },
      {
        title: "Time",
        key: "time",
        render: (_: unknown, discount: Discount) => (
          <span className="text-zinc-300 text-sm">
            {formatTimeRestriction(
              discount.allDay,
              discount.startHour,
              discount.endHour,
            )}
          </span>
        ),
      },
      {
        title: "Valid Period",
        key: "validPeriod",
        render: (_: unknown, discount: Discount) => (
          <Space size="small">
            <CalendarOutlined className="text-zinc-500" />
            <Text type="secondary" className="text-sm">
              {new Date(discount.validFrom).toLocaleDateString()} -{" "}
              {new Date(discount.validUntil).toLocaleDateString()}
            </Text>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "isActive",
        sorter: (a, b) => Number(a.isActive) - Number(b.isActive),
        sortOrder: sortOrderFor("isActive"),
        render: (_: unknown, discount: Discount) => getStatusTag(discount),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_: unknown, discount: Discount) => renderActions(discount),
      },
    ],
    [sortColumn, sortDirection, togglingDiscountId],
  );

  const formatHourOption = (i: number) =>
    i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`;

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: formatHourOption(i),
  }));

  const closeDiscountDrawer = () => {
    setShowDiscountDrawer(false);
    setEditingDiscount(null);
    setEditingDiscountId(null);
    resetForm();
  };

  const isFlatForm = discountForm.discountCategory === "flat";
  const isTimeForm = !isFlatForm;
  const isSplitForm = isTimeForm && discountForm.tierDiscountMode === "split";
  const isUniformTimeForm = isTimeForm && discountForm.tierDiscountMode === "uniform";

  const toggleDayInRule = (ruleIndex: number, day: number) => {
    setDiscountForm((prev) => {
      const claimedElsewhere = getDaysClaimedByOtherRules(prev.dayRules, ruleIndex);
      const isSelected = prev.dayRules[ruleIndex]?.days.includes(day);
      if (!isSelected && claimedElsewhere.has(day)) return prev;

      const rules = [...prev.dayRules];
      const rule = { ...rules[ruleIndex] };
      rule.days = isSelected
        ? rule.days.filter((d) => d !== day)
        : [...rule.days, day].sort((a, b) => a - b);
      rules[ruleIndex] = rule;
      return { ...prev, dayRules: rules };
    });
  };

  const updateDayRule = (
    ruleIndex: number,
    patch: Partial<DayRuleForm>,
  ) => {
    setDiscountForm((prev) => {
      const rules = [...prev.dayRules];
      rules[ruleIndex] = { ...rules[ruleIndex], ...patch };
      return { ...prev, dayRules: rules };
    });
  };

  const addDayRule = () => {
    setDiscountForm((prev) => ({
      ...prev,
      dayScheduleEnabled: true,
      dayRules: [...prev.dayRules, emptyDayRule()],
    }));
  };

  const removeDayRule = (ruleIndex: number) => {
    setDiscountForm((prev) => ({
      ...prev,
      dayRules: prev.dayRules.filter((_, i) => i !== ruleIndex),
    }));
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Discount Management"
      description="Create and manage promotional discounts"
      onRefresh={() => discountsQuery.refetch()}
      isLoading={isRefreshing}
      actionButton={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            resetForm();
            setEditingDiscountId(null);
            setShowDiscountDrawer(true);
          }}
        >
          <span className="hidden sm:inline">Add Discount</span>
        </Button>
      }
    >
      {isInitialLoading ? (
        <AdminTableSkeleton columns={7} />
      ) : (
        <div className="space-y-8">
          <Card className="border-zinc-800" styles={{ body: { padding: 0 } }}>
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Flat discounts</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Standard promos (court types + validity). All day, any duration, any tier.
              </p>
            </div>
            <Table<Discount>
              rowKey="_id"
              columns={flatColumns}
              dataSource={sortedFlatDiscounts}
              onChange={handleTableChange}
              pagination={false}
              scroll={{ x: "max-content" }}
              locale={{
                emptyText:
                  "No flat discounts yet. Add one or create a rule-only discount below.",
              }}
            />
          </Card>

          <Card className="border-zinc-800" styles={{ body: { padding: 0 } }}>
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Time-based &amp; rules
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Booking length, peak/off-peak, or restricted hours. Scoped by court type only (same as public booking).
              </p>
            </div>
            <Table<Discount>
              rowKey="_id"
              columns={timeBasedColumns}
              dataSource={sortedTimeBasedDiscounts}
              onChange={handleTableChange}
              pagination={false}
              scroll={{ x: "max-content" }}
              locale={{
                emptyText:
                  "No time-based discounts. Add duration, tier, or hour rules in the drawer.",
              }}
            />
          </Card>
        </div>
      )}

      <Drawer
        title={editingDiscount ? "Edit discount" : "Add discount"}
        open={showDiscountDrawer}
        onClose={closeDiscountDrawer}
        width={672}
        destroyOnHidden
        footer={
          <Space className="flex justify-end">
            <Button onClick={closeDiscountDrawer}>Cancel</Button>
            <Button type="primary" loading={isSubmitting} onClick={handleDiscountSubmit}>
              {editingDiscount ? "Update Discount" : "Create Discount"}
            </Button>
          </Space>
        }
      >
        <Text type="secondary" className="mb-4 block">
          {editingDiscount
            ? "Update rules and value."
            : "Create a percentage or fixed promotion."}
        </Text>

        <Spin spinning={isLoadingEdit}>
          <Form layout="vertical" key={editingDiscount?._id ?? "new-discount"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item label="Discount Name" required>
                <Input
                  value={discountForm.name}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, name: e.target.value })
                  }
                  placeholder="Weekend Special"
                />
              </Form.Item>
              <Form.Item label="Promotion kind">
                <Select
                  value={discountForm.discountCategory}
                  onChange={(v) => {
                    const cat = v as DiscountCategory;
                    setDiscountForm((prev) => ({
                      ...prev,
                      discountCategory: cat,
                      ...(cat === "flat"
                        ? {
                            allDay: true,
                            tierDiscountMode: "uniform",
                            minBookingHours: "",
                            pricingTier: "any",
                          }
                        : {}),
                    }));
                  }}
                  options={[
                    { value: "flat", label: "Flat discount" },
                    { value: "time_based", label: "Time-based discount" },
                  ]}
                />
              </Form.Item>
            </div>

            {isTimeForm && (
              <Form.Item
                label="Time-based style"
                extra="Split applies different discounts to peak vs off-peak portions of the booking price."
              >
                <Select
                  value={discountForm.tierDiscountMode}
                  onChange={(v) =>
                    setDiscountForm({
                      ...discountForm,
                      tierDiscountMode: v as TierDiscountMode,
                    })
                  }
                  options={[
                    {
                      value: "uniform",
                      label: "Single rate (optional peak/off-peak start filter)",
                    },
                    {
                      value: "split",
                      label: "Separate peak & off-peak amounts",
                    },
                  ]}
                />
              </Form.Item>
            )}

            {(isFlatForm || isUniformTimeForm) && !discountForm.dayScheduleEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Form.Item label="Discount Type">
                  <Select
                    value={discountForm.type}
                    onChange={(v) =>
                      setDiscountForm({
                        ...discountForm,
                        type: v as "percentage" | "fixed",
                      })
                    }
                    options={[
                      { value: "percentage", label: "Percentage (%)" },
                      { value: "fixed", label: "Fixed Amount (PKR)" },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  label={
                    discountForm.type === "percentage"
                      ? "Discount Percentage"
                      : "Discount Amount (PKR)"
                  }
                  required
                >
                  <InputNumber
                    className="w-full"
                    min={0.01}
                    max={discountForm.type === "percentage" ? 100 : undefined}
                    step={0.01}
                    value={discountForm.value || undefined}
                    onChange={(v) =>
                      setDiscountForm({
                        ...discountForm,
                        value: typeof v === "number" ? v : 0,
                      })
                    }
                    placeholder={discountForm.type === "percentage" ? "30" : "1000"}
                    addonAfter={discountForm.type === "percentage" ? "%" : "PKR"}
                  />
                </Form.Item>
              </div>
            )}

            {!isSplitForm && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">
                      Different rate by day
                    </div>
                    <Text type="secondary" className="text-xs">
                      Match court peak/off-peak pricing. e.g. weekdays off-peak
                      PKR 1,500 off and peak PKR 2,500 off — different per day
                      group.
                    </Text>
                  </div>
                  <Switch
                    checked={discountForm.dayScheduleEnabled}
                    checkedChildren="Enabled"
                    unCheckedChildren="Enable"
                    onChange={(enabled) =>
                      setDiscountForm((prev) => ({
                        ...prev,
                        dayScheduleEnabled: enabled,
                        dayRules:
                          enabled && prev.dayRules.length === 0
                            ? [emptyDayRule()]
                            : prev.dayRules,
                      }))
                    }
                  />
                </div>

                {discountForm.dayScheduleEnabled && (
                  <div className="space-y-4">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => addDayRule()}
                    >
                      Add rule
                    </Button>

                    {discountForm.dayRules.map((rule, ruleIndex) => (
                      <div
                        key={ruleIndex}
                        className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            Rule {ruleIndex + 1}
                          </span>
                          {discountForm.dayRules.length > 1 && (
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => removeDayRule(ruleIndex)}
                            />
                          )}
                        </div>

                        <Space wrap size={[4, 4]}>
                          {DAY_LABELS.map((label, day) => {
                            const claimedElsewhere = getDaysClaimedByOtherRules(
                              discountForm.dayRules,
                              ruleIndex,
                            );
                            const isSelected = rule.days.includes(day);
                            const isDisabled =
                              !isSelected && claimedElsewhere.has(day);

                            return (
                              <Button
                                key={day}
                                size="small"
                                type={isSelected ? "primary" : "default"}
                                disabled={isDisabled}
                                title={
                                  isDisabled
                                    ? `${label} is already used in another rule`
                                    : undefined
                                }
                                onClick={() => toggleDayInRule(ruleIndex, day)}
                              >
                                {label}
                              </Button>
                            );
                          })}
                        </Space>

                        <Form.Item label="Rate style" className="mb-0">
                          <Select
                            size="small"
                            value={rule.rateMode}
                            onChange={(v) =>
                              updateDayRule(ruleIndex, {
                                rateMode: v as DayRuleRateMode,
                              })
                            }
                            options={[
                              { value: "uniform", label: "Same all day" },
                              {
                                value: "split",
                                label: "Peak & off-peak (uses court hours)",
                              },
                            ]}
                          />
                        </Form.Item>

                        {rule.rateMode === "uniform" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Form.Item label="Type" className="mb-0">
                              <Select
                                size="small"
                                value={rule.type}
                                onChange={(v) =>
                                  updateDayRule(ruleIndex, {
                                    type: v as "percentage" | "fixed",
                                  })
                                }
                                options={[
                                  { value: "percentage", label: "Percentage (%)" },
                                  { value: "fixed", label: "Fixed (PKR)" },
                                ]}
                              />
                            </Form.Item>
                            <Form.Item
                              label={
                                rule.type === "percentage"
                                  ? "Discount %"
                                  : "Amount off (PKR)"
                              }
                              className="mb-0"
                            >
                              <InputNumber
                                className="w-full"
                                size="small"
                                min={0.01}
                                max={rule.type === "percentage" ? 100 : undefined}
                                step={0.01}
                                value={rule.value || undefined}
                                onChange={(v) =>
                                  updateDayRule(ruleIndex, {
                                    value: typeof v === "number" ? v : 0,
                                  })
                                }
                                placeholder={rule.type === "percentage" ? "50" : "2500"}
                                addonAfter={rule.type === "percentage" ? "%" : "PKR"}
                              />
                            </Form.Item>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
                              <div className="text-xs font-semibold text-zinc-300">
                                Off-peak hours
                              </div>
                              <Select
                                size="small"
                                value={rule.offPeakType}
                                onChange={(v) =>
                                  updateDayRule(ruleIndex, {
                                    offPeakType: v as "percentage" | "fixed",
                                  })
                                }
                                options={[
                                  { value: "percentage", label: "%" },
                                  { value: "fixed", label: "PKR" },
                                ]}
                              />
                              <InputNumber
                                className="w-full"
                                size="small"
                                min={0.01}
                                max={
                                  rule.offPeakType === "percentage" ? 100 : undefined
                                }
                                step={0.01}
                                value={
                                  rule.offPeakValue === ""
                                    ? undefined
                                    : Number(rule.offPeakValue)
                                }
                                onChange={(v) =>
                                  updateDayRule(ruleIndex, {
                                    offPeakValue: v == null ? "" : v,
                                  })
                                }
                                placeholder="Optional"
                                addonAfter={
                                  rule.offPeakType === "percentage" ? "%" : "PKR"
                                }
                              />
                            </div>
                            <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
                              <div className="text-xs font-semibold text-zinc-300">
                                Peak hours
                              </div>
                              <Select
                                size="small"
                                value={rule.peakType}
                                onChange={(v) =>
                                  updateDayRule(ruleIndex, {
                                    peakType: v as "percentage" | "fixed",
                                  })
                                }
                                options={[
                                  { value: "percentage", label: "%" },
                                  { value: "fixed", label: "PKR" },
                                ]}
                              />
                              <InputNumber
                                className="w-full"
                                size="small"
                                min={0.01}
                                max={
                                  rule.peakType === "percentage" ? 100 : undefined
                                }
                                step={0.01}
                                value={
                                  rule.peakValue === ""
                                    ? undefined
                                    : Number(rule.peakValue)
                                }
                                onChange={(v) =>
                                  updateDayRule(ruleIndex, {
                                    peakValue: v == null ? "" : v,
                                  })
                                }
                                placeholder="Optional"
                                addonAfter={
                                  rule.peakType === "percentage" ? "%" : "PKR"
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isSplitForm && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                    Peak hours
                  </div>
                  <Form.Item label="Type" className="mb-2">
                    <Select
                      value={discountForm.peakType}
                      onChange={(v) =>
                        setDiscountForm({
                          ...discountForm,
                          peakType: v as "percentage" | "fixed",
                        })
                      }
                      options={[
                        { value: "percentage", label: "Percentage (%)" },
                        { value: "fixed", label: "Fixed (PKR)" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="Amount" className="mb-0">
                    <InputNumber
                      className="w-full"
                      min={0.01}
                      max={
                        discountForm.peakType === "percentage" ? 100 : undefined
                      }
                      step={0.01}
                      value={
                        discountForm.peakValue === ""
                          ? undefined
                          : Number(discountForm.peakValue)
                      }
                      onChange={(v) =>
                        setDiscountForm({
                          ...discountForm,
                          peakValue: v == null ? "" : v,
                        })
                      }
                      placeholder="Optional"
                      addonAfter={
                        discountForm.peakType === "percentage" ? "%" : "PKR"
                      }
                    />
                  </Form.Item>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                    Off-peak hours
                  </div>
                  <Form.Item label="Type" className="mb-2">
                    <Select
                      value={discountForm.offPeakType}
                      onChange={(v) =>
                        setDiscountForm({
                          ...discountForm,
                          offPeakType: v as "percentage" | "fixed",
                        })
                      }
                      options={[
                        { value: "percentage", label: "Percentage (%)" },
                        { value: "fixed", label: "Fixed (PKR)" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="Amount" className="mb-0">
                    <InputNumber
                      className="w-full"
                      min={0.01}
                      max={
                        discountForm.offPeakType === "percentage"
                          ? 100
                          : undefined
                      }
                      step={0.01}
                      value={
                        discountForm.offPeakValue === ""
                          ? undefined
                          : Number(discountForm.offPeakValue)
                      }
                      onChange={(v) =>
                        setDiscountForm({
                          ...discountForm,
                          offPeakValue: v == null ? "" : v,
                        })
                      }
                      placeholder="Optional"
                      addonAfter={
                        discountForm.offPeakType === "percentage" ? "%" : "PKR"
                      }
                    />
                  </Form.Item>
                </div>
              </div>
            )}

            <Form.Item label="Apply to Court Types">
              <Space wrap>
                <Button
                  size="small"
                  type={discountForm.courtTypes.length === 0 ? "primary" : "default"}
                  onClick={() =>
                    setDiscountForm({ ...discountForm, courtTypes: [] })
                  }
                >
                  All Courts
                </Button>
                {COURT_TYPES.map((ct) => (
                  <Button
                    key={ct}
                    size="small"
                    type={
                      discountForm.courtTypes.includes(ct) ? "primary" : "default"
                    }
                    onClick={() => handleCourtTypeToggle(ct)}
                  >
                    {ct}
                  </Button>
                ))}
              </Space>
              <Text type="secondary" className="mt-2 block text-xs">
                {discountForm.courtTypes.length === 0
                  ? "Discount applies to all court types"
                  : `Discount applies to: ${discountForm.courtTypes.join(", ")}`}
              </Text>
            </Form.Item>

            {isTimeForm && (
              <>
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    isUniformTimeForm ? "sm:grid-cols-2" : ""
                  }`}
                >
                  <Form.Item label="Min booking (h)">
                    <InputNumber
                      className="w-full"
                      min={0.5}
                      step={0.5}
                      placeholder="Any"
                      value={
                        discountForm.minBookingHours === ""
                          ? undefined
                          : Number(discountForm.minBookingHours)
                      }
                      onChange={(v) =>
                        setDiscountForm({
                          ...discountForm,
                          minBookingHours: v == null ? "" : v,
                        })
                      }
                    />
                  </Form.Item>
                  {isUniformTimeForm && (
                    <Form.Item label="Booking start tier">
                      <Select
                        value={discountForm.pricingTier}
                        onChange={(v) =>
                          setDiscountForm({
                            ...discountForm,
                            pricingTier: v as DiscountPricingTier,
                          })
                        }
                        options={[
                          { value: "any", label: "Any (ignore tier)" },
                          { value: "peak", label: "Peak start only" },
                          { value: "off_peak", label: "Off-peak start only" },
                        ]}
                      />
                    </Form.Item>
                  )}
                </div>

                <Form.Item label="Promo hours">
                  <Checkbox
                    checked={discountForm.allDay}
                    onChange={(e) =>
                      setDiscountForm({
                        ...discountForm,
                        allDay: e.target.checked,
                      })
                    }
                  >
                    All day (no clock restriction)
                  </Checkbox>
                  {!discountForm.allDay && (
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <Form.Item label="Start Hour" className="mb-0">
                        <Select
                          value={discountForm.startHour}
                          onChange={(v) =>
                            setDiscountForm({
                              ...discountForm,
                              startHour: v,
                            })
                          }
                          options={hourOptions}
                        />
                      </Form.Item>
                      <Form.Item label="End Hour" className="mb-0">
                        <Select
                          value={discountForm.endHour}
                          onChange={(v) =>
                            setDiscountForm({
                              ...discountForm,
                              endHour: v,
                            })
                          }
                          options={hourOptions}
                        />
                      </Form.Item>
                    </div>
                  )}
                </Form.Item>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item label="Valid From">
                <DatePicker
                  className="w-full"
                  value={
                    discountForm.validFrom
                      ? dayjs(discountForm.validFrom)
                      : null
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
          </Form>
        </Spin>
      </Drawer>

      <Modal
        title="Delete Discount"
        open={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletingDiscount(null);
        }}
        onOk={confirmDelete}
        okText="Yes, Delete Discount"
        okButtonProps={{ danger: true, loading: isDeleting }}
        cancelButtonProps={{ disabled: isDeleting }}
      >
        <Text type="secondary" className="mb-4 block">
          Are you sure you want to delete this discount? This action cannot be
          undone.
        </Text>
        {deletingDiscount && (
          <div className="space-y-2 rounded-lg bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <Text type="secondary">Name:</Text>
              <Text className="font-medium text-white">
                {deletingDiscount.name}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">Value:</Text>
              <Text>
                {formatDiscountValue(
                  deletingDiscount.type,
                  deletingDiscount.value,
                )}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">Courts:</Text>
              <Text>{formatCourtTypes(deletingDiscount.courtTypes)}</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">Status:</Text>
              {getStatusTag(deletingDiscount)}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

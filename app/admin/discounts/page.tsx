"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Percent,
  DollarSign,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import {
  getDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  toggleDiscountActive,
} from "@/app/actions/discounts";
import {
  formatDiscountValue,
  formatTimeRestriction,
  formatCourtTypes,
  formatBookingDurationRange,
  formatPricingTierLabel,
  formatTierDiscountSummary,
  formatDiscountValueSummary,
  isDiscountCurrentlyActive,
  inferDiscountCategory,
  inferTierDiscountMode,
  usesTierSplitDiscount,
  DAY_LABELS,
} from "@/lib/discount-utils";
import { cn, formatLocalDate } from "@/lib/utils";
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from "@/lib/date-time";
import type {
  Discount,
  CourtType,
  DiscountPricingTier,
  DiscountCategory,
  TierDiscountMode,
} from "@/types";

const COURT_TYPES: CourtType[] = ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"];

type DayRuleForm = {
  days: number[];
  type: "percentage" | "fixed";
  value: number;
};

const emptyDayRule = (): DayRuleForm => ({
  days: [],
  type: "percentage",
  value: 0,
});

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
    .map((r) => ({
      days: [...r.days]
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .sort((a, b) => a - b),
      type: (r.type === "fixed" ? "fixed" : "percentage") as
        | "percentage"
        | "fixed",
      value: Number(r.value) || 0,
    }))
    .filter((r) => r.days.length > 0 && r.value > 0);
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
  payload: DayRuleForm[] | null,
): DayRuleForm[] | null | undefined {
  if (enabled) return payload;
  if (editing && normalizeDayRulesFromDiscount(editing.dayRules).length > 0) {
    return null;
  }
  return undefined;
}

export default function DiscountsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscountDrawer, setShowDiscountDrawer] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDiscount, setDeletingDiscount] = useState<Discount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Discount | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  useEffect(() => {
    if (session) {
      if (!isAdmin) {
        router.push("/admin/bookings");
        return;
      }
      loadData();
    }
  }, [session, isAdmin, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const discountResult = await getDiscounts();
      if (discountResult.success) {
        setDiscounts(discountResult.discounts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!discountForm.validFrom || !discountForm.validUntil) {
      alert("Please select valid from and valid until dates");
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
      alert("Add at least one peak or off-peak discount amount");
      return;
    }

    let dayRulesPayload: DayRuleForm[] | null = null;
    if (discountForm.dayScheduleEnabled) {
      if (isSplit) {
        alert("Day-based rates cannot be combined with peak/off-peak split");
        return;
      }
      dayRulesPayload = discountForm.dayRules.filter(
        (r) => r.days.length > 0 && r.value > 0,
      );
      if (dayRulesPayload.length === 0) {
        alert("Add at least one day rule with selected days and a discount amount");
        return;
      }
      const seen = new Set<number>();
      for (const rule of dayRulesPayload) {
        for (const d of rule.days) {
          if (seen.has(d)) {
            alert(`${DAY_LABELS[d]} appears in more than one day rule`);
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

    setIsSubmitting(true);

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
          result = await updateDiscount({
            ...baseUpdate,
            type: primaryRule?.type ?? discountForm.type,
            value: primaryRule?.value ?? discountForm.value,
            ...(dayRulesUpdate !== undefined ? { dayRules: dayRulesUpdate } : {}),
          });
        } else if (isSplit) {
          result = await updateDiscount({
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
          result = await updateDiscount({
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
          resetForm();
          loadData();
        } else {
          alert(result.error || "Failed to update discount");
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
          result = await createDiscount({
            ...commonCreate,
            discountCategory: "flat",
            type: primaryRule?.type ?? discountForm.type,
            value: primaryRule?.value ?? discountForm.value,
            allDay: true,
            dayRules: discountForm.dayScheduleEnabled ? dayRulesPayload ?? undefined : undefined,
          });
        } else if (isSplit) {
          result = await createDiscount({
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
          result = await createDiscount({
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
          loadData();
        } else {
          alert(result.error || "Failed to create discount");
        }
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
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

  const handleEdit = async (discount: Discount) => {
    const discountId = String(discount._id);
    setEditingDiscount(discount);
    setDiscountForm(discountToFormState(discount));
    setShowDiscountDrawer(true);
    setIsLoadingEdit(true);

    try {
      const result = await getDiscountById(discountId);
      if (result.success && result.discount) {
        const fresh = result.discount as Discount;
        setEditingDiscount(fresh);
        setDiscountForm(discountToFormState(fresh));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleDelete = (discount: Discount) => {
    setDeletingDiscount(discount);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingDiscount) return;

    setIsDeleting(true);
    try {
      const result = await deleteDiscount(deletingDiscount._id);
      if (result.success) {
        setShowDeleteModal(false);
        setDeletingDiscount(null);
        loadData();
      } else {
        alert(result.error || "Failed to delete discount");
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (discount: Discount) => {
    setIsToggling(discount._id);
    try {
      const result = await toggleDiscountActive(discount._id);
      if (result.success) {
        loadData();
      } else {
        alert(result.error || "Failed to toggle discount status");
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsToggling(null);
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

  const handleSort = (column: keyof Discount) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
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

  const SortIcon = ({ column }: { column: keyof Discount }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    );
  };

  const getStatusBadge = (discount: Discount) => {
    const isCurrentlyActive = isDiscountCurrentlyActive(discount);
    
    if (!discount.isActive) {
      return (
        <Badge
          variant="outline"
          className="bg-zinc-700/20 border-zinc-600 text-zinc-400 text-xs"
        >
          Disabled
        </Badge>
      );
    }
    
    if (isCurrentlyActive) {
      return (
        <Badge
          variant="outline"
          className="bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF] text-xs"
        >
          Live
        </Badge>
      );
    }
    
    const nowKey = toDateKeyInTimezone(new Date(), BUSINESS_TIMEZONE);
    const validFromKey = toDateKeyInTimezone(
      new Date(discount.validFrom),
      BUSINESS_TIMEZONE,
    );

    if (nowKey < validFromKey) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400 text-xs"
        >
          Scheduled
        </Badge>
      );
    }
    
    return (
      <Badge
        variant="outline"
        className="bg-red-500/20 border-red-500/50 text-red-400 text-xs"
      >
        Expired
      </Badge>
    );
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
      onRefresh={loadData}
      isLoading={isLoading}
      actionButton={
        <Button
          onClick={() => {
            resetForm();
            setShowDiscountDrawer(true);
          }}
          className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6] w-full sm:w-auto text-xs sm:text-sm"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Discount</span>
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Flat discounts — percentage/fixed without duration, tier, or clock rules */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardContent className="p-0">
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Flat discounts</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Standard promos (court types + validity). All day, any duration, any tier.
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead
                      className="min-w-[180px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        <SortIcon column="name" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        <SortIcon column="type" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("value")}
                    >
                      <div className="flex items-center">
                        Value
                        <SortIcon column="value" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[120px]">Types</TableHead>
                    <TableHead className="min-w-[200px]">Valid Period</TableHead>
                    <TableHead
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("isActive")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon column="isActive" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right min-w-[140px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <TableRow key={i} className="border-zinc-800">
                          {[...Array(7)].map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  ) : sortedFlatDiscounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-zinc-400 py-8"
                      >
                        No flat discounts yet. Add one or create a rule-only discount below.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFlatDiscounts.map((discount) => (
                      <TableRow key={discount._id} className="border-zinc-800">
                        <TableCell>
                          <div className="font-medium text-white text-sm">
                            {discount.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs"
                          >
                            {discount.type === "percentage" ? (
                              <Percent className="w-3 h-3 mr-1" />
                            ) : (
                              <DollarSign className="w-3 h-3 mr-1" />
                            )}
                            {discount.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-[#2DD4BF] font-semibold text-sm">
                            {formatDiscountValueSummary(discount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-300 text-sm">
                            {formatCourtTypes(discount.courtTypes)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-zinc-300 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              {new Date(discount.validFrom).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(discount.validUntil).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(discount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(discount)}
                              disabled={isToggling === discount._id}
                              className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                              title={
                                discount.isActive ? "Disable" : "Enable"
                              }
                            >
                              {isToggling === discount._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : discount.isActive ? (
                                <ToggleRight className="w-4 h-4 text-[#2DD4BF]" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(discount)}
                              className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(discount)}
                              className="text-zinc-400 hover:text-red-400 h-8 w-8"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Time-based & rules */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardContent className="p-0">
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Time-based &amp; rules
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Booking length, peak/off-peak, or restricted hours. Scoped by court type only (same as public booking).
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead
                      className="min-w-[180px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        <SortIcon column="name" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        <SortIcon column="type" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("value")}
                    >
                      <div className="flex items-center">
                        Value
                        <SortIcon column="value" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[120px]">Types</TableHead>
                    <TableHead className="min-w-[100px]">Length</TableHead>
                    <TableHead className="min-w-[90px]">Tier</TableHead>
                    <TableHead className="min-w-[120px]">Time</TableHead>
                    <TableHead className="min-w-[200px]">Valid Period</TableHead>
                    <TableHead
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("isActive")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon column="isActive" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right min-w-[140px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-zinc-800">
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : sortedTimeBasedDiscounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-zinc-400 py-8"
                      >
                        No time-based discounts. Add duration, tier, or hour rules in the drawer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTimeBasedDiscounts.map((discount) => (
                      <TableRow key={discount._id} className="border-zinc-800">
                        <TableCell>
                          <div className="font-medium text-white text-sm">
                            {discount.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs"
                          >
                            {usesTierSplitDiscount(discount) ? (
                              <>
                                <Percent className="w-3 h-3 mr-1 opacity-70" />
                                mixed
                              </>
                            ) : discount.type === "percentage" ? (
                              <>
                                <Percent className="w-3 h-3 mr-1" />
                                {discount.type}
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-3 h-3 mr-1" />
                                {discount.type}
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-[#2DD4BF] font-semibold text-sm">
                            {formatDiscountValueSummary(discount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-300 text-sm">
                            {formatCourtTypes(discount.courtTypes)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-300 text-sm whitespace-nowrap">
                            {formatBookingDurationRange(
                              discount.minBookingHours,
                              discount.maxBookingHours
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-300 text-sm">
                            {usesTierSplitDiscount(discount)
                              ? "Any start (split)"
                              : formatPricingTierLabel(discount.pricingTier)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-300 text-sm">
                            {formatTimeRestriction(
                              discount.allDay,
                              discount.startHour,
                              discount.endHour
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-zinc-300 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              {new Date(discount.validFrom).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(discount.validUntil).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(discount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(discount)}
                              disabled={isToggling === discount._id}
                              className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                              title={
                                discount.isActive ? "Disable" : "Enable"
                              }
                            >
                              {isToggling === discount._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : discount.isActive ? (
                                <ToggleRight className="w-4 h-4 text-[#2DD4BF]" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(discount)}
                              className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(discount)}
                              className="text-zinc-400 hover:text-red-400 h-8 w-8"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discount drawer */}
      <Sheet
        open={showDiscountDrawer}
        onOpenChange={(open) => {
          setShowDiscountDrawer(open);
          if (!open) {
            setEditingDiscount(null);
            setIsLoadingEdit(false);
            resetForm();
          }
        }}
      >
        <SheetContent className="border-zinc-800 flex w-full flex-col p-0 sm:max-w-xl md:max-w-2xl">
          <div className="flex flex-1 flex-col min-h-0">
            <SheetHeader className="border-b border-zinc-800 px-6 py-4 shrink-0">
              <SheetTitle>
                {editingDiscount ? "Edit discount" : "Add discount"}
              </SheetTitle>
              <SheetDescription>
                {editingDiscount
                  ? "Update rules and value."
                  : "Create a percentage or fixed promotion."}
              </SheetDescription>
            </SheetHeader>
          <form
            key={editingDiscount?._id ?? "new-discount"}
            onSubmit={handleDiscountSubmit}
            className="flex flex-1 flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative">
            {isLoadingEdit && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 rounded-md">
                <Loader2 className="w-6 h-6 animate-spin text-[#2DD4BF]" />
              </div>
            )}
            {/* Name & promotion kind */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-name" className="text-zinc-200 text-sm">
                  Discount Name
                </Label>
                <Input
                  id="discount-name"
                  type="text"
                  required
                  value={discountForm.name}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, name: e.target.value })
                  }
                  placeholder="Weekend Special"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-200 text-sm">Promotion kind</Label>
                <Select
                  value={discountForm.discountCategory}
                  onValueChange={(v) => {
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
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat discount</SelectItem>
                    <SelectItem value="time_based">Time-based discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isTimeForm && (
              <div className="space-y-2">
                <Label className="text-zinc-200 text-sm">
                  Time-based style
                </Label>
                <Select
                  value={discountForm.tierDiscountMode}
                  onValueChange={(v) =>
                    setDiscountForm({
                      ...discountForm,
                      tierDiscountMode: v as TierDiscountMode,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform">
                      Single rate (optional peak/off-peak start filter)
                    </SelectItem>
                    <SelectItem value="split">
                      Separate peak &amp; off-peak amounts
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-zinc-500 text-xs">
                  Split applies different discounts to peak vs off-peak portions of
                  the booking price.
                </p>
              </div>
            )}

            {(isFlatForm || isUniformTimeForm) && !discountForm.dayScheduleEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-type" className="text-zinc-200 text-sm">
                    Discount Type
                  </Label>
                  <Select
                    value={discountForm.type}
                    onValueChange={(v) =>
                      setDiscountForm({
                        ...discountForm,
                        type: v as "percentage" | "fixed",
                      })
                    }
                  >
                    <SelectTrigger id="discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (PKR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-value" className="text-zinc-200 text-sm">
                    {discountForm.type === "percentage"
                      ? "Discount Percentage"
                      : "Discount Amount (PKR)"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="discount-value"
                      type="number"
                      required
                      min="0.01"
                      max={discountForm.type === "percentage" ? 100 : undefined}
                      step="0.01"
                      value={discountForm.value || ""}
                      onChange={(e) =>
                        setDiscountForm({
                          ...discountForm,
                          value: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder={
                        discountForm.type === "percentage" ? "30" : "1000"
                      }
                      className="text-sm pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                      {discountForm.type === "percentage" ? "%" : "PKR"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!isSplitForm && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">
                      Different rate by day
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      e.g. weekdays PKR 2,500 off, weekends PKR 2,000 off — or
                      Wednesday 50% only.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={discountForm.dayScheduleEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setDiscountForm((prev) => {
                        const enabled = !prev.dayScheduleEnabled;
                        return {
                          ...prev,
                          dayScheduleEnabled: enabled,
                          dayRules:
                            enabled && prev.dayRules.length === 0
                              ? [emptyDayRule()]
                              : prev.dayRules,
                        };
                      })
                    }
                  >
                    {discountForm.dayScheduleEnabled ? "Enabled" : "Enable"}
                  </Button>
                </div>

                {discountForm.dayScheduleEnabled && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDayRule()}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add rule
                      </Button>
                    </div>

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
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:text-red-400"
                              onClick={() => removeDayRule(ruleIndex)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
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
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                disabled={isDisabled}
                                title={
                                  isDisabled
                                    ? `${label} is already used in another rule`
                                    : undefined
                                }
                                className={cn(
                                  "h-7 px-2 text-xs min-w-[2.5rem]",
                                  isDisabled &&
                                    "opacity-40 cursor-not-allowed hover:bg-transparent",
                                )}
                                onClick={() => toggleDayInRule(ruleIndex, day)}
                              >
                                {label}
                              </Button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-zinc-400 text-xs">Type</Label>
                            <Select
                              value={rule.type}
                              onValueChange={(v) =>
                                updateDayRule(ruleIndex, {
                                  type: v as "percentage" | "fixed",
                                })
                              }
                            >
                              <SelectTrigger className="text-sm h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">
                                  Percentage (%)
                                </SelectItem>
                                <SelectItem value="fixed">Fixed (PKR)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-zinc-400 text-xs">
                              {rule.type === "percentage"
                                ? "Discount %"
                                : "Amount off (PKR)"}
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0.01"
                                max={rule.type === "percentage" ? 100 : undefined}
                                step="0.01"
                                value={rule.value || ""}
                                onChange={(e) =>
                                  updateDayRule(ruleIndex, {
                                    value: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder={
                                  rule.type === "percentage" ? "50" : "2500"
                                }
                                className="text-sm pr-12 h-9"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                                {rule.type === "percentage" ? "%" : "PKR"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isSplitForm && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                    Peak hours
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs">Type</Label>
                    <Select
                      value={discountForm.peakType}
                      onValueChange={(v) =>
                        setDiscountForm({
                          ...discountForm,
                          peakType: v as "percentage" | "fixed",
                        })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed (PKR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs">Amount</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0.01"
                        max={
                          discountForm.peakType === "percentage" ? 100 : undefined
                        }
                        step="0.01"
                        value={
                          discountForm.peakValue === ""
                            ? ""
                            : discountForm.peakValue
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDiscountForm({
                            ...discountForm,
                            peakValue:
                              raw === "" ? "" : parseFloat(raw) || 0,
                          });
                        }}
                        placeholder="Optional"
                        className="text-sm pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                        {discountForm.peakType === "percentage" ? "%" : "PKR"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                    Off-peak hours
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs">Type</Label>
                    <Select
                      value={discountForm.offPeakType}
                      onValueChange={(v) =>
                        setDiscountForm({
                          ...discountForm,
                          offPeakType: v as "percentage" | "fixed",
                        })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed (PKR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 text-xs">Amount</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0.01"
                        max={
                          discountForm.offPeakType === "percentage"
                            ? 100
                            : undefined
                        }
                        step="0.01"
                        value={
                          discountForm.offPeakValue === ""
                            ? ""
                            : discountForm.offPeakValue
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDiscountForm({
                            ...discountForm,
                            offPeakValue:
                              raw === "" ? "" : parseFloat(raw) || 0,
                          });
                        }}
                        placeholder="Optional"
                        className="text-sm pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                        {discountForm.offPeakType === "percentage" ? "%" : "PKR"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Court Types */}
            <div className="space-y-2">
              <Label className="text-zinc-200 text-sm">
                Apply to Court Types
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    discountForm.courtTypes.length === 0 ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setDiscountForm({ ...discountForm, courtTypes: [] })
                  }
                  className={
                    discountForm.courtTypes.length === 0
                      ? "bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                      : ""
                  }
                >
                  All Courts
                </Button>
                {COURT_TYPES.map((ct) => (
                  <Button
                    key={ct}
                    type="button"
                    variant={
                      discountForm.courtTypes.includes(ct) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleCourtTypeToggle(ct)}
                    className={
                      discountForm.courtTypes.includes(ct)
                        ? "bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                        : ""
                    }
                  >
                    {ct}
                  </Button>
                ))}
              </div>
              <p className="text-zinc-500 text-xs">
                {discountForm.courtTypes.length === 0
                  ? "Discount applies to all court types"
                  : `Discount applies to: ${discountForm.courtTypes.join(", ")}`}
              </p>
            </div>

            {isTimeForm && (
              <>
                {/* Min booking & optional start-tier filter (uniform only) */}
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    isUniformTimeForm ? "sm:grid-cols-2" : ""
                  }`}
                >
                  <div className="space-y-2">
                    <Label className="text-zinc-200 text-sm">Min booking (h)</Label>
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      placeholder="Any"
                      value={
                        discountForm.minBookingHours === ""
                          ? ""
                          : discountForm.minBookingHours
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setDiscountForm({
                          ...discountForm,
                          minBookingHours: v === "" ? "" : parseFloat(v),
                        });
                      }}
                      className="text-sm"
                    />
                  </div>
                  {isUniformTimeForm && (
                    <div className="space-y-2">
                      <Label className="text-zinc-200 text-sm">
                        Booking start tier
                      </Label>
                      <Select
                        value={discountForm.pricingTier}
                        onValueChange={(v) =>
                          setDiscountForm({
                            ...discountForm,
                            pricingTier: v as DiscountPricingTier,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any (ignore tier)</SelectItem>
                          <SelectItem value="peak">Peak start only</SelectItem>
                          <SelectItem value="off_peak">
                            Off-peak start only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Clock window for when this promo runs */}
                <div className="space-y-2">
                  <Label className="text-zinc-200 text-sm">Promo hours</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="all-day"
                      checked={discountForm.allDay}
                      onChange={(e) =>
                        setDiscountForm({
                          ...discountForm,
                          allDay: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#2DD4BF] focus:ring-[#2DD4BF] focus:ring-2 accent-[#2DD4BF] cursor-pointer"
                    />
                    <Label
                      htmlFor="all-day"
                      className="cursor-pointer text-zinc-200 text-sm"
                    >
                      All day (no clock restriction)
                    </Label>
                  </div>
                  {!discountForm.allDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">Start Hour</Label>
                        <Select
                          value={discountForm.startHour.toString()}
                          onValueChange={(v) =>
                            setDiscountForm({
                              ...discountForm,
                              startHour: parseInt(v),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i === 0
                                  ? "12 AM"
                                  : i === 12
                                  ? "12 PM"
                                  : i < 12
                                  ? `${i} AM`
                                  : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">End Hour</Label>
                        <Select
                          value={discountForm.endHour.toString()}
                          onValueChange={(v) =>
                            setDiscountForm({
                              ...discountForm,
                              endHour: parseInt(v),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i === 0
                                  ? "12 AM"
                                  : i === 12
                                  ? "12 PM"
                                  : i < 12
                                  ? `${i} AM`
                                  : `${i - 12} PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Validity Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-200 text-sm">
                  Valid From
                </Label>
                <DatePicker
                  date={discountForm.validFrom}
                  onDateChange={(date) =>
                    setDiscountForm({ ...discountForm, validFrom: date })
                  }
                  variant="admin"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-200 text-sm">
                  Valid Until
                </Label>
                <DatePicker
                  date={discountForm.validUntil}
                  onDateChange={(date) =>
                    setDiscountForm({ ...discountForm, validUntil: date })
                  }
                  minDate={discountForm.validFrom}
                  variant="admin"
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active"
                checked={discountForm.isActive}
                onChange={(e) =>
                  setDiscountForm({ ...discountForm, isActive: e.target.checked })
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#2DD4BF] focus:ring-[#2DD4BF] focus:ring-2 accent-[#2DD4BF] cursor-pointer"
              />
              <Label
                htmlFor="is-active"
                className="cursor-pointer text-zinc-200 text-sm"
              >
                Active (discount will be applied when conditions match)
              </Label>
            </div>
            </div>

            <SheetFooter className="bg-zinc-950 px-6 pb-6 pt-4 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDiscountDrawer(false);
                  resetForm();
                  setEditingDiscount(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingDiscount ? "Updating..." : "Creating..."}
                  </>
                ) : editingDiscount ? (
                  "Update Discount"
                ) : (
                  "Create Discount"
                )}
              </Button>
            </SheetFooter>
          </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Discount</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete this discount? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingDiscount && (
            <div className="space-y-4 py-4">
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Name:</span>
                  <span className="text-white text-sm font-medium">
                    {deletingDiscount.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Value:</span>
                  <span className="text-white text-sm">
                    {formatDiscountValue(
                      deletingDiscount.type,
                      deletingDiscount.value
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Courts:</span>
                  <span className="text-white text-sm">
                    {formatCourtTypes(deletingDiscount.courtTypes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Status:</span>
                  {getStatusBadge(deletingDiscount)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingDiscount(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete Discount"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

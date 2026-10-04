"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import type { TableProps } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { DiscountTables } from "@/components/admin/discounts/DiscountTables";
import { DiscountFormDrawer } from "@/components/admin/discounts/DiscountFormDrawer";
import { DeleteDiscountModal } from "@/components/admin/discounts/DeleteDiscountModal";
import {
  createEmptyDiscountForm,
  dayRuleFormToInput,
  dayRulesForUpdate,
  discountToFormState,
  type DiscountFormState,
} from "@/components/admin/discounts/discountHelpers";
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
  inferDiscountCategory,
  DAY_LABELS,
} from "@/lib/discount-utils";
import { formatLocalDate } from "@/lib/utils";
import type { Discount } from "@/types";

export default function DiscountsPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  const discountsQuery = useDiscounts({ enabled: !!session && isAdmin });
  const { isInitialLoading, isRefreshing } =
    getQueryLoadingState(discountsQuery);
  const discounts = (discountsQuery.data ?? []) as Discount[];

  const createDiscountMutation = useCreateDiscountMutation();
  const updateDiscountMutation = useUpdateDiscountMutation();
  const deleteDiscountMutation = useDeleteDiscountMutation();
  const toggleDiscountActiveMutation = useToggleDiscountActiveMutation();

  const [showDiscountDrawer, setShowDiscountDrawer] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(
    null,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDiscount, setDeletingDiscount] = useState<Discount | null>(
    null,
  );
  const [sortColumn, setSortColumn] = useState<keyof Discount | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const discountByIdQuery = useDiscountById(editingDiscountId, {
    enabled: showDiscountDrawer && !!editingDiscountId,
  });
  const { isInitialLoading: isLoadingEdit } =
    getQueryLoadingState(discountByIdQuery);

  const [discountForm, setDiscountForm] = useState<DiscountFormState>(
    createEmptyDiscountForm,
  );

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

  const resetForm = () => {
    setDiscountForm(createEmptyDiscountForm());
  };

  const closeDiscountDrawer = () => {
    setShowDiscountDrawer(false);
    setEditingDiscount(null);
    setEditingDiscountId(null);
    resetForm();
  };

  const handleDiscountSubmit = async () => {
    if (!discountForm.validFrom || !discountForm.validUntil) {
      message.warning("Please select valid from and valid until dates");
      return;
    }

    const isFlat = discountForm.discountCategory === "flat";
    const isSplit = !isFlat && discountForm.tierDiscountMode === "split";

    const peakSlice =
      discountForm.peakValue === "" || Number(discountForm.peakValue) <= 0
        ? undefined
        : {
            type: discountForm.peakType,
            value: Number(discountForm.peakValue),
          };
    const offPeakSlice =
      discountForm.offPeakValue === "" ||
      Number(discountForm.offPeakValue) <= 0
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
        message.warning(
          "Day-based rates cannot be combined with peak/off-peak split",
        );
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
            ...(dayRulesUpdate !== undefined
              ? { dayRules: dayRulesUpdate }
              : {}),
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
            ...(dayRulesUpdate !== undefined
              ? { dayRules: dayRulesUpdate }
              : {}),
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
            dayRules: discountForm.dayScheduleEnabled
              ? (dayRulesPayload ?? undefined)
              : undefined,
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
            dayRules: discountForm.dayScheduleEnabled
              ? (dayRulesPayload ?? undefined)
              : undefined,
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
        <DiscountTables
          flatDiscounts={sortedFlatDiscounts}
          timeBasedDiscounts={sortedTimeBasedDiscounts}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          togglingDiscountId={togglingDiscountId}
          onTableChange={handleTableChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}

      <DiscountFormDrawer
        open={showDiscountDrawer}
        editingDiscount={editingDiscount}
        isLoadingEdit={isLoadingEdit}
        isSubmitting={isSubmitting}
        discountForm={discountForm}
        setDiscountForm={setDiscountForm}
        onClose={closeDiscountDrawer}
        onSubmit={handleDiscountSubmit}
      />

      <DeleteDiscountModal
        open={showDeleteModal}
        discount={deletingDiscount}
        isDeleting={isDeleting}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletingDiscount(null);
        }}
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}

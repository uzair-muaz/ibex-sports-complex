"use client";

import React, { useState, useEffect } from "react";
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
  Clock,
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
  createDiscount,
  updateDiscount,
  deleteDiscount,
  toggleDiscountActive,
} from "@/app/actions/discounts";
import {
  formatDiscountValue,
  formatTimeRestriction,
  formatCourtTypes,
  isDiscountCurrentlyActive,
} from "@/lib/discount-utils";
import { formatLocalDate } from "@/lib/utils";
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from "@/lib/date-time";
import type { Discount, CourtType } from "@/types";

const COURT_TYPES: CourtType[] = ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"];

export default function DiscountsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDiscount, setDeletingDiscount] = useState<Discount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Discount | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [discountForm, setDiscountForm] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed",
    value: 0,
    courtTypes: [] as CourtType[],
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
      const result = await getDiscounts();
      if (result.success) {
        setDiscounts(result.discounts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates
    if (!discountForm.validFrom || !discountForm.validUntil) {
      alert("Please select valid from and valid until dates");
      return;
    }
    
    setIsSubmitting(true);

    // Convert Date objects to local date strings (YYYY-MM-DD)
    // so business-day boundaries are interpreted correctly.
    const formData = {
      ...discountForm,
      validFrom: formatLocalDate(discountForm.validFrom),
      validUntil: formatLocalDate(discountForm.validUntil),
    };

    try {
      if (editingDiscount) {
        const result = await updateDiscount({
          discountId: editingDiscount._id,
          ...formData,
        });

        if (result.success) {
          setShowDiscountModal(false);
          setEditingDiscount(null);
          resetForm();
          loadData();
        } else {
          alert(result.error || "Failed to update discount");
        }
      } else {
        const result = await createDiscount(formData);

        if (result.success) {
          setShowDiscountModal(false);
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
      type: "percentage",
      value: 0,
      courtTypes: [],
      allDay: true,
      startHour: 6,
      endHour: 23,
      validFrom: today,
      validUntil: nextMonth,
      isActive: true,
    });
    setEditingDiscount(null);
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setDiscountForm({
      name: discount.name,
      type: discount.type,
      value: discount.value,
      courtTypes: discount.courtTypes,
      allDay: discount.allDay,
      startHour: discount.startHour,
      endHour: discount.endHour,
      validFrom: new Date(discount.validFrom),
      validUntil: new Date(discount.validUntil),
      isActive: discount.isActive,
    });
    setShowDiscountModal(true);
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

  const sortedDiscounts = [...discounts].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = a[sortColumn];
    let bValue: any = b[sortColumn];

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

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

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
            setShowDiscountModal(true);
          }}
          className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6] w-full sm:w-auto text-xs sm:text-sm"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Discount</span>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="border-zinc-800 bg-zinc-950">
          <CardContent className="p-0">
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
                    <TableHead className="min-w-[140px]">Courts</TableHead>
                    <TableHead className="min-w-[120px]">Hours</TableHead>
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
                  ) : sortedDiscounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-zinc-400 py-8"
                      >
                        No discounts found. Create your first discount to get
                        started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedDiscounts.map((discount) => (
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
                            {formatDiscountValue(discount.type, discount.value)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-300 text-sm">
                            {formatCourtTypes(discount.courtTypes)}
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

      {/* Discount Modal */}
      <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingDiscount ? "Edit Discount" : "Add New Discount"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingDiscount
                ? "Update discount details and settings"
                : "Create a new promotional discount"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDiscountSubmit} className="space-y-4">
            {/* Name and Type */}
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (PKR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Value */}
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
                  placeholder={discountForm.type === "percentage" ? "30" : "1000"}
                  className="text-sm pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                  {discountForm.type === "percentage" ? "%" : "PKR"}
                </span>
              </div>
            </div>

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

            {/* Time Restriction */}
            <div className="space-y-2">
              <Label className="text-zinc-200 text-sm">Time Restriction</Label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="all-day"
                  checked={discountForm.allDay}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, allDay: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#2DD4BF] focus:ring-[#2DD4BF] focus:ring-2 accent-[#2DD4BF] cursor-pointer"
                />
                <Label
                  htmlFor="all-day"
                  className="cursor-pointer text-zinc-200 text-sm"
                >
                  All Day (no time restriction)
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
                        setDiscountForm({ ...discountForm, endHour: parseInt(v) })
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

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDiscountModal(false);
                  resetForm();
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

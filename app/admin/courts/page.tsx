"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Loader2, Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import {
  getAllCourts,
  createCourt,
  updateCourt,
  deleteCourt,
} from "../../actions/courts";
import type { Court } from "@/types";

export default function CourtsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isSubmittingCourt, setIsSubmittingCourt] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Court | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [courtForm, setCourtForm] = useState({
    name: "",
    type: "PADEL" as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
    description: "",
    pricePerHour: 0,
    isActive: true,
  });

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";

  useEffect(() => {
    if (session) {
      if (!isSuperAdmin) {
        router.push("/admin/bookings");
        return;
      }
      loadData();
    }
  }, [session, isSuperAdmin, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getAllCourts();
      if (result.success) {
        setCourts(result.courts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCourt(true);

    try {
      if (editingCourt) {
        const result = await updateCourt({
          courtId: editingCourt._id,
          ...courtForm,
        });

        if (result.success) {
          setShowCourtModal(false);
          setEditingCourt(null);
          resetCourtForm();
          loadData();
        } else {
          alert(result.error || "Failed to update court");
        }
      } else {
        const result = await createCourt({
          ...courtForm,
          image: "",
        });

        if (result.success) {
          setShowCourtModal(false);
          resetCourtForm();
          loadData();
        } else {
          alert(result.error || "Failed to create court");
        }
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsSubmittingCourt(false);
    }
  };

  const resetCourtForm = () => {
    setCourtForm({
      name: "",
      type: "PADEL",
      description: "",
      pricePerHour: 0,
      isActive: true,
    });
    setEditingCourt(null);
  };

  const handleEditCourt = (court: Court) => {
    setEditingCourt(court);
    setCourtForm({
      name: court.name,
      type: court.type,
      description: court.description,
      pricePerHour: court.pricePerHour,
      isActive: court.isActive,
    });
    setShowCourtModal(true);
  };

  const handleDeleteCourt = (court: Court) => {
    setDeletingCourt(court);
    setShowDeleteModal(true);
  };

  const confirmDeleteCourt = async () => {
    if (!deletingCourt) return;

    setIsDeleting(true);
    try {
      const result = await deleteCourt(deletingCourt._id);
      if (result.success) {
        setShowDeleteModal(false);
        setDeletingCourt(null);
        loadData();
      } else {
        alert(result.error || "Failed to delete court");
        setIsDeleting(false);
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
      setIsDeleting(false);
    }
  };

  const handleSort = (column: keyof Court) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedCourts = [...courts].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = a[sortColumn];
    let bValue: any = b[sortColumn];

    // Handle string comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    // Handle number comparison
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Handle boolean comparison
    if (typeof aValue === "boolean" && typeof bValue === "boolean") {
      return sortDirection === "asc"
        ? (aValue === bValue ? 0 : aValue ? 1 : -1)
        : (aValue === bValue ? 0 : aValue ? -1 : 1);
    }

    // String comparison
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof Court }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    );
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Court Management"
      description="Manage court settings"
      onRefresh={loadData}
      isLoading={isLoading}
      actionButton={
        <Button
          onClick={() => {
            resetCourtForm();
            setShowCourtModal(true);
          }}
          className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6] w-full sm:w-auto text-xs sm:text-sm"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Court</span>
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
                      className="min-w-[200px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Court Name
                        <SortIcon column="name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[120px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        <SortIcon column="type" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead 
                      className="min-w-[120px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("pricePerHour")}
                    >
                      <div className="flex items-center">
                        Price/Hour
                        <SortIcon column="pricePerHour" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("isActive")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon column="isActive" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-zinc-800">
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : sortedCourts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-zinc-400 py-8"
                      >
                        No courts found. Create your first court to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedCourts.map((court) => (
                      <TableRow key={court._id} className="border-zinc-800">
                        <TableCell>
                          <div className="font-medium text-white text-sm">
                            {court.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs"
                          >
                            {court.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-zinc-300 text-sm line-clamp-2">
                            {court.description}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-[#2DD4BF] font-semibold text-sm">
                              PKR {court.pricePerHour.toLocaleString()}
                            </span>
                            {court.pricePerHour === 0 && (
                              <Badge
                                variant="outline"
                                className="bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs"
                              >
                                Free
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              court.isActive
                                ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF] text-xs"
                                : "bg-red-500/20 border-red-500/50 text-red-400 text-xs"
                            }
                          >
                            {court.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCourt(court)}
                              className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCourt(court)}
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

      {/* Court Modal */}
      <Dialog open={showCourtModal} onOpenChange={setShowCourtModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCourt ? "Edit Court" : "Add New Court"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingCourt ? "Update court details and pricing" : "Create a new court with details and pricing"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCourtSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="court-name" className="text-zinc-200 text-sm">
                  Court Name
                </Label>
                <Input
                  id="court-name"
                  type="text"
                  required
                  value={courtForm.name}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, name: e.target.value })
                  }
                  placeholder="Court Alpha"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="court-type" className="text-zinc-200 text-sm">
                  Court Type
                </Label>
                <Select
                  value={courtForm.type}
                  onValueChange={(v) =>
                    setCourtForm({ ...courtForm, type: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PADEL">Padel</SelectItem>
                    <SelectItem value="CRICKET">Cricket</SelectItem>
                    <SelectItem value="PICKLEBALL">Pickleball</SelectItem>
                    <SelectItem value="FUTSAL">Futsal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="court-description" className="text-zinc-200 text-sm">
                Description
              </Label>
              <textarea
                id="court-description"
                required
                value={courtForm.description}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, description: e.target.value })
                }
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none text-sm"
                placeholder="Professional court with premium features..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="court-price" className="text-zinc-200 text-sm">
                  Price Per Hour (PKR)
                </Label>
                <Input
                  id="court-price"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={courtForm.pricePerHour}
                  onChange={(e) =>
                    setCourtForm({
                      ...courtForm,
                      pricePerHour: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="5000"
                  className="text-sm"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="court-active"
                    checked={courtForm.isActive}
                    onChange={(e) =>
                      setCourtForm({ ...courtForm, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#2DD4BF] focus:ring-[#2DD4BF] focus:ring-2 accent-[#2DD4BF] cursor-pointer"
                  />
                  <Label
                    htmlFor="court-active"
                    className="cursor-pointer text-zinc-200 text-sm"
                  >
                    Active
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCourtModal(false);
                  resetCourtForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                disabled={isSubmittingCourt}
              >
                {isSubmittingCourt ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingCourt ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingCourt ? "Update Court" : "Create Court"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Court Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Court</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete this court? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingCourt && (
            <div className="space-y-4 py-4">
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Court Name:</span>
                  <span className="text-white text-sm font-medium">
                    {deletingCourt.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Type:</span>
                  <span className="text-white text-sm">{deletingCourt.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Price/Hour:</span>
                  <span className="text-white text-sm">
                    PKR {deletingCourt.pricePerHour.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Status:</span>
                  <Badge
                    variant="outline"
                    className={
                      deletingCourt.isActive
                        ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF] text-xs"
                        : "bg-red-500/20 border-red-500/50 text-red-400 text-xs"
                    }
                  >
                    {deletingCourt.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <p className="text-zinc-300 text-sm">
                This action will permanently delete the court from the system. All associated data will be lost and this cannot be undone.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingCourt(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteCourt}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete Court"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

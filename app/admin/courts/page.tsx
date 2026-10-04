"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import type { TableProps } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { CourtsTable } from "@/components/admin/courts/CourtsTable";
import { CourtFormModal } from "@/components/admin/courts/CourtFormModal";
import { DeleteCourtModal } from "@/components/admin/courts/DeleteCourtModal";
import {
  createEmptyCourtForm,
  courtToFormState,
  sortCourts,
  type CourtFormState,
} from "@/components/admin/courts/courtHelpers";
import {
  useAllCourts,
  getQueryLoadingState,
} from "@/lib/tanstack/hooks/queries";
import {
  useCreateCourtMutation,
  useUpdateCourtMutation,
  useDeleteCourtMutation,
} from "@/lib/tanstack/hooks/mutations";
import type { Court } from "@/types";

export default function CourtsPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isSubmittingCourt, setIsSubmittingCourt] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Court | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [courtForm, setCourtForm] = useState<CourtFormState>(
    createEmptyCourtForm,
  );

  const userRole = (session?.user as { role?: string })?.role;
  const isSuperAdmin = userRole === "super_admin";

  const courtsQuery = useAllCourts({ enabled: !!session && isSuperAdmin });
  const { isInitialLoading, isRefreshing } = getQueryLoadingState(courtsQuery);
  const courts = courtsQuery.data ?? [];

  const createCourtMutation = useCreateCourtMutation();
  const updateCourtMutation = useUpdateCourtMutation();
  const deleteCourtMutation = useDeleteCourtMutation();

  useEffect(() => {
    if (!session || isSuperAdmin) return;
    router.push("/admin/bookings");
  }, [session, isSuperAdmin, router]);

  useEffect(() => {
    if (courtsQuery.error) {
      message.error(
        courtsQuery.error instanceof Error
          ? courtsQuery.error.message
          : "Failed to load courts",
      );
    }
  }, [courtsQuery.error, message]);

  const resetCourtForm = () => {
    setCourtForm(createEmptyCourtForm());
    setEditingCourt(null);
  };

  const closeCourtModal = () => {
    setShowCourtModal(false);
    resetCourtForm();
  };

  const handleCourtSubmit = async () => {
    setIsSubmittingCourt(true);

    try {
      if (editingCourt) {
        const result = await updateCourtMutation.mutateAsync({
          courtId: editingCourt._id,
          ...courtForm,
        });

        if (result.success) {
          setShowCourtModal(false);
          setEditingCourt(null);
          resetCourtForm();
        } else {
          message.error(result.error || "Failed to update court");
        }
      } else {
        const result = await createCourtMutation.mutateAsync({
          ...courtForm,
          image: "",
        });

        if (result.success) {
          setShowCourtModal(false);
          resetCourtForm();
        } else {
          message.error(result.error || "Failed to create court");
        }
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsSubmittingCourt(false);
    }
  };

  const handleEditCourt = (court: Court) => {
    setEditingCourt(court);
    setCourtForm(courtToFormState(court));
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
      const result = await deleteCourtMutation.mutateAsync(deletingCourt._id);
      if (result.success) {
        setShowDeleteModal(false);
        setDeletingCourt(null);
      } else {
        message.error(result.error || "Failed to delete court");
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTableChange: TableProps<Court>["onChange"] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (activeSorter?.columnKey && activeSorter.order) {
      setSortColumn(activeSorter.columnKey as keyof Court);
      setSortDirection(activeSorter.order === "descend" ? "desc" : "asc");
    } else {
      setSortColumn(null);
      setSortDirection("asc");
    }
  };

  const sortedCourts = sortCourts(courts, sortColumn, sortDirection);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Court Management"
      description="Manage court settings"
      onRefresh={() => courtsQuery.refetch()}
      isLoading={isRefreshing}
      actionButton={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            resetCourtForm();
            setShowCourtModal(true);
          }}
        >
          <span className="hidden sm:inline">Add Court</span>
        </Button>
      }
    >
      {isInitialLoading ? (
        <AdminTableSkeleton />
      ) : (
        <CourtsTable
          courts={sortedCourts}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onTableChange={handleTableChange}
          onEdit={handleEditCourt}
          onDelete={handleDeleteCourt}
        />
      )}

      <CourtFormModal
        open={showCourtModal}
        editingCourt={editingCourt}
        isSubmitting={isSubmittingCourt}
        courtForm={courtForm}
        setCourtForm={setCourtForm}
        onClose={closeCourtModal}
        onSubmit={handleCourtSubmit}
      />

      <DeleteCourtModal
        open={showDeleteModal}
        court={deletingCourt}
        isDeleting={isDeleting}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletingCourt(null);
        }}
        onConfirm={confirmDeleteCourt}
      />
    </AdminLayout>
  );
}

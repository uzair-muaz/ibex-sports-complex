"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import {
  useAllUsers,
  getQueryLoadingState,
} from "@/lib/tanstack/hooks/queries";
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/lib/tanstack/hooks/mutations";
import type { AdminUser } from "@/lib/tanstack/types/users.types";

type User = AdminUser;

type UserFormValues = {
  email: string;
  password?: string;
  name: string;
  role: "super_admin" | "admin" | "user";
};

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<UserFormValues>();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const userRole = (session?.user as { role?: string })?.role;
  const isSuperAdmin = userRole === "super_admin";

  const usersQuery = useAllUsers({ enabled: !!session && isSuperAdmin });
  const { isInitialLoading, isRefreshing } = getQueryLoadingState(usersQuery);
  const users = usersQuery.data ?? [];

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();

  useEffect(() => {
    if (!session || isSuperAdmin) return;
    router.push("/admin/bookings");
  }, [session, isSuperAdmin, router]);

  useEffect(() => {
    if (usersQuery.error) {
      message.error(
        usersQuery.error instanceof Error
          ? usersQuery.error.message
          : "Failed to load users",
      );
    }
  }, [usersQuery.error, message]);

  const handleSort = (column: keyof User) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any = a[sortColumn];
    let bValue: any = b[sortColumn];

    if (sortColumn === "createdAt") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortTitle = ({
    column,
    label,
  }: {
    column: keyof User;
    label: string;
  }) => (
    <span
      className="inline-flex cursor-pointer items-center gap-1"
      onClick={() => handleSort(column)}
    >
      {label}
      {sortColumn !== column ? (
        <SwapOutlined className="opacity-50" />
      ) : sortDirection === "asc" ? (
        <CaretUpOutlined className="text-[#2DD4BF]" />
      ) : (
        <CaretDownOutlined className="text-[#2DD4BF]" />
      )}
    </span>
  );

  const handleUserSubmit = async (values: UserFormValues) => {
    setIsSubmittingUser(true);

    try {
      if (editingUser) {
        const result = await updateUserMutation.mutateAsync({
          userId: editingUser._id,
          ...values,
          ...(values.password ? {} : { password: undefined }),
        });

        if (result.success) {
          setShowUserModal(false);
          setEditingUser(null);
          resetUserForm();
        } else {
          message.error(result.error || "Failed to update user");
        }
      } else {
        if (!values.password) {
          message.error("Password is required for new users");
          return;
        }
        const result = await createUserMutation.mutateAsync({
          ...values,
          password: values.password,
        });

        if (result.success) {
          setShowUserModal(false);
          resetUserForm();
        } else {
          message.error(result.error || "Failed to create user");
        }
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const resetUserForm = () => {
    form.resetFields();
    form.setFieldsValue({ role: "admin" });
    setEditingUser(null);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = (userId: string) => {
    modal.confirm({
      title: "Delete user",
      content:
        "Are you sure you want to delete this user? This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await deleteUserMutation.mutateAsync(userId);
        if (result.success) {
          return;
        }
        message.error(result.error || "Failed to delete user");
      },
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: <SortTitle column="name" label="Name" />,
      dataIndex: "name",
      key: "name",
      minWidth: 120,
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: <SortTitle column="email" label="Email" />,
      dataIndex: "email",
      key: "email",
      minWidth: 180,
    },
    {
      title: <SortTitle column="role" label="Role" />,
      dataIndex: "role",
      key: "role",
      minWidth: 100,
      render: (role: User["role"]) => (
        <Tag color={role === "super_admin" ? "cyan" : "default"}>
          {role.replace("_", " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: <SortTitle column="createdAt" label="Created" />,
      dataIndex: "createdAt",
      key: "createdAt",
      minWidth: 100,
      render: (createdAt: string) =>
        new Date(createdAt).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      minWidth: 100,
      render: (_, user) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(user)}
            aria-label="Edit user"
          />
          {user._id !== (session?.user as any)?.id && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteUser(user._id)}
              aria-label="Delete user"
            />
          )}
        </div>
      ),
    },
  ];

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="User Management"
      description="Manage user accounts"
      onRefresh={() => usersQuery.refetch()}
      isLoading={isRefreshing}
      actionButton={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            resetUserForm();
            setShowUserModal(true);
          }}
          className="w-full sm:w-auto"
        >
          <span className="hidden sm:inline">Add User</span>
        </Button>
      }
    >
      {isInitialLoading ? (
        <AdminTableSkeleton />
      ) : (
        <div className="space-y-4">
          <Card styles={{ body: { padding: 0 } }}>
            <Table<User>
              rowKey="_id"
              columns={columns}
              dataSource={sortedUsers}
              pagination={false}
              scroll={{ x: true }}
              locale={{ emptyText: "No users found." }}
            />
          </Card>
        </div>
      )}

      <Modal
        title={editingUser ? "Edit User" : "Add New User"}
        open={showUserModal}
        onCancel={() => {
          setShowUserModal(false);
          resetUserForm();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowUserModal(false);
              resetUserForm();
            }}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmittingUser}
            onClick={() => form.submit()}
          >
            {editingUser ? "Update User" : "Create User"}
          </Button>,
        ]}
        width={672}
      >
        <p className="mb-4 text-[var(--ant-color-text-secondary)]">
          Manage user accounts and permissions
        </p>
        <Form<UserFormValues>
          form={form}
          layout="vertical"
          onFinish={handleUserSubmit}
          requiredMark={false}
          initialValues={{ role: "admin" }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: "Name is required" }]}
            >
              <Input placeholder="John Doe" />
            </Form.Item>
            <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: "Role is required" }]}
            >
              <Select
                options={[
                  { value: "user", label: "User" },
                  { value: "admin", label: "Admin" },
                  { value: "super_admin", label: "Super Admin" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input type="email" placeholder="user@ibex.com" />
          </Form.Item>

          <Form.Item
            label={
              <>
                Password{" "}
                {editingUser && (
                  <span className="text-[var(--ant-color-text-secondary)]">
                    (leave empty to keep current)
                  </span>
                )}
              </>
            }
            name="password"
            rules={
              editingUser
                ? []
                : [{ required: true, message: "Password is required" }]
            }
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}

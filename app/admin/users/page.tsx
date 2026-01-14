"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../actions/users";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  createdAt: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin" as "super_admin" | "admin" | "user",
  });

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";

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

    // Handle date comparison
    if (sortColumn === "createdAt") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle string comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    // Handle number comparison
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // String comparison
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof User }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    );
  };

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
      const result = await getAllUsers();
      if (result.success) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);

    try {
      if (editingUser) {
        const result = await updateUser({
          userId: editingUser._id,
          ...userForm,
          ...(userForm.password ? {} : { password: undefined }),
        });

        if (result.success) {
          setShowUserModal(false);
          setEditingUser(null);
          resetUserForm();
          loadData();
        } else {
          alert(result.error || "Failed to update user");
        }
      } else {
        if (!userForm.password) {
          alert("Password is required for new users");
          return;
        }
        const result = await createUser(userForm);

        if (result.success) {
          setShowUserModal(false);
          resetUserForm();
          loadData();
        } else {
          alert(result.error || "Failed to create user");
        }
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const resetUserForm = () => {
    setUserForm({
      email: "",
      password: "",
      name: "",
      role: "admin",
    });
    setEditingUser(null);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      const result = await deleteUser(userId);
      if (result.success) {
        loadData();
      } else {
        alert(result.error || "Failed to delete user");
      }
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="User Management"
      description="Manage user accounts"
      onRefresh={loadData}
      isLoading={isLoading}
      actionButton={
        <Button
          onClick={() => {
            resetUserForm();
            setShowUserModal(true);
          }}
          className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6] w-full sm:w-auto text-xs sm:text-sm"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">Add User</span>
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
                      className="min-w-[120px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        <SortIcon column="name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[180px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center">
                        Email
                        <SortIcon column="email" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center">
                        Role
                        <SortIcon column="role" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center">
                        Created
                        <SortIcon column="createdAt" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-zinc-800">
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : sortedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-zinc-400 py-8"
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedUsers.map((user) => (
                      <TableRow key={user._id} className="border-zinc-800">
                        <TableCell className="font-medium text-white text-sm">
                          {user.name}
                        </TableCell>
                        <TableCell className="text-zinc-200 text-sm">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.role === "super_admin"
                                ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF] text-xs"
                                : user.role === "admin"
                                  ? "bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs"
                                  : "bg-zinc-900/50 border-zinc-800 text-zinc-300 text-xs"
                            }
                          >
                            {user.role.replace("_", " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                              className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {user._id !== (session?.user as any)?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user._id)}
                                className="text-zinc-400 hover:text-zinc-300 h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Manage user accounts and permissions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name" className="text-zinc-200 text-sm">
                  Name
                </Label>
                <Input
                  id="user-name"
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  placeholder="John Doe"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role" className="text-zinc-200 text-sm">
                  Role
                </Label>
                <Select
                  value={userForm.role}
                  onValueChange={(v) =>
                    setUserForm({ ...userForm, role: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email" className="text-zinc-200 text-sm">
                Email
              </Label>
              <Input
                id="user-email"
                type="email"
                required
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                placeholder="user@ibex.com"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password" className="text-zinc-200 text-sm">
                Password{" "}
                {editingUser && (
                  <span className="text-zinc-400">
                    (leave empty to keep current)
                  </span>
                )}
              </Label>
              <Input
                id="user-password"
                type="password"
                required={!editingUser}
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
                placeholder="••••••••"
                className="text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowUserModal(false);
                  resetUserForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                disabled={isSubmittingUser}
              >
                {isSubmittingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingUser ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingUser ? "Update User" : "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

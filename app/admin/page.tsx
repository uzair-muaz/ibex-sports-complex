"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Lock,
  Trash2,
  Calendar,
  Users,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  DollarSign,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  getAllBookings,
  cancelBooking,
  updateBooking,
  deleteBooking,
  createBooking,
} from "../actions/bookings";
import {
  getAllCourts,
  createCourt,
  updateCourt,
  deleteCourt,
} from "../actions/courts";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../actions/users";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import type { Booking, Court } from "@/types";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Dashboard State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "courts" | "users">(
    "bookings"
  );

  // Court Management
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [courtForm, setCourtForm] = useState({
    name: "",
    type: "PADEL" as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
    description: "",
    pricePerHour: 0,
    isActive: true,
  });

  // User Management
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin" as "super_admin" | "admin" | "user",
  });

  // Booking Management
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState({
    date: "",
    startTime: 6,
    duration: 1,
    userName: "",
    userEmail: "",
    userPhone: "",
    status: "confirmed" as "confirmed" | "cancelled" | "completed",
    courtType: "PADEL" as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
  });

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsResult, courtsResult, usersResult] = await Promise.all([
        getAllBookings(),
        getAllCourts(),
        getAllUsers(),
      ]);

      if (bookingsResult.success) {
        setBookings(bookingsResult.bookings);
      }
      if (courtsResult.success) {
        setCourts(courtsResult.courts);
      }
      if (usersResult.success) {
        setUsers(usersResult.users);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setLoginError(result.error);
      }
    } catch (error: any) {
      setLoginError(error.message || "Login failed");
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      const result = await cancelBooking(id);
      if (result.success) {
        loadData();
      } else {
        alert(result.error || "Failed to cancel booking");
      }
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this booking? This action cannot be undone."
      )
    ) {
      const result = await deleteBooking(id);
      if (result.success) {
        loadData();
      } else {
        alert(result.error || "Failed to delete booking");
      }
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    const court = courts.find((c) => c._id === booking.courtId);
    setBookingForm({
      date: booking.date,
      startTime: booking.startTime,
      duration: booking.duration,
      userName: booking.userName,
      userEmail: booking.userEmail,
      userPhone: booking.userPhone || "",
      status: booking.status,
      courtType: court?.type || "PADEL",
    });
    setShowBookingModal(true);
  };

  const handleCreateBooking = () => {
    setEditingBooking(null);
    resetBookingForm();
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingBooking) {
      // Update existing booking
      const result = await updateBooking({
        bookingId: editingBooking._id,
        ...bookingForm,
      });

      if (result.success) {
        setShowBookingModal(false);
        setEditingBooking(null);
        resetBookingForm();
        loadData();
      } else {
        alert(result.error || "Failed to update booking");
      }
    } else {
      // Create new booking
      const result = await createBooking({
        courtType: bookingForm.courtType,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        duration: bookingForm.duration,
        userName: bookingForm.userName,
        userEmail: bookingForm.userEmail,
        userPhone: bookingForm.userPhone || undefined,
      });

      if (result.success) {
        setShowBookingModal(false);
        resetBookingForm();
        loadData();
      } else {
        alert(result.error || "Failed to create booking");
      }
    }
  };

  const resetBookingForm = () => {
    setBookingForm({
      date: "",
      startTime: 6,
      duration: 1,
      userName: "",
      userEmail: "",
      userPhone: "",
      status: "confirmed",
      courtType: "PADEL",
    });
    setEditingBooking(null);
  };

  const handleCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const handleDeleteCourt = async (courtId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this court? This action cannot be undone."
      )
    ) {
      const result = await deleteCourt(courtId);
      if (result.success) {
        loadData();
      } else {
        alert(result.error || "Failed to delete court");
      }
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const filteredBookings = bookings.filter(
    (b) =>
      b.userName.toLowerCase().includes(filter.toLowerCase()) ||
      b.userEmail.toLowerCase().includes(filter.toLowerCase()) ||
      b._id.includes(filter)
  );

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const totalRevenue = bookings.reduce(
    (sum, b) => sum + (b.totalPrice || 0),
    0
  );
  const todayBookings = bookings.filter(
    (b) => b.date === new Date().toISOString().split("T")[0]
  );

  // Super Admin Stats
  const calculateSuperAdminStats = () => {
    const userBookingCounts: {
      [key: string]: {
        email: string;
        name: string;
        count: number;
        revenue: number;
      };
    } = {};
    bookings.forEach((booking) => {
      const key = booking.userEmail.toLowerCase();
      if (!userBookingCounts[key]) {
        userBookingCounts[key] = {
          email: booking.userEmail,
          name: booking.userName,
          count: 0,
          revenue: 0,
        };
      }
      userBookingCounts[key].count++;
      userBookingCounts[key].revenue += booking.totalPrice || 0;
    });
    const topUsers = Object.values(userBookingCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const revenueByType: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      const courtType =
        typeof booking.courtId === "object" &&
        booking.courtId &&
        "type" in booking.courtId
          ? (booking.courtId as Court).type || "UNKNOWN"
          : "UNKNOWN";
      revenueByType[courtType] =
        (revenueByType[courtType] || 0) + (booking.totalPrice || 0);
    });

    const bookingsByStatus = {
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      completed: bookings.filter((b) => b.status === "completed").length,
    };

    const avgBookingValue =
      bookings.length > 0 ? totalRevenue / bookings.length : 0;

    const courtTypeCounts: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      const courtType =
        typeof booking.courtId === "object" &&
        booking.courtId &&
        "type" in booking.courtId
          ? (booking.courtId as Court).type || "UNKNOWN"
          : "UNKNOWN";
      courtTypeCounts[courtType] = (courtTypeCounts[courtType] || 0) + 1;
    });
    const mostPopularCourtType =
      Object.entries(courtTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "N/A";

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthRevenue = bookings
      .filter((b) => {
        const bookingDate = new Date(b.date);
        return (
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    return {
      topUsers,
      revenueByType,
      bookingsByStatus,
      avgBookingValue,
      mostPopularCourtType,
      thisMonthRevenue,
    };
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2DD4BF]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <Card className="w-full max-w-sm border-zinc-800 bg-zinc-950">
          <CardHeader>
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-[#0F172A]" />
              </div>
              <CardTitle className="text-3xl text-white">
                Admin Access
              </CardTitle>
              <CardDescription className="mt-2 text-zinc-400">
                Sign in to manage court bookings
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-sm">
                  {loginError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ibex.com"
                  required
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = (session.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";
  const superAdminStats = isSuperAdmin ? calculateSuperAdminStats() : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-zinc-500">
                Manage bookings, courts, and users
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={() => signOut()}>
                Logout
              </Button>
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#2DD4BF]" />
                  </div>
                </div>
                <CardDescription className="text-zinc-400">
                  Total Bookings
                </CardDescription>
                <CardTitle className="text-3xl text-white">
                  {bookings.length}
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-2">
                  {todayBookings.length} today
                </p>
              </CardHeader>
            </Card>

            {isSuperAdmin && (
              <Card className="border-zinc-800 bg-zinc-950">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-[#2DD4BF]" />
                    </div>
                  </div>
                  <CardDescription className="text-zinc-400">
                    Total Revenue
                  </CardDescription>
                  <CardTitle className="text-3xl text-[#2DD4BF]">
                    PKR{" "}
                    {totalRevenue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </CardTitle>
                  <p className="text-xs text-zinc-400 mt-2">
                    {confirmedBookings.length} confirmed
                  </p>
                </CardHeader>
              </Card>
            )}

            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#2DD4BF]" />
                  </div>
                </div>
                <CardDescription className="text-zinc-400">
                  Active Courts
                </CardDescription>
                <CardTitle className="text-3xl text-[#2DD4BF]">
                  {courts.filter((c) => c.isActive).length}
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-2">
                  {courts.length} total
                </p>
              </CardHeader>
            </Card>

            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#2DD4BF]" />
                  </div>
                </div>
                <CardDescription className="text-zinc-400">
                  Total Users
                </CardDescription>
                <CardTitle className="text-3xl text-[#2DD4BF]">
                  {users.length}
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-2">
                  {
                    users.filter(
                      (u) => u.role === "admin" || u.role === "super_admin"
                    ).length
                  }{" "}
                  admins
                </p>
              </CardHeader>
            </Card>
          </div>

          {/* Super Admin Analytics Section */}
          {isSuperAdmin && superAdminStats && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2 text-white">
                      Analytics Dashboard
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Super Admin exclusive insights
                    </CardDescription>
                  </div>
                  <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#2DD4BF]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <Card className="border-zinc-800 bg-black/40">
                    <CardHeader>
                      <CardDescription className="text-zinc-400">
                        Avg Booking Value
                      </CardDescription>
                      <CardTitle className="text-2xl text-[#2DD4BF]">
                        PKR{" "}
                        {superAdminStats.avgBookingValue.toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="border-zinc-800 bg-black/40">
                    <CardHeader>
                      <CardDescription className="text-zinc-400">
                        This Month Revenue
                      </CardDescription>
                      <CardTitle className="text-2xl text-[#2DD4BF]">
                        PKR{" "}
                        {superAdminStats.thisMonthRevenue.toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="border-zinc-800 bg-black/40">
                    <CardHeader>
                      <CardDescription className="text-zinc-400">
                        Most Popular Court
                      </CardDescription>
                      <CardTitle className="text-2xl text-[#2DD4BF]">
                        {superAdminStats.mostPopularCourtType}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-zinc-800 bg-black/40">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <Users className="w-5 h-5 text-[#2DD4BF]" />
                        Top Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {superAdminStats.topUsers.length === 0 ? (
                          <p className="text-zinc-400 text-sm">
                            No bookings yet
                          </p>
                        ) : (
                          superAdminStats.topUsers.map((user, index) => (
                            <div
                              key={user.email}
                              className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#2DD4BF]/20 rounded-full flex items-center justify-center text-[#2DD4BF] font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-white">
                                    {user.name}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-white">
                                  {user.count} bookings
                                </div>
                                <div className="text-xs text-[#2DD4BF]">
                                  PKR {user.revenue.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="border-zinc-800 bg-black/40">
                      <CardHeader>
                        <CardTitle className="text-lg text-white">
                          Revenue by Court Type
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(superAdminStats.revenueByType).map(
                            ([type, revenue]) => (
                              <div
                                key={type}
                                className="flex items-center justify-between"
                              >
                                <Badge
                                  variant="outline"
                                  className="bg-zinc-900/50 border-zinc-800 text-zinc-200"
                                >
                                  {type}
                                </Badge>
                                <span className="text-[#2DD4BF] font-semibold">
                                  PKR{" "}
                                  {revenue.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-zinc-800 bg-black/40">
                      <CardHeader>
                        <CardTitle className="text-lg text-white">
                          Bookings by Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-[#2DD4BF]"></div>
                              <span className="text-sm">Confirmed</span>
                            </div>
                            <span className="font-semibold">
                              {superAdminStats.bookingsByStatus.confirmed}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-zinc-500"></div>
                              <span className="text-sm">Cancelled</span>
                            </div>
                            <span className="font-semibold">
                              {superAdminStats.bookingsByStatus.cancelled}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-zinc-400"></div>
                              <span className="text-sm">Completed</span>
                            </div>
                            <span className="font-semibold">
                              {superAdminStats.bookingsByStatus.completed}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              {isSuperAdmin && (
                <>
                  <TabsTrigger value="courts">Court Management</TabsTrigger>
                  <TabsTrigger value="users">User Management</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-4">
              <div className="flex gap-4 mt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email or booking ID..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
                {(isSuperAdmin || userRole === "admin") && (
                  <Button
                    onClick={handleCreateBooking}
                    className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Booking
                  </Button>
                )}
              </div>

              <Card className="border-zinc-800 bg-zinc-950">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Booking ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Court</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-zinc-400"
                          >
                            No bookings found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBookings.map((booking) => {
                          const courtName =
                            typeof booking.courtId === "object" &&
                            booking.courtId &&
                            "name" in booking.courtId
                              ? (booking.courtId as Court).name ||
                                "Unknown Court"
                              : "Unknown Court";

                          return (
                            <TableRow
                              key={booking._id}
                              className="border-zinc-800"
                            >
                              <TableCell className="font-mono text-zinc-400">
                                #{booking._id.slice(-8)}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-white">
                                  {booking.userName}
                                </div>
                                <div className="text-zinc-400 text-xs">
                                  {booking.userEmail}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-zinc-900/50 border-zinc-800 text-zinc-200"
                                >
                                  {courtName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-zinc-200">
                                <div>{booking.date}</div>
                                <div className="text-xs text-zinc-400">
                                  {booking.startTime
                                    .toString()
                                    .padStart(2, "0")}
                                  :00 -
                                  {(booking.startTime + booking.duration)
                                    .toString()
                                    .padStart(2, "0")}
                                  :00
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-[#2DD4BF] font-semibold">
                                  PKR {booking.totalPrice.toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    booking.status === "confirmed"
                                      ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF]"
                                      : booking.status === "cancelled"
                                        ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-300"
                                  }
                                >
                                  {booking.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditBooking(booking)}
                                    className="text-zinc-400 hover:text-[#2DD4BF]"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  {booking.status === "confirmed" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleCancelBooking(booking._id)
                                      }
                                      className="text-zinc-400 hover:text-zinc-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDeleteBooking(booking._id)
                                    }
                                    className="text-zinc-400 hover:text-zinc-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Courts Tab */}
            <TabsContent value="courts" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    resetCourtForm();
                    setShowCourtModal(true);
                  }}
                  className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Court
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.map((court) => (
                  <Card key={court._id} className="border-zinc-800 bg-zinc-950">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">
                            {court.name}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className="bg-zinc-900/50 border-zinc-800 text-zinc-200"
                          >
                            {court.type}
                          </Badge>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            court.isActive
                              ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF]"
                              : "bg-zinc-800 border-zinc-700 text-zinc-300"
                          }
                        >
                          {court.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-zinc-300 text-sm mb-4 line-clamp-2">
                        {court.description}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-[#2DD4BF]">
                          PKR {court.pricePerHour}/hr
                        </span>
                        {court.pricePerHour === 0 && (
                          <Badge
                            variant="outline"
                            className="bg-zinc-900/50 border-zinc-800 text-zinc-200"
                          >
                            Free
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditCourt(court)}
                          className="flex-1 bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCourt(court._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    resetUserForm();
                    setShowUserModal(true);
                  }}
                  className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              <Card className="border-zinc-800 bg-zinc-950">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-zinc-400"
                          >
                            No users found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user._id} className="border-zinc-800">
                            <TableCell className="font-medium text-white">
                              {user.name}
                            </TableCell>
                            <TableCell className="text-zinc-200">
                              {user.email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  user.role === "super_admin"
                                    ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF]"
                                    : user.role === "admin"
                                      ? "bg-zinc-900/50 border-zinc-800 text-zinc-200"
                                      : "bg-zinc-900/50 border-zinc-800 text-zinc-300"
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
                                  className="text-zinc-400 hover:text-[#2DD4BF]"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {user._id !== (session.user as any)?.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteUser(user._id)}
                                    className="text-zinc-400 hover:text-zinc-300"
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Court Modal */}
      <Dialog open={showCourtModal} onOpenChange={setShowCourtModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCourt ? "Edit Court" : "Add New Court"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Manage court details and pricing
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCourtSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="court-name" className="text-zinc-200">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="court-type" className="text-zinc-200">
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
              <Label htmlFor="court-description" className="text-zinc-200">
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                placeholder="Professional court with premium features..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="court-price" className="text-zinc-200">
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
                    className="cursor-pointer text-zinc-200"
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
              >
                {editingCourt ? "Update Court" : "Create Court"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Manage user accounts and permissions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name" className="text-zinc-200">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role" className="text-zinc-200">
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
              <Label htmlFor="user-email" className="text-zinc-200">
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password" className="text-zinc-200">
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
              >
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingBooking ? "Edit Booking" : "Create Booking"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingBooking
                ? "Update booking details and status"
                : "Create a new booking"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            {!editingBooking && (
              <div className="space-y-2">
                <Label htmlFor="booking-court-type" className="text-zinc-200">
                  Court Type
                </Label>
                <Select
                  value={bookingForm.courtType}
                  onValueChange={(v) =>
                    setBookingForm({
                      ...bookingForm,
                      courtType: v as any,
                    })
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
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking-date" className="text-zinc-200">
                  Date
                </Label>
                <Input
                  id="booking-date"
                  type="date"
                  required
                  value={bookingForm.date}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, date: e.target.value })
                  }
                />
              </div>
              {editingBooking && (
                <div className="space-y-2">
                  <Label htmlFor="booking-status" className="text-zinc-200">
                    Status
                  </Label>
                  <Select
                    value={bookingForm.status}
                    onValueChange={(v) =>
                      setBookingForm({ ...bookingForm, status: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking-start-time" className="text-zinc-200">
                  Start Time (hour, e.g., 6 or 6.5 for 6:30)
                </Label>
                <Input
                  id="booking-start-time"
                  type="number"
                  required
                  min="6"
                  max="23"
                  step="0.5"
                  value={bookingForm.startTime}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      startTime: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-duration" className="text-zinc-200">
                  Duration (hours, 30-min increments)
                </Label>
                <Input
                  id="booking-duration"
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={bookingForm.duration}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      duration: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-user-name" className="text-zinc-200">
                User Name
              </Label>
              <Input
                id="booking-user-name"
                type="text"
                required
                value={bookingForm.userName}
                onChange={(e) =>
                  setBookingForm({ ...bookingForm, userName: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking-email" className="text-zinc-200">
                  Email
                </Label>
                <Input
                  id="booking-email"
                  type="email"
                  required
                  value={bookingForm.userEmail}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      userEmail: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-phone" className="text-zinc-200">
                  Phone
                </Label>
                <Input
                  id="booking-phone"
                  type="tel"
                  value={bookingForm.userPhone}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      userPhone: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowBookingModal(false);
                  resetBookingForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
              >
                {editingBooking ? "Update Booking" : "Create Booking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getAllFeedback } from "../../actions/feedback";

export default function FeedbackPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getAllFeedback();
      if (result.success) {
        setFeedbacks(result.feedbacks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(
    (f) =>
      f.userName.toLowerCase().includes(filter.toLowerCase()) ||
      f.userEmail.toLowerCase().includes(filter.toLowerCase()) ||
      (typeof f.bookingId === "object" && f.bookingId?._id
        ? f.bookingId._id.includes(filter)
        : f.bookingId?.includes(filter) || false) ||
      (f.comment || "").toLowerCase().includes(filter.toLowerCase())
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedFeedbacks = [...filteredFeedbacks].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    if (sortColumn === "userName") {
      aValue = a.userName?.toLowerCase() || "";
      bValue = b.userName?.toLowerCase() || "";
    } else if (sortColumn === "rating") {
      aValue = a.rating || 0;
      bValue = b.rating || 0;
    } else if (sortColumn === "courtType") {
      aValue = (a.courtType || "N/A").toLowerCase();
      bValue = (b.courtType || "N/A").toLowerCase();
    } else if (sortColumn === "createdAt") {
      aValue = new Date(a.createdAt).getTime();
      bValue = new Date(b.createdAt).getTime();
    } else {
      aValue = a[sortColumn];
      bValue = b[sortColumn];
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

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    );
  };

  return (
    <AdminLayout
      title="Feedback"
      description="View customer feedback"
      onRefresh={loadData}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search by name, email, booking ID or comment..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 text-sm"
            />
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead 
                      className="min-w-[150px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("userName")}
                    >
                      <div className="flex items-center">
                        User
                        <SortIcon column="userName" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[100px]">Booking ID</TableHead>
                    <TableHead 
                      className="min-w-[120px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("rating")}
                    >
                      <div className="flex items-center">
                        Rating
                        <SortIcon column="rating" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[200px]">Comment</TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("courtType")}
                    >
                      <div className="flex items-center">
                        Court Type
                        <SortIcon column="courtType" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[120px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center">
                        Date
                        <SortIcon column="createdAt" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-zinc-800">
                          <TableCell>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-40" />
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : sortedFeedbacks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-zinc-400 py-8"
                      >
                        {filter ? "No feedback found matching your search." : "No feedback submitted yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFeedbacks.map((feedback) => (
                      <TableRow key={feedback._id} className="border-zinc-800">
                        <TableCell>
                          <div className="font-medium text-white text-sm">
                            {feedback.userName}
                          </div>
                          <div className="text-zinc-400 text-xs">
                            {feedback.userEmail}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-zinc-400 text-sm">
                          #{typeof feedback.bookingId === "object" && feedback.bookingId?._id
                            ? feedback.bookingId._id.slice(-8)
                            : feedback.bookingId?.slice(-8) || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= feedback.rating
                                    ? "fill-[#2DD4BF] text-[#2DD4BF]"
                                    : "text-zinc-600"
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-zinc-400">
                              ({feedback.rating}/5)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-zinc-300 text-sm line-clamp-2">
                            {feedback.comment || "No comment"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs"
                          >
                            {feedback.courtType || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs">
                          {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
    </AdminLayout>
  );
}

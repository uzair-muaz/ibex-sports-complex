"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createFeedback,
  getFeedbackByBookingId,
  getBookingById,
} from "@/app/actions/feedback";
import { useParams } from "next/navigation";

export default function FeedbackPage() {
  const params = useParams();
  const bookingId = params?.bookingId as string;

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const loadBookingInfo = useCallback(async () => {
    try {
      setIsLoading(true);

      // Validate bookingId format
      if (
        !bookingId ||
        bookingId.length !== 24 ||
        !/^[0-9a-fA-F]{24}$/.test(bookingId)
      ) {
        setError("Invalid booking ID. Please check the QR code or link.");
        setIsLoading(false);
        return;
      }

      // First check if feedback already exists
      const feedbackResult = await getFeedbackByBookingId(bookingId);
      if (feedbackResult.success && feedbackResult.feedback) {
        setIsSubmitted(true);
        setRating(feedbackResult.feedback.rating);
        setComment(feedbackResult.feedback.comment || "");
        setUserName(feedbackResult.feedback.userName);
        setUserEmail(feedbackResult.feedback.userEmail);
        setUserPhone(feedbackResult.feedback.userPhone);
      } else {
        // Get booking info to pre-fill form
        const bookingResult = await getBookingById(bookingId);
        if (bookingResult.success && bookingResult.booking) {
          setUserName(bookingResult.booking.userName);
          setUserEmail(bookingResult.booking.userEmail);
          setUserPhone(bookingResult.booking.userPhone);
        } else {
          setError(
            bookingResult.error ||
              "Booking not found. Please check the QR code or link.",
          );
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load booking information.";
      console.error(error);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      loadBookingInfo();
    }
  }, [bookingId, loadBookingInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    if (!userName.trim() || !userEmail.trim() || !userPhone.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createFeedback({
        bookingId,
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userPhone: userPhone.trim(),
        rating,
        comment: comment.trim(),
      });

      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || "Failed to submit feedback");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  if (error && !isSubmitted) {
    return (
      <div className="min-h-screen bg-black text-white relative">
        <div className="pt-32 pb-20 px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900/50 border border-red-500/50 rounded-3xl p-8 md:p-12 text-center"
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Invalid Booking Link
              </h1>
              <p className="text-zinc-400 text-lg mb-8">{error}</p>
              <Button
                onClick={() => (window.location.href = "/")}
                className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
              >
                Return to Home
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black text-white relative">
        <div className="pt-32 pb-20 px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 md:p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-[#2DD4BF] text-[#0F172A] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(45,212,191,0.4)]"
              >
                <CheckCircle className="w-10 h-10" />
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Thank You!
              </h1>
              <p className="text-zinc-400 text-lg mb-8">
                Your feedback has been submitted successfully.
              </p>
              {rating > 0 && (
                <div className="flex items-center justify-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= rating
                          ? "fill-[#2DD4BF] text-[#2DD4BF]"
                          : "text-zinc-600"
                      }`}
                    />
                  ))}
                </div>
              )}
              {comment && (
                <div className="bg-zinc-800/50 rounded-xl p-6 text-left mb-6">
                  <p className="text-zinc-300 italic">&quot;{comment}&quot;</p>
                </div>
              )}
              <Button
                onClick={() => (window.location.href = "/")}
                className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
              >
                Return to Home
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-linear-to-b from-[#2DD4BF]/10 to-transparent pointer-events-none" />

      <div className="pt-32 pb-20 px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Share Your Experience
            </h1>
            <p className="text-zinc-400 text-lg">
              Help us improve by sharing your feedback about your booking
              experience
            </p>
          </div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 md:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Rating */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                  Rating <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? "fill-[#2DD4BF] text-[#2DD4BF]"
                            : "text-zinc-600 hover:text-zinc-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-zinc-400">
                    {rating === 5 && "Excellent!"}
                    {rating === 4 && "Great!"}
                    {rating === 3 && "Good"}
                    {rating === 2 && "Fair"}
                    {rating === 1 && "Poor"}
                  </p>
                )}
              </div>

              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                  placeholder="+92 300 1234567"
                  pattern="[+]?[0-9\\s\\-()]{10,}"
                />
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Your Feedback (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  maxLength={1000}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none resize-none"
                  placeholder="Tell us about your experience..."
                />
                <p className="text-xs text-zinc-500 text-right">
                  {comment.length}/1000 characters
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    aria-label="Pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("flex items-center gap-1", className)} {...props} />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = React.ComponentProps<"a"> & {
  isActive?: boolean
  asChild?: boolean
}

const PaginationLink = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, isActive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"
    return (
      <Comp
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-900 aria-disabled:pointer-events-none aria-disabled:opacity-50",
          isActive && "border-[#2DD4BF]/60 text-[#2DD4BF] bg-[#2DD4BF]/10",
          className
        )}
        {...props}
      />
    )
  }
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a">
>(({ className, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    className={cn("gap-1", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span className="hidden sm:inline">Previous</span>
  </PaginationLink>
))
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a">
>(({ className, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    className={cn("gap-1", className)}
    {...props}
  >
    <span className="hidden sm:inline">Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
))
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
))
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}


import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn("relative", wrapperClassName ?? className)}>
      <select
        ref={ref}
        {...props}
        className={cn(
          "w-full appearance-none rounded-md border px-3 py-2 pr-8 text-sm",
          "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
          "border-[hsl(var(--border))]",
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
          "cursor-pointer disabled:opacity-50",
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
    </div>
  ),
);
Select.displayName = "Select";

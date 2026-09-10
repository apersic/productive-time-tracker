import type { PropsWithChildren } from "react";
import { cn } from "../helpers/index.ts";

export function Container({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 py-8 font-sans md:gap-8 md:px-6 md:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const cls = ["nlc-btn", `nlc-btn--${variant}`, size === "sm" && "nlc-btn--sm", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} type="button" {...rest}>
      {children}
    </button>
  );
}

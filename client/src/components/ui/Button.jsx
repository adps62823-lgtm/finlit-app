import React from "react";

export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "btn";
  const mod = variant === "ghost" ? "btn-ghost" : variant === "secondary" ? "btn-secondary" : "btn-primary";
  return (
    <button className={`${base} ${mod} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

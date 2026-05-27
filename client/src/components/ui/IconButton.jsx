import React from "react";

export default function IconButton({ children, className = "", title, ...props }) {
  return (
    <button className={`icon-btn ${className}`.trim()} title={title} {...props}>
      {children}
    </button>
  );
}

import React from "react";

export default function MetricCard({ label, value, note, accent = "teal" }) {
  return (
    <article className={`metric-card tone-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

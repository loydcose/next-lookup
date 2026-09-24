function colorClass(type) {
  const normalized = (type || "").toLowerCase();

  if (normalized.includes("full")) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (normalized.includes("part")) {
    return "bg-orange-100 text-orange-800";
  }

  if (normalized.includes("gig")) {
    return "bg-violet-100 text-violet-800";
  }

  return "bg-stone-200 text-stone-700";
}

export default function EmploymentTypeBadge({ type, className = "" }) {
  if (!type) {
    return null;
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wide ${colorClass(type)} ${className}`}
    >
      {type}
    </span>
  );
}

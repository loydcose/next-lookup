import { useEffect, useState } from "react";
import { formatTimeAgo } from "../lib/job-utils";

export default function TimeAgo({ value, prefix = "" }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const ago = formatTimeAgo(value);
    setLabel(ago ? `${prefix}${ago}` : "");
  }, [prefix, value]);

  return <span>{label}</span>;
}

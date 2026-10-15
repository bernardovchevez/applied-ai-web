"use client";

export function FeedbackBar({
  disabled,
  selected,
  onRate,
}: {
  disabled?: boolean;
  selected?: "up" | "down";
  onRate: (r: "up" | "down") => void;
}) {
  return (
    <div className="feedback">
      <button type="button" disabled={disabled || !!selected} className={selected === "up" ? "on" : ""} onClick={() => onRate("up")}>👍</button>
      <button type="button" disabled={disabled || !!selected} className={selected === "down" ? "on" : ""} onClick={() => onRate("down")}>👎</button>
    </div>
  );
}

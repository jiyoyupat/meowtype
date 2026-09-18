import type { ReactNode } from "react";

export default function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={
        "transition-colors " +
        (active ? "text-main" : "text-sub hover:text-text")
      }
    >
      {children}
    </button>
  );
}

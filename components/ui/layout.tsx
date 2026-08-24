export const pageClass = "page-in space-y-10";

export const cardClass =
  "rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)]";

export const cardClassLg =
  "rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8";

export const sectionTitleClass = "text-lg font-semibold tracking-tight";

export function Surface({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "li";
}) {
  return <Tag className={`${cardClass} ${className}`}>{children}</Tag>;
}

export function SurfaceLg({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return <Tag className={`${cardClassLg} ${className}`}>{children}</Tag>;
}

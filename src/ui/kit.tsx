// Mockroom's UI kit: the few building blocks every screen is made of.
//
// Screens say *what* they need (a primary button, an error banner, a page
// header) and the kit decides how it looks and how it is announced to
// assistive technologies. Sizes, colours, radii and spacing live here and in
// the matching `.ui-*` rules of styles.css, nowhere else.

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  /** An icon before the text. */
  icon?: ReactNode;
}

/** A text button. Defaults to a secondary, medium button that doesn't submit forms. */
export function Button({ variant = "secondary", size = "md", icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`ui-button ui-button-${variant} ui-button-${size}${className ? ` ${className}` : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  /** What the button does. It is the accessible name and the tooltip, so it is required. */
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "primary";
}

/** A square button showing only an icon. */
export function IconButton({ label, icon, variant = "ghost", className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={`ui-icon-button ui-icon-button-${variant}${className ? ` ${className}` : ""}`}
    >
      {icon}
    </button>
  );
}

interface SegmentedProps<T extends string> {
  /** What the choice is about, for assistive technologies. */
  label: string;
  /** `label` is shown, unless there is an icon; `name` is the full name, when `label` is short (e.g. "EN"). */
  options: readonly { value: T; label: string; name?: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A choice between a few options shown side by side. Options with an icon show
 * only the icon, with the label as tooltip and accessible name.
 */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="ui-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="ui-segmented-option"
          aria-pressed={option.value === value}
          aria-label={option.icon ? option.label : option.name}
          title={option.icon ? option.label : option.name}
          onClick={() => onChange(option.value)}
        >
          {option.icon ?? option.label}
        </button>
      ))}
    </div>
  );
}

interface BannerProps {
  /** Errors are announced right away; notes are not. */
  tone?: "note" | "error";
  children: ReactNode;
}

/** A message across the content: an error, or a note about what is shown. */
export function Banner({ tone = "note", children }: BannerProps) {
  return (
    <p className={`ui-banner ui-banner-${tone}`} role={tone === "error" ? "alert" : "note"}>
      {children}
    </p>
  );
}

interface PageHeaderProps {
  /** A way back, shown above the title. */
  back?: { label: string; onClick: () => void };
  /** Something shown above the title, such as the recruiter. */
  lead?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
}

/** The top of a page: the way back, the title and what the page is for. */
export function PageHeader({ back, lead, title, intro }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      {back && (
        <button type="button" className="ui-back" onClick={back.onClick}>
          {back.label}
        </button>
      )}
      {lead}
      <h1 className="ui-title">{title}</h1>
      {intro && <p className="ui-intro">{intro}</p>}
    </header>
  );
}

interface CardProps {
  title?: ReactNode;
  /** Its id labels the card for assistive technologies. Needed when there is a title. */
  id?: string;
  className?: string;
  children: ReactNode;
}

/** A group of related content on a surface. */
export function Card({ title, id, className, children }: CardProps) {
  return (
    <section className={`ui-card${className ? ` ${className}` : ""}`} aria-labelledby={title && id ? id : undefined}>
      {title && (
        <h2 className="ui-card-title" id={id}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** A short line of secondary text under a control or a section. */
export function Hint({ children, id, tone = "muted" }: { children: ReactNode; id?: string; tone?: "muted" | "error" }) {
  return (
    <p id={id} className={`ui-hint ui-hint-${tone}`} role={tone === "error" ? "alert" : undefined}>
      {children}
    </p>
  );
}

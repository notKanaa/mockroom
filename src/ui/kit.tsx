// Mockroom's UI kit: the few building blocks every screen is made of.
//
// Screens say *what* they need (a primary button, an error banner, a page
// header) and the kit decides how it looks and how it is announced to
// assistive technologies. Sizes, colours, radii and spacing live here and in
// the matching `.ui-*` rules of styles.css, nowhere else.

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

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

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  /** A second line, e.g. why the option can't be picked. */
  description?: string;
  disabled?: boolean;
  /** Options with the same group are listed together under its name. */
  group?: string;
  /** A small decorative icon before the label, also shown on the button when the option is chosen. */
  icon?: ReactNode;
}

interface DropdownProps<T extends string> {
  /** What is being chosen, for assistive technologies. */
  label: string;
  options: readonly DropdownOption<T>[];
  /** The chosen value, or null when none is. */
  value: T | null;
  /** Shown on the button when no value is chosen. */
  placeholder?: string;
  onChange: (value: T) => void;
  /** An action under the options, such as "Connect an AI…". */
  footer?: { label: string; onClick: () => void };
  /** Opens above the button, for controls at the bottom of the screen. */
  placement?: "down" | "up";
  disabled?: boolean;
  /** Shown on hover, e.g. why the drop-down is disabled. */
  title?: string;
}

/**
 * A compact drop-down list, styled the same in both themes (unlike a native
 * `<select>`), with groups, options that can't be picked yet, and an optional
 * action at the bottom. Keyboard: arrows to move, Enter to pick, Escape to close.
 */
export function Dropdown<T extends string>({
  label,
  options,
  value,
  placeholder = "",
  onChange,
  footer,
  placement = "down",
  disabled = false,
  title,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const chosen = options.find((option) => option.value === value);
  const pickable = options.flatMap((option, index) => (option.disabled ? [] : [index]));

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function show() {
    const current = options.findIndex((option) => option.value === value && !option.disabled);
    setActive(current >= 0 ? current : (pickable[0] ?? -1));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function pick(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    close();
    if (option.value !== value) onChange(option.value);
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const position = pickable.indexOf(active);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(pickable[Math.min(position + 1, pickable.length - 1)] ?? active);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(pickable[Math.max(position - 1, 0)] ?? active);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(pickable[0] ?? active);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(pickable.at(-1) ?? active);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="ui-dropdown" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ui-dropdown-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${chosen?.label ?? placeholder}`}
        title={title}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKeyDown}
      >
        {chosen?.icon}
        <span className="ui-dropdown-value">{chosen?.label ?? placeholder}</span>
        <svg className="icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className={`ui-dropdown-panel ui-dropdown-${placement}`}>
          <ul
            ref={listRef}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
            onKeyDown={onListKeyDown}
          >
            {options.map((option, index) => (
              <li key={option.value} role="presentation">
                {option.group && option.group !== options[index - 1]?.group && (
                  <span className="ui-dropdown-group" aria-hidden="true">
                    {option.group}
                  </span>
                )}
                <div
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  className={`ui-dropdown-option${index === active ? " ui-dropdown-active" : ""}`}
                  onPointerEnter={() => !option.disabled && setActive(index)}
                  onClick={() => pick(index)}
                >
                  {option.icon && <span className="ui-dropdown-icon">{option.icon}</span>}
                  <span className="ui-dropdown-text">
                    <span className="ui-dropdown-label">{option.label}</span>
                    {option.description && <span className="ui-dropdown-description">{option.description}</span>}
                  </span>
                  {option.value === value && (
                    <svg
                      className="icon ui-dropdown-check"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M5 12l5 5 9-10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {footer && (
            <button
              type="button"
              className="ui-dropdown-footer"
              onClick={() => {
                setOpen(false);
                footer.onClick();
              }}
            >
              {footer.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

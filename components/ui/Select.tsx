"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

type SelectProps = {
  id: string;
  name?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  variant?: "default" | "bare";
  fullWidth?: boolean;
  "aria-describedby"?: string;
};

type MenuPos = { top: number; left: number; width: number; maxHeight: number; openUp: boolean };

export function Select({
  id,
  name,
  options,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  placeholder,
  className = "",
  variant = "default",
  fullWidth = true,
  "aria-describedby": describedBy,
}: SelectProps) {
  const listId = useId();
  const nativeRef = useRef<HTMLSelectElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? value ?? "");
  const current = controlled ? value : internal;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const groups = useMemo(() => groupOptions(options), [options]);
  const selected = options.find((option) => option.value === current);
  const showPlaceholder = current === "" && Boolean(placeholder);
  const display = showPlaceholder ? placeholder : selected?.label || placeholder || "Select";

  function setValue(next: string) {
    if (!controlled) setInternal(next);
    onChange?.(next);
    setInvalid(false);
  }

  function updatePosition() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const gap = 6;
    const maxH = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    setPos({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: Math.max(rect.width, 198),
      maxHeight: Math.min(maxH, Math.max(120, openUp ? spaceAbove : spaceBelow)),
      openUp,
    });
  }

  function openMenu() {
    if (disabled) return;
    const firstEnabled = options.findIndex((option) => !option.disabled);
    const selectedIndex = options.findIndex((option) => option.value === current && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled);
    updatePosition();
    setPortalRoot(buttonRef.current?.closest("dialog") ?? document.body);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function choose(option: SelectOption) {
    if (option.disabled) return;
    setValue(option.value);
    closeMenu();
    buttonRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    }
    function onReposition() {
      updatePosition();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    const select = nativeRef.current;
    if (!select) return;
    function onInvalid(event: Event) {
      event.preventDefault();
      setInvalid(true);
      buttonRef.current?.focus();
    }
    select.addEventListener("invalid", onInvalid);
    return () => select.removeEventListener("invalid", onInvalid);
  }, []);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const item = menuRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const enabledIndexes = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  function moveActive(delta: number) {
    if (enabledIndexes.length === 0) return;
    const currentPos = enabledIndexes.indexOf(activeIndex);
    const nextPos =
      currentPos < 0
        ? delta > 0
          ? 0
          : enabledIndexes.length - 1
        : (currentPos + delta + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[nextPos]!);
  }

  function onButtonKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openMenu();
      else if (event.key === "Enter" || event.key === " ") {
        const option = options[activeIndex];
        if (option) choose(option);
      } else if (event.key === "ArrowDown") moveActive(1);
      else moveActive(-1);
    }
  }

  function onMenuKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(enabledIndexes[0] ?? -1);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  }

  const triggerClass =
    variant === "bare"
      ? `inline-flex min-h-11 min-w-[8rem] items-center justify-between gap-2 bg-transparent text-sm font-medium text-[var(--text)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`
      : `inline-flex min-h-11 ${fullWidth ? "w-full" : "w-auto min-w-[11rem]"} items-center justify-between gap-2 rounded-2xl border bg-[var(--surface)] px-3 text-left text-sm transition-colors focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50 ${
          invalid
            ? "border-[var(--danger)]"
            : open
              ? "border-[var(--text)]"
              : "border-[var(--line)] hover:bg-[var(--ground)]"
        } ${className}`;

  const emptyLook = showPlaceholder;

  return (
    <div className={variant === "bare" ? "relative inline-flex min-w-0" : "relative w-full"}>
      {name ? (
        <select
          ref={nativeRef}
          id={`${id}-native`}
          name={name}
          required={required}
          disabled={disabled}
          value={current}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(event) => setValue(event.target.value)}
        >
          {options.some((option) => option.value === "") ? null : <option value="" />}
          {options.map((option) => (
            <option key={`${option.group ?? ""}-${option.value}`} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={triggerClass}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onButtonKey}
      >
        <span className={`min-w-0 truncate ${emptyLook ? "text-[var(--muted)]" : "text-[var(--text)]"}`}>
          {emptyLook && placeholder ? placeholder : display}
        </span>
        <Chevron open={open} />
      </button>
      {open && pos && portalRoot
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-labelledby={id}
              tabIndex={-1}
              className="select-menu pointer-events-auto fixed z-[100] m-0 overflow-y-auto rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow)]"
              style={{
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                top: pos.openUp ? undefined : pos.top,
                bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              }}
              onKeyDown={onMenuKey}
            >
              {groups.map((group) => (
                <div key={group.label || "default"} role="group" aria-label={group.label || undefined}>
                  {group.label ? (
                    <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      {group.label}
                    </p>
                  ) : null}
                  {group.options.map((option) => {
                    const index = options.indexOf(option);
                    const isSelected = option.value === current;
                    const isActive = index === activeIndex;
                    return (
                      <div
                        key={`${group.label}-${option.value}`}
                        id={`${listId}-${index}`}
                        role="option"
                        data-index={index}
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        className={`flex min-h-11 cursor-pointer items-center rounded-2xl px-3 text-sm ${
                          option.disabled
                            ? "cursor-not-allowed text-[var(--muted)]"
                            : isSelected
                              ? "bg-[var(--text)] text-white"
                              : isActive
                                ? "bg-[var(--ground)]"
                                : "text-[var(--text)] hover:bg-[var(--ground)]"
                        }`}
                        onMouseEnter={() => {
                          if (!option.disabled) setActiveIndex(index);
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(option)}
                      >
                        {option.label}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>,
            portalRoot,
          )
        : null}
    </div>
  );
}

function groupOptions(options: SelectOption[]) {
  const groups: { label: string; options: SelectOption[] }[] = [];
  for (const option of options) {
    const label = option.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.options.push(option);
    else groups.push({ label, options: [option] });
  }
  return groups;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-[var(--motion)] ease-[var(--ease)] ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

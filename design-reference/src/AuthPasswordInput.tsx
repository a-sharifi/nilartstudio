import type { FocusEventHandler, KeyboardEventHandler, Ref } from "react"
import "./auth.css"

export default function AuthPasswordInput({
  id,
  name,
  label,
  value,
  visible,
  disabled = false,
  invalid = false,
  describedBy,
  autoComplete,
  en,
  inputRef,
  onChange,
  onToggle,
  onKeyDown,
  onKeyUp,
  onBlur,
}: {
  id: string
  name?: string
  label: string
  value: string
  visible: boolean
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  autoComplete: "current-password" | "new-password"
  en: boolean
  inputRef?: Ref<HTMLInputElement>
  onChange: (value: string) => void
  onToggle: () => void
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
  onKeyUp?: KeyboardEventHandler<HTMLInputElement>
  onBlur?: FocusEventHandler<HTMLInputElement>
}) {
  const reveal = visible
    ? en
      ? "Hide password"
      : "پنهان‌کردن رمز"
    : en
      ? "Show password"
      : "نمایش رمز"
  return (
    <div className={`password-input-wrap ${invalid ? "field-invalid" : ""}`}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="password-reveal"
        disabled={disabled}
        aria-controls={id}
        aria-pressed={visible}
        aria-label={`${reveal}: ${label}`}
        onClick={onToggle}
      >
        {reveal}
      </button>
    </div>
  )
}

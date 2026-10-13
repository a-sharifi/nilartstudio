"use client"
import { useEffect, useId, useRef, useState } from "react"
import "./dropdown.css"

export type DropdownOption = { value: string; label: string; disabled?: boolean }
export type DropdownProps = {
  id?: string
  describedBy?: string
  invalid?: boolean | "true" | "false" | "grammar" | "spelling"
  required?: boolean
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  label: string
  autocomplete?: boolean
  disabled?: boolean
  name?: string
  placeholder?: string
  emptyMessage?: string
}
const normalize = (value: string) => value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").trim().toLocaleLowerCase()

/** Controlled selection. Autocomplete filters choices; it never submits arbitrary text. */
export default function Dropdown({ id: inputId, describedBy, invalid, required, options, value, onChange, label, autocomplete = false, disabled = false, name, placeholder = "Choose an option", emptyMessage = "No matching options" }: DropdownProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const selected = options.find(option => option.value === value)
  const shown = options.filter(option => !autocomplete || normalize(option.label).includes(normalize(query)))
  const expanded = open && !disabled
  const close = () => { setOpen(false); setQuery("") }
  const start = () => {
    if (disabled) return
    setQuery("")
    setActive(Math.max(0, options.findIndex(option => option.value === value && !option.disabled)))
    setOpen(true)
  }
  const choose = (option: DropdownOption) => {
    if (option.disabled) return
    onChange(option.value)
    close()
    input.current?.focus()
  }
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [])
  useEffect(() => {
    if (expanded) root.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" })
  }, [active, expanded, query])
  const move = (direction: number) => {
    for (let step = 1; step <= shown.length; step++) {
      const index = (active + direction * step + shown.length) % shown.length
      if (!shown[index].disabled) { setActive(index); return }
    }
  }
  return <div className={`nil-dropdown ${expanded ? "is-open" : ""}`} ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}>
    {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
    <div className="nil-dropdown-control">
      <input id={inputId} aria-describedby={describedBy} aria-invalid={invalid} aria-required={required} ref={input} role="combobox" aria-label={label || undefined} aria-expanded={expanded} aria-controls={`${id}-list`} aria-autocomplete={autocomplete ? "list" : "none"} aria-activedescendant={expanded && shown[active] ? `${id}-option-${active}` : undefined}
        autoComplete="off" disabled={disabled} readOnly={!autocomplete} placeholder={placeholder} value={expanded && autocomplete ? query : selected?.label || ""}
        onFocus={() => { if (autocomplete && !expanded) start() }} onClick={() => { if (!expanded) start() }} onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true) }}
        onKeyDown={event => {
          if (event.key === "Escape") { if (expanded) { event.preventDefault(); event.stopPropagation(); close() } return }
          if (event.key === "Tab") { close(); return }
          if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); if (!expanded) start(); else move(event.key === "ArrowDown" ? 1 : -1) }
          else if (expanded && ["Home", "End"].includes(event.key) && !autocomplete) { event.preventDefault(); const indices=shown.map((option,index)=>option.disabled?-1:index).filter(index=>index>=0); setActive((event.key==="Home"?indices[0]:indices.at(-1)) ?? 0) }
          else if (event.key === "Enter" || (!autocomplete && event.key === " ")) { event.preventDefault(); if (!expanded) start(); else if (shown[active]) choose(shown[active]) }
        }} />
      <button type="button" tabIndex={-1} disabled={disabled} aria-label={label} aria-expanded={expanded} onMouseDown={event=>event.preventDefault()} onClick={()=>{ if(expanded) close(); else start(); input.current?.focus() }}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></button>
    </div>
    {expanded && <div className="nil-dropdown-menu"><ul id={`${id}-list`} role="listbox" aria-label={label}>{shown.map((option,index)=><li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value===value} aria-disabled={option.disabled || undefined} data-active={index===active} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(option)}><span>{option.label}</span>{option.value===value && <span aria-hidden="true">✓</span>}</li>)}</ul>{shown.length===0 && <p className="nil-dropdown-empty" role="status">{emptyMessage}</p>}</div>}
  </div>
}

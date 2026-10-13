"use client"
import { Children, isValidElement, useState, type ReactNode, type SelectHTMLAttributes, type ChangeEvent } from "react"
import Dropdown, { type DropdownOption } from "./Dropdown"

/** Compatibility bridge for existing select forms, all rendered by Dropdown. */
export default function SelectDropdown({ children, value, defaultValue, onChange, id, name, disabled, className, ...attributes }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options: DropdownOption[] = []
  const collect = (nodes: ReactNode, inheritedDisabled = false) => Children.forEach(nodes, child => {
    if (!isValidElement<{children?: ReactNode; value?: string | number; disabled?: boolean}>(child)) return
    if (child.type === "option") options.push({value:String(child.props.value ?? child.props.children ?? ""),label:Children.toArray(child.props.children).join(""),disabled:inheritedDisabled || child.props.disabled})
    else collect(child.props.children,inheritedDisabled || !!child.props.disabled)
  })
  collect(children)
  const [internal,setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ""))
  const current = String(value ?? internal)
  return <div className={className} onBlur={event=>attributes.onBlur?.(event as unknown as import("react").FocusEvent<HTMLSelectElement>)}><Dropdown id={id} options={options} value={current} name={name} disabled={disabled} label={attributes["aria-label"] || ""} describedBy={attributes["aria-describedby"]} invalid={attributes["aria-invalid"]} required={attributes.required || attributes["aria-required"] === true || attributes["aria-required"] === "true"} onChange={next=>{
    setInternal(next)
    const target = {value:next,name:name || "",id:id || ""} as HTMLSelectElement
    onChange?.({target,currentTarget:target} as ChangeEvent<HTMLSelectElement>)
  }}/></div>
}

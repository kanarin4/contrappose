import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  hint?: string
  disabled?: boolean
  accent?: string
  onReset?: () => void
}

export function Slider({ label, value, min, max, step, onChange, format, hint, disabled, accent, onReset }: SliderProps) {
  const id = useId()
  return (
    <div className={`space-y-1 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <label htmlFor={id} className="flex items-center gap-1.5 text-slate-300" onDoubleClick={onReset}>
          {accent && <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />}
          {label}
        </label>
        <span className="font-mono tabular-nums text-slate-400">
          {hint && <span className="mr-1.5 font-sans text-[10px] uppercase tracking-wide text-accent">{hint}</span>}
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={onReset}
        className="h-1.5 w-full cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  )
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1 text-xs hover:bg-white/[0.03]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 cursor-pointer rounded accent-[#3b82f6]"
      />
      <span>
        <span className="text-slate-200">{label}</span>
        {description && <span className="block text-[11px] leading-snug text-slate-500">{description}</span>}
      </span>
    </label>
  )
}

interface SectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  actions?: ReactNode
}

export function Section({ title, icon, children, defaultOpen = true, actions }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-white/5 last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
          aria-expanded={open}
        >
          {icon}
          {title}
          <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        {actions}
      </div>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </section>
  )
}

interface IconButtonProps {
  label: string
  onClick: () => void
  children: ReactNode
  active?: boolean
  className?: string
  disabled?: boolean
}

export function IconButton({ label, onClick, children, active, className = '', disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
        active ? 'bg-accent/20 text-blue-300 ring-1 ring-accent/50' : 'text-slate-300 hover:bg-white/5 hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  )
}

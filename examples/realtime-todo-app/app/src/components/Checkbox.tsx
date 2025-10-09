import type React from 'react'

type CheckboxProps = {
  checked: boolean
  onChange: () => void
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange }) => {
  return (
    <label className="relative flex items-center cursor-pointer h-6 w-6">
      <input
        type="checkbox"
        className="peer appearance-none h-6 w-6 rounded-full border border-muted-border bg-transparent checked:bg-primary checked:border-primary transition-colors duration-200"
        checked={checked}
        onChange={onChange}
      />
      <span className="pointer-events-none absolute left-0 top-0 h-6 w-6 flex items-center justify-center">
        {checked && (
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    </label>
  )
}

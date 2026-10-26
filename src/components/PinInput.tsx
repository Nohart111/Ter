import React, { useRef, useEffect } from 'react'

interface PinInputProps {
  value: string[]
  onChange: (value: string[]) => void
  onComplete: (code: string) => void
  disabled?: boolean
}

export const PinInput: React.FC<PinInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (value.every((v) => v === '') && inputsRef.current[0]) {
      inputsRef.current[0]?.focus()
    }
  }, [])

  const handleChange = (index: number, char: string) => {
    if (disabled) return
    const digit = char.replace(/[^0-9]/g, '')
    if (!digit) return

    const newValue = [...value]
    newValue[index] = digit[digit.length - 1]
    onChange(newValue)

    if (index < 5 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus()
    }

    const fullCode = newValue.join('')
    if (fullCode.length === 6 && !newValue.includes('')) {
      onComplete(fullCode)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'Backspace') {
      if (value[index] === '' && index > 0) {
        const newValue = [...value]
        newValue[index - 1] = ''
        onChange(newValue)
        inputsRef.current[index - 1]?.focus()
      } else {
        const newValue = [...value]
        newValue[index] = ''
        onChange(newValue)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '')
    if (!pastedData) return

    const digits = pastedData.slice(0, 6).split('')
    const newValue = [...value]

    for (let i = 0; i < 6; i++) {
      newValue[i] = digits[i] || ''
    }
    onChange(newValue)

    if (digits.length >= 6) {
      inputsRef.current[5]?.focus()
      onComplete(digits.slice(0, 6).join(''))
    } else {
      inputsRef.current[digits.length]?.focus()
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-11 h-16 sm:w-13 sm:h-18 text-center text-2xl sm:text-3xl font-mono font-semibold rounded-2xl border transition-all duration-200 outline-none
            ${
              value[i]
                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-indigo-500/20'
                : 'border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700'
            }
            focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10
            disabled:opacity-40 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  )
}

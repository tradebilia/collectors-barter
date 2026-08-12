import { Input } from "@/components/ui/input";
import { useEffect, useRef } from "react";

interface FilterInputProps {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}

/**
 * FilterInput component that properly handles clearing of input values.
 * Uses a ref to manually update the input element's value when the state changes.
 * This ensures visual clearing works correctly even when React's controlled component
 * mechanism doesn't properly update the DOM.
 */
export function FilterInput({
  placeholder,
  value,
  onChange,
  onKeyDown,
  className,
}: FilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Manually update the input element's value when the state changes
  // This ensures the input field visually clears when the state is cleared
  useEffect(() => {
    if (inputRef.current) {
      // Use the DOM API directly to set the value
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <Input
      ref={inputRef}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
    />
  );
}

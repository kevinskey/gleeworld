// Address autocomplete for the event dialogs' address field. Calls the
// google-places-lookup edge function with { kind: 'address', query } and
// shows a dropdown of predictions.
//
// CRITICAL: this must fail silently. The Google Maps API key is not
// configured yet in this environment, so the function will return
// { error: 'Google Maps API key not configured' }. On ANY error — the
// function returning an error, invoke() throwing, or a malformed response —
// we simply show no dropdown and no toast. The field is always a fully
// usable plain-text input; autocomplete is a progressive enhancement only.
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AddressPrediction {
  description: string;
  name?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the user picks a suggestion — description is the full address, name is the place name (e.g. venue). */
  onSelect?: (description: string, name?: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Full address",
  className,
  id,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressPrediction[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (blurCloseRef.current) clearTimeout(blurCloseRef.current);
  }, []);

  async function fetchSuggestions(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-places-lookup', {
        body: { kind: 'address', query: trimmed },
      });

      // Fail silently: no key configured (function returns an error), a
      // network/invoke failure, or an unexpected shape all just mean "no
      // suggestions this time" — never surface anything to the user.
      if (error || !data || data.error || !Array.isArray(data.predictions)) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      setSuggestions(data.predictions);
      setOpen(data.predictions.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    onChange(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(next);
    }, DEBOUNCE_MS);
  }

  function handleSelect(prediction: AddressPrediction) {
    if (blurCloseRef.current) clearTimeout(blurCloseRef.current);
    onChange(prediction.description);
    onSelect?.(prediction.description, prediction.name);
    setSuggestions([]);
    setOpen(false);
  }

  function handleBlur() {
    // Delay so a click on a suggestion registers before the dropdown closes.
    blurCloseRef.current = setTimeout(() => setOpen(false), 200);
  }

  function handleFocus() {
    if (suggestions.length > 0) setOpen(true);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-background shadow-lg overflow-hidden">
          <div className="px-3 pt-2 text-xs text-muted-foreground">Suggested addresses</div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <li key={`${s.description}-${i}`}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate"
                  )}
                  // onMouseDown fires before the input's onBlur, so the
                  // click is registered before we'd otherwise close the list.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s)}
                >
                  {s.description}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Field — a shared form-field wrapper that gives any control a programmatic
// label.
//
// Why: an accessibility sweep (2026-11) found roughly 2,500 inputs in this app
// rendered next to a visual <Label> with no `htmlFor`/`id` pairing, so screen
// readers announce them as "edit text" with no name, and clicking the label
// does not focus the control. Field does the wiring once:
//
//   <Field label="Email" hint="We only use this to invite them"
//          error={errors.email} required>
//     <Input value={email} onChange={…} />
//   </Field>
//
// It generates an id with React.useId(), renders <Label htmlFor={id}>, and
// clones the single child to inject `id`, `aria-describedby` (hint + error
// ids, merged with anything the child already had), `aria-invalid` when an
// error is set, and `aria-required` when `required`. If the child already has
// an `id`, that id is reused for the label instead.
//
// Works with <Input>, <Textarea>, native <input>/<select>/<textarea>, and
// shadcn <Select> WHEN the child is the <SelectTrigger> — Radix forwards
// `id`/aria-* to the trigger button, which is what receives focus. Do not
// wrap the <Select> root directly: Select.Root renders no DOM element, so the
// injected props would be dropped. Either put <Field> around <SelectTrigger>
// (inside the <Select>) or pass `htmlFor` explicitly with a matching `id` on
// the trigger. The same `htmlFor` escape hatch covers icon-prefixed inputs
// whose child is a `<div className="relative">` wrapper, not the control.

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FieldProps {
  /** Visible label text. */
  label: React.ReactNode;
  /** The single control to label (Input, Textarea, SelectTrigger, native input…). */
  children: React.ReactElement;
  /** Helper text rendered under the control and linked via aria-describedby. */
  hint?: React.ReactNode;
  /** Error text; when set the control gets aria-invalid and the text is linked. */
  error?: React.ReactNode;
  /** Marks the control aria-required and shows a visual asterisk. */
  required?: boolean;
  /**
   * Explicit control id, for when the child is NOT the control itself — e.g.
   * an icon-prefixed input wrapped in `<div className="relative">`, or a
   * <Select> root. The child is then rendered untouched and the caller puts
   * `id={htmlFor}` (and, if wanted, aria-describedby) on the real control.
   * When the child carries that same id it is still cloned as usual.
   */
  htmlFor?: string;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Extra classes for the <Label>. */
  labelClassName?: string;
}

function joinIds(...ids: Array<string | undefined | false | null>): string | undefined {
  const out = ids.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return out.length ? out.join(' ') : undefined;
}

export function Field({
  label, children, hint, error, required, htmlFor, className, labelClassName,
}: FieldProps) {
  const autoId = React.useId();
  const child = React.Children.only(children) as React.ReactElement<Record<string, unknown>>;
  const childProps = child.props ?? {};
  const childId = typeof childProps.id === 'string' && childProps.id ? childProps.id : undefined;
  const id = childId ?? htmlFor ?? autoId;
  const hintId = hint != null && hint !== false ? `${id}-hint` : undefined;
  const errorId = error != null && error !== false && error !== '' ? `${id}-error` : undefined;
  // Child is a wrapper around the control (caller owns the id): leave it alone.
  const passthrough = !!htmlFor && !childId;

  const injected: Record<string, unknown> = {
    id,
    'aria-describedby': joinIds(
      typeof childProps['aria-describedby'] === 'string' ? (childProps['aria-describedby'] as string) : undefined,
      hintId,
      errorId,
    ),
  };
  if (errorId) injected['aria-invalid'] = true;
  if (required) injected['aria-required'] = true;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className={cn('text-sm font-medium', labelClassName)}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive ml-0.5">*</span>}
      </Label>
      {passthrough ? child : React.cloneElement(child, injected)}
      {hintId && (
        <p id={hintId} className="text-xs text-muted-foreground mt-1">{hint}</p>
      )}
      {errorId && (
        <p id={errorId} role="alert" className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

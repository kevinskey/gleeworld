#!/usr/bin/env bash
# Phase 0 regression guard: retired design patterns must not exist.
set -u
fail=0
check_absent() { # pattern, file, label
  if grep -qE "$1" "$2"; then echo "FAIL: $3 still present in $2"; fail=1; else echo "ok: $3 gone"; fi
}
check_present() {
  if grep -qE "$1" "$2"; then echo "ok: $3 present"; else echo "FAIL: $3 missing from $2"; fail=1; fi
}
# retired
check_absent "clamp\(2rem, 8vw"            src/index.css "viewport-scaling h1"
check_absent "Bebas Neue"                   src/index.css "Bebas UI styling"
check_absent "feTurbulence"                 src/index.css "film-grain overlay"
check_absent "translateY\(1px\) scale"      src/index.css "brutalist press effect"
check_absent "36 30% 97%"                   src/index.css "oatmeal canvas"
check_absent "'2xl': '0px'"                 tailwind.config.ts "flattened 2xl radius"
check_absent "rounded-none"                 src/components/ui/button.tsx "square buttons"
check_absent "rounded-none"                 src/components/ui/card.tsx "square cards"
# required
check_present '\-apple-system'              src/index.css "system font stack"
check_present "240 24% 96%"                 src/index.css "iOS systemGray6 canvas"
check_present "font-size: 17px"             src/index.css "17px body"
check_present "--tint"                      src/index.css "tint token"
exit $fail

#!/bin/bash
# Audit which non-gw_ tables are referenced in the GleeWorld src/.
# Heuristic: grep for `.from('<name>'` and `.from("<name>"` patterns
# typical of supabase JS client. Also catch raw SQL ('FROM tablename', 'INTO tablename').

cd /tmp/gleeworld

OUT=/tmp/gleeworld/migrations/table_usage_audit.tsv
echo -e "table\tjs_from_refs\tsql_refs\ttotal\tsample_file" > "$OUT"

while IFS= read -r tbl; do
  [ -z "$tbl" ] && continue
  # Supabase JS client .from('tbl') or .from("tbl")
  JS=$(grep -ER "\.from\(['\"]${tbl}['\"]" src 2>/dev/null | wc -l | tr -d ' ')
  # Raw SQL references (FROM tbl, JOIN tbl, INTO tbl as whole-word) and edge functions
  SQL=$(grep -ERw "(FROM|JOIN|INTO|UPDATE)\s+${tbl}\b" src supabase/functions 2>/dev/null | wc -l | tr -d ' ')
  TOTAL=$((JS + SQL))
  SAMPLE=""
  if [ "$TOTAL" -gt 0 ]; then
    SAMPLE=$(grep -ERl "(\.from\(['\"]${tbl}['\"]|\b(FROM|JOIN|INTO|UPDATE)\s+${tbl}\b)" src supabase/functions 2>/dev/null | head -1)
  fi
  echo -e "${tbl}\t${JS}\t${SQL}\t${TOTAL}\t${SAMPLE}" >> "$OUT"
done < /tmp/gleeworld/migrations/non_gw_tables.txt

echo "=== DEAD (0 references) ==="
awk -F'\t' 'NR>1 && $4==0 {print $1}' "$OUT" | wc -l
echo "=== USED (>=1 reference) ==="
awk -F'\t' 'NR>1 && $4>0 {print $1}' "$OUT" | wc -l
echo ""
echo "=== USED TABLES (sorted by total refs desc) ==="
awk -F'\t' 'NR>1 && $4>0 {print $4"\t"$1}' "$OUT" | sort -rn | head -50

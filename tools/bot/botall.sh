#!/bin/bash
# Fait jouer le bot sur des niveaux du build servi en local (npm run build && npm run preview -- --port 4173).
# Usage : tools/bot/botall.sh [ids...]   (sans argument : les 24 niveaux, les 4 boss et 3 Niveaux du jour générés)
# CHROME=chemin vers chrome ; URL=http://localhost:4173
CHROME="${CHROME:-/mnt/c/Program Files/Google/Chrome/Application/chrome.exe}"
URL="${URL:-http://localhost:4173}"
ids=("$@")
if [ ${#ids[@]} -eq 0 ]; then for w in 1 2 3 4; do for n in 1 2 3 4 5 6 B; do ids+=("$w-$n"); done; done; ids+=(GEN:1 GEN:2 GEN:3); fi
fail=0
for id in "${ids[@]}"; do
  case "$id" in
    GEN:*) q="level=GEN&gseed=${id#GEN:}&script=bot" ;;
    *-B) q="level=$id&script=boss&god=1" ;;
    *) q="level=$id&script=bot" ;;
  esac
  out=$("$CHROME" --headless=new --disable-gpu --window-size=1280,720 --virtual-time-budget=90000 --dump-dom "$URL/?probe=1&$q&dur=300&stopwin=1" 2>/dev/null | grep -o '<pre id="probe">.*</pre>' | sed 's/<[^>]*>//g')
  res=$(printf '%s' "$out" | python3 -c "
import json,sys,collections
try: d=json.load(sys.stdin)
except Exception: print('ECHEC pas de resultat'); sys.exit()
c=collections.Counter((e['cause'], round(e['x'])) for e in d.get('deathLog') or []).most_common(2)
print(('OK  ' if d['state']=='won' and not d['errors'] else 'ECHEC'), d['state'], 't', d['t'], 'chutes', d['deaths'], d['errors'][:1], c)")
  printf '%-6s %s\n' "$id" "$res"
  case "$res" in ECHEC*) fail=$((fail+1)) ;; esac
done
echo "$fail echec(s)"
[ $fail -eq 0 ]

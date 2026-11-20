// Génère supabase/levels.sql : limites anti-triche de chaque niveau (mêmes valeurs que src/online/rules.js).
import { writeFileSync } from 'node:fs';
import { LEVELS } from '../../src/levels/index.js';
import { levelLimits, DAY_LIMITS } from '../../src/online/rules.js';

const rows = [...LEVELS.map((l) => levelLimits(l)), DAY_LIMITS].map((l) => `  ('${l.id}', ${l.minTime}, ${l.maxCoins})`);
const sql = `-- Généré par \`npm run sql\` (tools/online/gen_sql.mjs) : ne pas modifier à la main.
insert into public.level_limits (level, min_time, max_coins) values
${rows.join(',\n')}
on conflict (level) do update set min_time = excluded.min_time, max_coins = excluded.max_coins;
`;
writeFileSync(new URL('../../supabase/levels.sql', import.meta.url), sql);
console.log(`supabase/levels.sql : ${rows.length} niveaux`);

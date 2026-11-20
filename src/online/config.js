// Configuration du serveur. Vide = mode local (tout fonctionne sur l'appareil, sans compte en ligne).
// Pour activer Supabase : créer un fichier .env à la racine (voir .env.example) puis relancer npm run build.
const env = (import.meta && import.meta.env) || {};
export const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

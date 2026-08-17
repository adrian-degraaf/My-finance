// Supabase connection. Copy this file to config.js and fill in your own values.
//
//   cp config.example.js config.js
//
// config.js is gitignored — it never gets committed. Ask whoever runs the
// project for their values, or read them from Supabase → Project Settings → API.
//
// The anon key is safe in a browser: it grants nothing on its own. Every table
// has row-level security, so a signed-in user can only ever read and write
// their own rows. It is kept out of the repo as hygiene, not as a secret.

window.FINANCE_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-KEY'
};

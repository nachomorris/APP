// Config de conexión a Supabase.
// La anon key es pública por diseño (va protegida por RLS en el servidor),
// no hace falta ocultarla, pero la service_role key NUNCA debe ir acá.
const SUPABASE_URL = 'https://lfwssmhkgduxohjscpnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmd3NzbWhrZ2R1eG9oanNjcG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MDY5MTMsImV4cCI6MjA5OTQ4MjkxM30.HoDcJge-QAQM-HAnaaNRRVySYScZ6b5JYcXHgl4qEbo';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

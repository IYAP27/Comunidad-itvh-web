import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dlrhbxhrnznrhnvryzcl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRscmhieGhybnpucmhudnJ5emNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MzU0NTMsImV4cCI6MjA5NzMxMTQ1M30.3PI8GpF0JCs78RC5ehnnb59Pr5YDNPFYEoAastslv-8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
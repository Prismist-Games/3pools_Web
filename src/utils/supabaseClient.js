import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjduqvijyohjqxjvsxwt.supabase.co';
const supabaseKey = 'sb_publishable_Rx6UWhzGIH3o601-oMS-6Q_sC2QH04R';

export const supabase = createClient(supabaseUrl, supabaseKey);

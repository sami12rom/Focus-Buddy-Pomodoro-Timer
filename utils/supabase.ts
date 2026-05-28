import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Publishable key — safe to commit, RLS enforces access rules
const SUPABASE_URL = 'https://lvcialqflafkssidrqgm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T1YRdp4kFEniO5-VAe4zSw_tB1tp3gd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

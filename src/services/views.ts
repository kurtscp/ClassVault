import { supabase } from '../lib/supabase';

/**
 * Records a material view event in material_views for analytics tracking.
 * Fire-and-forget: non-critical analytics action that catches errors silently.
 */
export async function logMaterialView(materialId: string): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return;
    }

    await supabase.from('material_views').insert({
      material_id: materialId,
      user_id: userData.user.id,
    });
  } catch {
    // Analytics logging is non-blocking; silently ignore any failure
  }
}

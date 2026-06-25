import { supabaseAdmin } from './supabase';

export interface AlertSettings {
  paused: boolean;
  maxDistance: number;
}

export async function getAlertSettings(): Promise<AlertSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'alert_settings')
      .maybeSingle();

    const fallback: AlertSettings = { paused: false, maxDistance: 100 };

    if (error || !data || !data.value) {
      return fallback;
    }

    const val = data.value as any;
    return {
      paused: !!val.paused,
      maxDistance: typeof val.max_distance === 'number' ? val.max_distance : (typeof val.maxDistance === 'number' ? val.maxDistance : 100)
    };
  } catch (error) {
    console.error('Error fetching alert settings from database:', error);
    return { paused: false, maxDistance: 100 };
  }
}

export async function saveAlertSettings(settings: AlertSettings): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert(
        {
          key: 'alert_settings',
          value: {
            paused: settings.paused,
            max_distance: settings.maxDistance
          },
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Error upserting alert settings in database:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error saving alert settings in database:', error);
    return false;
  }
}

export interface AlertBannerSettings {
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
}

export async function getAlertBannerSettings(): Promise<AlertBannerSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'alert_banner_settings')
      .maybeSingle();

    const fallback: AlertBannerSettings = {
      enabled: true,
      title: 'Encontre o Lote Perfeito com Alertas de Oportunidades!',
      description: 'Não perca tempo procurando! Cadastre a categoria, peso e preço desejados. Avisamos você por e-mail assim que um lote correspondente for anunciado.',
      buttonText: 'Ativar Alerta de Oportunidade'
    };

    if (error || !data) {
      return fallback;
    }

    return (data.value as AlertBannerSettings) || fallback;
  } catch (error) {
    console.error('Error fetching alert banner settings from database:', error);
    return {
      enabled: true,
      title: 'Encontre o Lote Perfeito com Alertas de Oportunidades!',
      description: 'Não perca tempo procurando! Cadastre a categoria, peso e preço desejados. Avisamos você por e-mail assim que um lote correspondente for anunciado.',
      buttonText: 'Ativar Alerta de Oportunidade'
    };
  }
}

export async function saveAlertBannerSettings(settings: AlertBannerSettings): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert(
        {
          key: 'alert_banner_settings',
          value: settings,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Error upserting alert banner settings in database:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error saving alert banner settings in database:', error);
    return false;
  }
}

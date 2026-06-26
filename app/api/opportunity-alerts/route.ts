import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { logToDatabase } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET: List alerts. Admins see all alerts, regular users see only their own.
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o usuário é administrador
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', session.id)
      .maybeSingle();

    if (profileError) {
      await logToDatabase('error', 'GET /api/opportunity-alerts', 'Error fetching user profile for auth check', profileError);
      return NextResponse.json({ error: 'Erro ao verificar permissões' }, { status: 500 });
    }

    const isAdmin = userProfile?.is_admin || false;

    let query = supabaseAdmin
      .from('opportunity_alerts')
      .select(`
        *,
        animal_categories(name)
      `);

    // Se não for admin, filtra apenas pelos alertas criados por este usuário
    if (!isAdmin) {
      query = query.eq('user_id', session.id);
    }

    const { data: alerts, error: fetchError } = await query.order('created_at', { ascending: false });

    if (fetchError) {
      await logToDatabase('error', 'GET /api/opportunity-alerts', 'Error fetching opportunity alerts', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Mapeia para um formato amigável no frontend
    const mappedAlerts = alerts.map((alert: any) => ({
      id: alert.id,
      userId: alert.user_id,
      name: alert.name,
      email: alert.email,
      phone: alert.phone,
      categoryId: alert.category_id,
      categoryName: alert.animal_categories?.name || 'Qualquer Categoria',
      minPrice: alert.min_price,
      maxPrice: alert.max_price,
      minWeight: alert.min_weight,
      maxWeight: alert.max_weight,
      location: alert.location,
      lat: alert.lat,
      lng: alert.lng,
      createdAt: alert.created_at
    }));

    return NextResponse.json(mappedAlerts);
  } catch (error: any) {
    await logToDatabase('error', 'GET /api/opportunity-alerts', 'Uncaught exception in GET', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

// POST: Register a new alert
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const { name, email, phone, categoryId, minPrice, maxPrice, minWeight, maxWeight, location, lat, lng } = await request.json();

    if (!name || !email || !phone || !categoryId || !location) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // Validação básica de e-mail e telefone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10 || rawPhone.length > 11) {
      return NextResponse.json({ error: 'Telefone inválido. Use o formato (53) 99999-9999' }, { status: 400 });
    }

    // Tentar obter a sessão atual para associar o user_id, se disponível
    const session = await getSession();
    const userId = session?.id || null;

    const insertPayload: any = {
      user_id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      category_id: categoryId,
      location: location.trim()
    };

    if (minPrice !== undefined && minPrice !== null && minPrice !== '') insertPayload.min_price = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') insertPayload.max_price = Number(maxPrice);
    if (minWeight !== undefined && minWeight !== null && minWeight !== '') insertPayload.min_weight = Number(minWeight);
    if (maxWeight !== undefined && maxWeight !== null && maxWeight !== '') insertPayload.max_weight = Number(maxWeight);
    if (lat !== undefined && lat !== null && lat !== '') insertPayload.lat = Number(lat);
    if (lng !== undefined && lng !== null && lng !== '') insertPayload.lng = Number(lng);

    const { data: newAlert, error: insertError } = await supabaseAdmin
      .from('opportunity_alerts')
      .insert([insertPayload])
      .select(`
        *,
        animal_categories(name)
      `)
      .single();

    if (insertError) {
      await logToDatabase('error', 'POST /api/opportunity-alerts', 'Error inserting opportunity alert', {
        insertError,
        payload: insertPayload,
        isServiceRoleAvailable: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json({ error: 'Erro ao cadastrar o alerta' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alert: {
        id: newAlert.id,
        name: newAlert.name,
        email: newAlert.email,
        phone: newAlert.phone,
        categoryId: newAlert.category_id,
        categoryName: newAlert.animal_categories?.name || 'Qualquer Categoria',
        minPrice: newAlert.min_price,
        maxPrice: newAlert.max_price,
        minWeight: newAlert.min_weight,
        maxWeight: newAlert.max_weight,
        location: newAlert.location,
        lat: newAlert.lat,
        lng: newAlert.lng,
        createdAt: newAlert.created_at
      }
    });
  } catch (error: any) {
    await logToDatabase('error', 'POST /api/opportunity-alerts', 'Uncaught exception in POST', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

// DELETE: Remove an alert
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do alerta é obrigatório' }, { status: 400 });
    }

    // Buscar o alerta para verificar se pertence ao usuário logado ou se é admin
    const { data: alert, error: findError } = await supabaseAdmin
      .from('opportunity_alerts')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      await logToDatabase('error', 'DELETE /api/opportunity-alerts', 'Error finding alert to delete', findError);
      return NextResponse.json({ error: 'Erro ao deletar alerta' }, { status: 500 });
    }

    if (!alert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    // Verificar se o usuário logado é o criador do alerta ou se é admin
    const isOwner = alert.user_id === session.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('is_admin')
        .eq('id', session.id)
        .maybeSingle();
      
      isAdmin = userProfile?.is_admin || false;
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('opportunity_alerts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      await logToDatabase('error', 'DELETE /api/opportunity-alerts', 'Error deleting opportunity alert', deleteError);
      return NextResponse.json({ error: 'Erro ao deletar alerta' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Alerta removido com sucesso' });
  } catch (error: any) {
    await logToDatabase('error', 'DELETE /api/opportunity-alerts', 'Uncaught exception in DELETE', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

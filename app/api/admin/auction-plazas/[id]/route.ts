import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT update plaza
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const data = await request.json();
    const { name, city, lat, lng } = data;

    const { data: updatedPlaza, error } = await (supabaseAdmin
      .from('auction_plazas') as any)
      .update({ name, city, lat, lng })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updatedPlaza);
  } catch (error: any) {
    console.error('Error updating plaza:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE plaza
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const { error } = await (supabaseAdmin
      .from('auction_plazas') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting plaza:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

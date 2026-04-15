import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT update auction
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
    const { plaza_id, auction_date, commission } = data;

    const { data: updatedAuction, error } = await (supabaseAdmin
      .from('auctions') as any)
      .update({ plaza_id, auction_date, commission })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updatedAuction);
  } catch (error: any) {
    console.error('Error updating auction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE auction
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
      .from('auctions') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting auction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

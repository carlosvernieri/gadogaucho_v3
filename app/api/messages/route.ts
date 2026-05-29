import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const { listingId, name, email, phone, message } = await request.json();

    if (!listingId || !name || !email || !phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const rawPhone = phone ? phone.replace(/\D/g, '') : '';
    if (rawPhone.length !== 11) {
      return NextResponse.json({ error: 'Telefone inválido. Utilize o formato (xx) xxxx xxxxx' }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin
      .from('messages') as any)
      .insert([
        { 
          listing_id: listingId, 
          sender_name: name, 
          sender_email: email, 
          sender_phone: phone, 
          message 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error saving message:', error);
      throw error;
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: messages, error } = await (supabaseAdmin
      .from('messages') as any)
      .select(`
        *,
        listings!inner (
          title,
          image,
          user_id
        )
      `)
      .eq('listings.user_id', session.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching messages:', error);
      throw error;
    }

    const mappedMessages = messages.map((m: any) => ({
      ...m,
      listing_title: m.listings.title,
      listing_image: m.listings.image
    }));
    return NextResponse.json(mappedMessages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, is_read } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data: messageCheck } = await (supabaseAdmin.from('messages') as any)
      .select('listings(user_id)')
      .eq('id', id)
      .single();

    if (!messageCheck || messageCheck.listings?.user_id !== session.id) {
       if (!session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await (supabaseAdmin
      .from('messages') as any)
      .update({ is_read: !!is_read })
      .eq('id', id);
    
    if (error) {
      console.error('Supabase error updating message:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }
  try {
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data: messageCheck } = await (supabaseAdmin.from('messages') as any)
      .select('listings(user_id)')
      .eq('id', id)
      .single();

    if (!messageCheck || messageCheck.listings?.user_id !== session.id) {
       if (!session.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await (supabaseAdmin
      .from('messages') as any)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase error deleting message:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


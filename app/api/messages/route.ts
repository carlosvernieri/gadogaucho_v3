import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { listingId, name, email, phone, message } = await request.json();

    if (!listingId || !name || !email || !phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get user ID from email
    const { data: user, error: userError } = await (supabaseAdmin
      .from('users') as any)
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('User not found for messages:', userError);
      return NextResponse.json([]);
    }

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
      .eq('listings.user_id', user.id)
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
  try {
    const { id, is_read } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
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

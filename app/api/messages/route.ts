import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { listingId, name, email, phone, message } = await request.json();

    if (!listingId || !name || !email || !phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
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
        // Fallback to SQLite if Supabase fails (e.g., table doesn't exist)
      } else {
        return NextResponse.json({ success: true, id: data.id });
      }
    }

    const result = db.prepare(`
      INSERT INTO messages (listing_id, sender_name, sender_email, sender_phone, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(listingId, name, email, phone, message);

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
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

    if (isSupabaseConfigured()) {
      const { data: messages, error } = await (supabaseAdmin
        .from('messages') as any)
        .select(`
          *,
          listings!inner (
            title,
            image,
            users!inner (
              email
            )
          )
        `)
        .eq('listings.users.email', email)
        .order('created_at', { ascending: false });

      if (!error && messages) {
        const mappedMessages = messages.map((m: any) => ({
          ...m,
          listing_title: m.listings.title,
          listing_image: m.listings.image
        }));
        return NextResponse.json(mappedMessages);
      }
      console.error('Supabase error fetching messages:', error);
    }

    // Get messages for listings owned by this user using SQLite
    const messages = db.prepare(`
      SELECT m.*, l.title as listing_title, l.image as listing_image
      FROM messages m
      JOIN listings l ON m.listing_id = l.id
      JOIN users u ON l.userId = u.id
      WHERE u.email = ?
      ORDER BY m.created_at DESC
    `).all(email);

    return NextResponse.json(messages);
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

    if (isSupabaseConfigured()) {
      const { error } = await (supabaseAdmin
        .from('messages') as any)
        .update({ is_read: !!is_read })
        .eq('id', id);
      
      if (!error) return NextResponse.json({ success: true });
      console.error('Supabase error updating message:', error);
    }

    db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, id);

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

    if (isSupabaseConfigured()) {
      const { error } = await (supabaseAdmin
        .from('messages') as any)
        .delete()
        .eq('id', id);
      
      if (!error) return NextResponse.json({ success: true });
      console.error('Supabase error deleting message:', error);
    }

    db.prepare('DELETE FROM messages WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

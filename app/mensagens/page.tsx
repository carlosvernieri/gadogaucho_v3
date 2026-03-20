'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Trash2, CheckCircle, Clock, MessageSquare, User, Phone, ExternalLink, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function MensagensPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('gado_gaucho_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchMessages(parsedUser.email);
    } else {
      router.push('/');
    }

    // Fetch listings for sidebar
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => setListings(data))
      .catch(err => console.error('Error fetching listings:', err));
  }, [router]);

  const fetchMessages = async (email: string) => {
    try {
      const res = await fetch(`/api/messages?email=${email}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number, currentRead: boolean) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: !currentRead })
      });

      if (res.ok) {
        setMessages(messages.map(m => m.id === id ? { ...m, is_read: !currentRead ? 1 : 0 } : m));
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;

    try {
      const res = await fetch(`/api/messages?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessages(messages.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Header 
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={() => router.push('/')}
        onAdClick={() => router.push('/')}
        onAdminClick={() => router.push('/')}
        onLogout={() => {
          setUser(null);
          localStorage.removeItem('gado_gaucho_user');
          router.push('/');
        }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
      />

      <div className="flex-1 max-w-[1440px] mx-auto w-full flex px-4 lg:px-8 py-8 gap-8 relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedCategory={null}
          onSelectCategory={(cat) => {
            if (cat) router.push(`/?category=${encodeURIComponent(cat)}`);
            else router.push('/');
          }}
          searchQuery=""
          onSearchChange={() => {}}
          listingsCount={listings.length}
          getCategoryCount={(catName) => listings.filter(l => l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch=""
          onCitySearchChange={() => {}}
          maxDistance={100}
          onMaxDistanceChange={() => {}}
          onUseMyLocation={() => {}}
          citySuggestions={[]}
          onSelectCity={() => {}}
          showSuggestions={false}
          setShowSuggestions={() => {}}
        />

        <main className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#333]">Mensagens Recebidas</h1>
              <p className="text-[#999] mt-1">Gerencie os contatos interessados em seus anúncios</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-2xl border border-[#E9ECEF] flex items-center gap-2">
              <Mail size={18} className="text-[#2D5A27]" />
              <span className="text-sm font-bold text-[#333]">{messages.length} mensagens</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin mb-4" />
              <p className="text-[#999] font-medium">Carregando mensagens...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-[#E9ECEF] shadow-sm">
              <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#999]">
                <MessageSquare size={40} />
              </div>
              <h3 className="text-xl font-bold text-[#333] mb-2">Nenhuma mensagem ainda</h3>
              <p className="text-[#999] max-w-md mx-auto">Quando alguém se interessar por seus animais, as mensagens aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-3xl p-6 border transition-all ${msg.is_read ? 'border-[#E9ECEF] opacity-80' : 'border-[#2D5A27] shadow-md ring-1 ring-[#2D5A27]/10'}`}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Listing Info */}
                    <div className="md:w-48 flex-shrink-0">
                      <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100">
                        <Image 
                          src={msg.listing_image || 'https://picsum.photos/seed/cow/400/400'} 
                          alt={msg.listing_title} 
                          fill 
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {!msg.is_read && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-[#2D5A27] rounded-full ring-2 ring-white" />
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-[#333] line-clamp-2 mb-1">{msg.listing_title}</h4>
                      <button 
                        onClick={() => router.push(`/anuncio/${msg.listing_id}`)}
                        className="text-[10px] font-bold text-[#2D5A27] flex items-center gap-1 hover:underline"
                      >
                        Ver anúncio <ExternalLink size={10} />
                      </button>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
                              <User size={16} />
                            </div>
                            <span className="text-sm font-bold text-[#333]">{msg.sender_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#666]">
                            <Clock size={14} />
                            <span className="text-xs">{new Date(msg.created_at).toLocaleDateString('pt-BR')} às {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMarkAsRead(msg.id, !!msg.is_read)}
                            className={`p-2 rounded-xl transition-all ${msg.is_read ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                            title={msg.is_read ? "Marcar como não lida" : "Marcar como lida"}
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                            title="Excluir mensagem"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF]">
                          <Phone size={16} className="text-[#2D5A27]" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#999] uppercase">Telefone</span>
                            <span className="text-xs font-bold text-[#333]">{msg.sender_phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF]">
                          <Mail size={16} className="text-[#2D5A27]" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#999] uppercase">E-mail</span>
                            <span className="text-xs font-bold text-[#333]">{msg.sender_email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF] relative">
                        <MessageSquare size={16} className="absolute top-4 left-4 text-[#999] opacity-20" />
                        <p className="text-sm text-[#666] leading-relaxed pl-6 italic">
                          "{msg.message}"
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

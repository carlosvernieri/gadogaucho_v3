'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal, showToast } from '@/components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Trash2, CheckCircle, Clock, MessageSquare, User, Phone, ExternalLink, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { useUser } from '@/context/UserContext';
import { safeJsonStringify } from '@/lib/utils';

export default function MensagensPage() {
  const router = useRouter();
  const { user, setUser, logout, setAuthMode, setShowAuthModal } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'success' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);

  const sortedMessages = React.useMemo(() => {
    return [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [messages]);

  const toggleMessage = (id: number, isRead: boolean | number) => {
    if (expandedMessageId === id) {
      setExpandedMessageId(null);
    } else {
      setExpandedMessageId(id);
      if (!isRead) {
        handleMarkAsRead(id, false);
      }
    }
  };

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
        body: safeJsonStringify({ id, is_read: !currentRead })
      });

      if (res.ok) {
        setMessages(messages.map(m => m.id === id ? { ...m, is_read: !currentRead ? 1 : 0 } : m));
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Mensagem',
      message: 'Tem certeza que deseja excluir esta mensagem?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/messages?id=${id}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            setMessages(prev => prev.filter(m => m.id !== id));
            showToast('Mensagem excluída com sucesso!', 'success');
          } else {
            showToast('Erro ao excluir mensagem.', 'error');
          }
        } catch (error) {
          console.error('Error deleting message:', error);
          showToast('Erro de conexão.', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] pb-20 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/')}
        onLogout={() => {
          logout();
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
          onSearchChange={() => { }}
          listingsCount={listings.filter(l => !l.sold).length}
          getCategoryCount={(catName) => listings.filter(l => !l.sold && l.category.toLowerCase() === catName.toLowerCase()).length}
          citySearch=""
          onCitySearchChange={() => { }}
          maxDistance={100}
          onMaxDistanceChange={() => { }}
          onUseMyLocation={() => { }}
          citySuggestions={[]}
          onSelectCity={() => { }}
          showSuggestions={false}
          setShowSuggestions={() => { }}
        />

        <main className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#333]">Mensagens Recebidas</h1>
              <p className="text-[#999] mt-1 text-sm sm:text-base">Gerencie os contatos interessados em seus anúncios</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-2xl border border-[#E9ECEF] inline-flex w-fit items-center gap-2">
              <Mail size={18} className="text-[#2D5A27]" />
              <span className="text-sm font-bold text-[#333]">{messages.length} mensagens</span>
            </div>
          </div>

          {loading ? (
            <LoadingScreen fullScreen={false} message="Carregando mensagens..." />
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
              {sortedMessages.map((msg) => {
                const isExpanded = expandedMessageId === msg.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-3xl overflow-hidden border transition-all ${msg.is_read ? 'border-[#E9ECEF] opacity-90' : 'border-[#2D5A27] shadow-sm ring-1 ring-[#2D5A27]/20'}`}
                  >
                    {/* Header - Clickable for collapse */}
                    <div 
                      onClick={() => toggleMessage(msg.id, msg.is_read)}
                      className={`p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-[#F8F9FA] transition-colors gap-4 ${!msg.is_read ? 'bg-[#E9F0E8]/30' : ''}`}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Indicador de cor */}
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${msg.is_read ? 'bg-[#E9ECEF]' : 'bg-[#2D5A27] animate-pulse shadow-sm shadow-[#2D5A27]/50'}`} />
                        
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.is_read ? 'bg-[#F8F9FA] text-[#999]' : 'bg-[#E9F0E8] text-[#2D5A27]'}`}>
                            <User size={18} />
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span className={`font-bold truncate ${msg.is_read ? 'text-[#666]' : 'text-[#333]'}`}>{msg.sender_name}</span>
                            <span className="text-[10px] sm:text-xs text-[#999] whitespace-nowrapflex items-center gap-1">
                              <Clock size={12} className="inline mr-1" />
                              {new Date(msg.created_at).toLocaleDateString('pt-BR')} às {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="text-xs text-[#666] truncate mt-1">Interesse em: <strong className="text-[#333]">{msg.listing_title}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        {msg.is_read && <span className="hidden sm:inline-block text-[10px] font-bold text-[#999] uppercase bg-[#F8F9FA] px-2 py-1 rounded-md">Lida</span>}
                        {!msg.is_read && <span className="hidden sm:inline-block text-[10px] font-bold text-[#2D5A27] uppercase bg-[#E9F0E8] px-2 py-1 rounded-md">Nova</span>}
                        <div className={`p-2 rounded-full transition-transform ${isExpanded ? 'rotate-180 bg-[#F8F9FA]' : ''}`}>
                          <ChevronDown size={20} className="text-[#999]" />
                        </div>
                      </div>
                    </div>

                    {/* Body - Collapsible Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="p-4 sm:p-6 border-t border-[#E9ECEF] bg-[#F8F9FA]/50">
                            <div className="flex flex-col md:flex-row gap-6">
                              {/* Listing Info */}
                              <div className="md:w-56 flex-shrink-0 bg-white p-3 rounded-2xl border border-[#E9ECEF]">
                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-gray-100">
                                  <Image
                                    src={msg.listing_image || 'https://picsum.photos/seed/cow/400/300'}
                                    alt={msg.listing_title}
                                    fill
                                    className="object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <h4 className="text-sm font-bold text-[#333] line-clamp-2 mb-2">{msg.listing_title}</h4>
                                <button
                                  onClick={() => router.push(`/anuncio/${msg.listing_id}`)}
                                  className="w-full py-2 bg-[#F8F9FA] hover:bg-[#E9ECEF] text-xs font-bold text-[#333] rounded-xl flex items-center justify-center gap-1 transition-colors"
                                >
                                  Ver anúncio detalhado <ExternalLink size={12} />
                                </button>
                              </div>

                              {/* Message Content */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E9ECEF]">
                                      <div className="w-8 h-8 rounded-full bg-[#E9F0E8] flex items-center justify-center">
                                        <Phone size={14} className="text-[#2D5A27]" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-[#999] uppercase">Telefone de Contato</span>
                                        <span className="text-xs font-bold text-[#333] truncate">{msg.sender_phone}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E9ECEF]">
                                      <div className="w-8 h-8 rounded-full bg-[#E9F0E8] flex items-center justify-center">
                                        <Mail size={14} className="text-[#2D5A27]" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-[#999] uppercase">E-mail de Contato</span>
                                        <span className="text-xs font-bold text-[#333] truncate">{msg.sender_email}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E9ECEF] relative shadow-sm">
                                    <MessageSquare size={16} className="absolute top-4 left-4 text-[#999] opacity-20" />
                                    <p className="text-sm text-[#444] leading-relaxed pl-6 italic break-words">
                                      "{msg.message}"
                                    </p>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 mt-6">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMarkAsRead(msg.id, !!msg.is_read); }}
                                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${msg.is_read ? 'bg-gray-200 text-[#666] hover:bg-gray-300' : 'bg-[#E9F0E8] text-[#2D5A27] hover:bg-[#D5E6D3]'}`}
                                    title={msg.is_read ? "Marcar como não lida" : "Marcar como lida"}
                                  >
                                    <CheckCircle size={14} />
                                    {msg.is_read ? "Marcar como não lida" : "Marcar como lida"}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                                    className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-all flex items-center gap-1.5"
                                    title="Excluir mensagem permanente"
                                  >
                                    <Trash2 size={14} /> Excluir
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {user && (
        <BottomNav
          user={user}
          onAdClick={() => router.push('/?ad=new')}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}

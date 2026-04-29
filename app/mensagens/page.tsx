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
import { safeJsonStringify, getListingUrl } from '@/lib/utils';

export default function MensagensPage() {
  const router = useRouter();
  const { user, isAuthReady, logout, setAuthMode, setShowAuthModal } = useUser();
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
    if (isAuthReady) {
      if (!user) {
        console.log('MensagensPage: Usuário não autenticado. Redirecionando...');
        router.push('/');
      } else {
        fetchMessages(user.email);
      }
    }

    // Fetch listings for sidebar
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => setListings(data || []))
      .catch(err => console.error('Error fetching listings:', err));
  }, [user, isAuthReady, router]);

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

  const handlePhoneClick = (phone: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Abrir WhatsApp',
      message: `Deseja abrir o WhatsApp para falar com ${name} no número ${phone}?`,
      type: 'info',
      onConfirm: () => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${cleanPhone}`, '_blank');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEmailClick = (email: string, name: string, subject: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Enviar E-mail',
      message: `Deseja abrir o aplicativo de e-mail padrão para escrever para ${name}?`,
      type: 'info',
      onConfirm: () => {
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
        onAdminClick={() => router.push('/admin')}
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

        <main className="flex-1 min-w-0 w-full max-w-5xl mx-auto mt-4 lg:mt-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#E9F0E8] flex items-center justify-center text-[#2D5A27]">
              <MessageSquare size={24} />
            </div>
            <div>
              <h1 className="text-xl lg:text-4xl font-bold text-[#1A1A1A] tracking-tight mb-0.5">
                Mensagens Recebidas
              </h1>
              <p className="text-sm text-[#666] leading-relaxed">
                Gerencie os contatos interessados em seus anúncios
              </p>
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
            <div className="bg-white rounded-3xl border border-[#E9ECEF] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#E9ECEF] flex flex-col md:flex-row md:items-center justify-between bg-[#FDFDFD] gap-2">
                <h2 className="text-xl font-bold text-[#2D5A27] flex items-center gap-2">
                  <Mail size={24} /> Caixa de Entrada
                </h2>
                <div className="text-sm font-medium text-[#999] flex items-center gap-1">
                  <span>Total de {messages.length} mensagens</span>
                </div>
              </div>
              <div className="flex flex-col">
                {sortedMessages.map((msg, idx) => {
                  const isExpanded = expandedMessageId === msg.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col bg-white transition-all ${idx !== sortedMessages.length - 1 ? 'border-b border-[#E9ECEF]' : ''} ${!msg.is_read ? 'bg-[#FFF5F5]/30' : ''}`}
                    >
                    <div
                      onClick={() => toggleMessage(msg.id, msg.is_read)}
                      className={`p-3 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-[#F8F9FA] transition-colors gap-2 sm:gap-4 ${!msg.is_read ? 'bg-[#E9F0E8]/30' : ''}`}
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        {/* Indicador de cor */}
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${msg.is_read ? 'bg-[#2D5A27] shadow-sm shadow-[#2D5A27]/30' : 'bg-[#DC3545] animate-pulse shadow-sm shadow-[#DC3545]/40'}`} title={msg.is_read ? 'Mensagem lida' : 'Mensagem não lida'} />

                        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.is_read ? 'bg-[#F8F9FA] text-[#999]' : 'bg-[#FFF0F0] text-[#DC3545]'}`}>
                            <User size={18} />
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
                            <span className={`font-bold truncate text-sm sm:text-base ${msg.is_read ? 'text-[#666]' : 'text-[#333]'}`}>{msg.sender_name}</span>
                            <span className="text-[12px] sm:text-xs text-[#999] flex items-center gap-1 sm:truncate mt-0.5 sm:mt-0">
                              <Clock size={10} className="flex-shrink-0" />
                              <span className="truncate">{new Date(msg.created_at).toLocaleDateString('pt-BR')} às {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </div>
                          <span className="text-[12px] sm:text-xs text-[#666] truncate mt-1">Interesse em: <strong className="text-[#333]">{msg.listing_title}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {msg.is_read ? (
                          <span className="hidden sm:inline-block text-[12px] font-bold text-[#2D5A27] uppercase bg-[#E9F0E8] px-2 py-1 rounded-md">Lida</span>
                        ) : (
                          <span className="hidden sm:inline-block text-[12px] font-bold text-[#DC3545] uppercase bg-[#FFF0F0] px-2 py-1 rounded-md">Nova</span>
                        )}
                        <div className={`p-1.5 sm:p-2 rounded-full transition-transform ${isExpanded ? 'rotate-180 bg-[#F8F9FA]' : ''}`}>
                          <ChevronDown size={18} className="text-[#999] sm:w-5 sm:h-5" />
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
                          <div className="p-4 sm:p-6 bg-[#FDFDFD] border-t border-[#E9ECEF]">
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
                                  onClick={() => {
                                    const listing = listings.find(l => l.id === msg.listing_id);
                                    router.push(listing ? getListingUrl(listing) : `/anuncio/${msg.listing_id}`);
                                  }}
                                  className="w-full py-2 bg-[#F8F9FA] hover:bg-[#E9ECEF] text-xs font-bold text-[#333] rounded-xl flex items-center justify-center gap-1 transition-colors"
                                >
                                  Ver anúncio detalhado <ExternalLink size={12} />
                                </button>
                              </div>

                              {/* Message Content */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePhoneClick(msg.sender_phone, msg.sender_name); }}
                                      className="flex items-center gap-3 p-3 bg-white hover:bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] transition-colors text-left group"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-[#E9F0E8] flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Phone size={14} className="text-[#2D5A27]" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-[#999] uppercase">Telefone de Contato</span>
                                        <span className="text-xs font-bold text-[#333] truncate group-hover:text-[#2D5A27] transition-colors">{msg.sender_phone}</span>
                                      </div>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEmailClick(msg.sender_email, msg.sender_name, msg.listing_title); }}
                                      className="flex items-center gap-3 p-3 bg-white hover:bg-[#F8F9FA] rounded-xl border border-[#E9ECEF] transition-colors text-left group"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-[#E9F0E8] flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Mail size={14} className="text-[#2D5A27]" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-[#999] uppercase">E-mail de Contato</span>
                                        <span className="text-xs font-bold text-[#333] truncate group-hover:text-[#2D5A27] transition-colors">{msg.sender_email}</span>
                                      </div>
                                    </button>
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

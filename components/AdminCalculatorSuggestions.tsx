'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  Briefcase, 
  MessageSquare, 
  Calendar,
  X,
  Eye,
  Search,
  ExternalLink
} from 'lucide-react';
import { showToast } from '@/components/ConfirmModal';

interface Suggestion {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  profession: string;
  description: string;
}

export function AdminCalculatorSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/suggest-calculator');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      showToast('Erro ao carregar sugestões.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sugestão?')) return;

    try {
      const res = await fetch(`/api/suggest-calculator?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== id));
        showToast('Sugestão excluída com sucesso!', 'success');
        if (selectedSuggestion?.id === id) setSelectedSuggestion(null);
      } else {
        showToast('Erro ao excluir sugestão.', 'error');
      }
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      showToast('Erro de conexão.', 'error');
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-[#E9ECEF]">
        <div className="w-12 h-12 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin mb-4" />
        <p className="text-[#666] font-medium">Carregando sugestões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="text-[#2D5A27]" size={20} />
          <h3 className="text-lg font-bold text-[#333]">Sugestões de Calculadoras</h3>
          <span className="bg-[#E9F0E8] text-[#2D5A27] text-[10px] px-2 py-0.5 rounded-full font-bold">
            {suggestions.length} RECEBIDAS
          </span>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
          <input
            type="text"
            placeholder="Buscar sugestão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-[#2D5A27] transition-all"
          />
        </div>
      </div>

      {/* Suggestions List */}
      <div className="bg-white rounded-3xl border border-[#E9ECEF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F1F3F5] text-[#999] font-bold text-[10px] uppercase tracking-wider">
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Remetente</th>
                <th className="py-4 px-6">Profissão</th>
                <th className="py-4 px-6">Breve Descrição</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8F9FA]">
              {filteredSuggestions.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8F9FA]/50 transition-colors group">
                  <td className="py-4 px-6 text-[#666] font-medium">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-[#333]">{s.name}</div>
                    <div className="text-[11px] text-[#999]">{s.email}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[10px] font-bold bg-[#F1F3F5] text-[#666] px-2 py-0.5 rounded-full uppercase tracking-tight">
                      {s.profession}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[#666] max-w-xs truncate">
                    {s.description}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedSuggestion(s)}
                        className="p-2 text-[#2D5A27] hover:bg-[#E9F0E8] rounded-lg transition-all"
                        title="Ver Detalhes"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-2 text-[#DC3545] hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuggestions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#999]">
                    Nenhuma sugestão encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedSuggestion && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSuggestion(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-[#F1F3F5] flex items-center justify-between bg-gradient-to-r from-[#2D5A27]/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white">
                    <Calculator size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#1A1A1A]">Detalhes da Sugestão</h3>
                    <p className="text-xs text-[#999] font-bold uppercase tracking-wider">
                      Recebido em {new Date(selectedSuggestion.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSuggestion(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#999] hover:bg-[#F8F9FA] hover:text-[#333] transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-8">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#999] uppercase flex items-center gap-1.5">
                      <User size={12} className="text-[#2D5A27]" /> Nome Completo
                    </span>
                    <p className="text-sm font-bold text-[#333]">{selectedSuggestion.name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#999] uppercase flex items-center gap-1.5">
                      <Briefcase size={12} className="text-[#2D5A27]" /> Profissão
                    </span>
                    <p className="text-sm font-bold text-[#333]">{selectedSuggestion.profession}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#999] uppercase flex items-center gap-1.5">
                      <Phone size={12} className="text-[#2D5A27]" /> WhatsApp
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#333]">{selectedSuggestion.phone}</p>
                      <a 
                        href={`https://wa.me/55${selectedSuggestion.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2D5A27] hover:underline text-xs flex items-center gap-1 font-bold"
                      >
                        Abrir <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#999] uppercase flex items-center gap-1.5">
                      <Mail size={12} className="text-[#2D5A27]" /> E-mail
                    </span>
                    <p className="text-sm font-bold text-[#333]">{selectedSuggestion.email}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="p-6 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF]">
                  <span className="text-[10px] font-bold text-[#999] uppercase flex items-center gap-1.5 mb-4">
                    <MessageSquare size={12} className="text-[#2D5A27]" /> Ferramenta Solicitada
                  </span>
                  <p className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">
                    {selectedSuggestion.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setSelectedSuggestion(null)}
                    className="px-6 py-3 text-sm font-bold text-[#666] hover:bg-[#F8F9FA] rounded-xl transition-all"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSuggestion.id)}
                    className="px-6 py-3 bg-red-50 text-[#DC3545] text-sm font-bold rounded-xl hover:bg-red-100 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Excluir Sugestão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

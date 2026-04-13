'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronUp, Bell, Share2, Search, Mail, Loader2, CheckCircle2, MapPin, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { RS_CITIES } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { ShareModal } from '@/components/ShareModal';

const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const mockPraças = [
  {
    cidade: 'Glorinha (Sta Ursula)',
    boiGordo: 10.50,
    vacaGorda: 9.20,
    terneiro: 13.80,
    novilha: 9.80,
    tendencia: 'up',
    history: [
      { name: 'Semana 1', boi: 10.10, vaca: 8.80 },
      { name: 'Semana 2', boi: 10.30, vaca: 8.90 },
      { name: 'Semana 3', boi: 10.40, vaca: 9.10 },
      { name: 'Atual', boi: 10.50, vaca: 9.20 }
    ]
  },
  {
    cidade: 'Mostardas',
    boiGordo: 10.20,
    vacaGorda: 8.90,
    terneiro: 13.50,
    novilha: 9.50,
    tendencia: 'stable',
    history: [
      { name: 'Semana 1', boi: 10.30, vaca: 8.90 },
      { name: 'Semana 2', boi: 10.25, vaca: 8.85 },
      { name: 'Semana 3', boi: 10.20, vaca: 8.80 },
      { name: 'Atual', boi: 10.20, vaca: 8.90 }
    ]
  },
  {
    cidade: 'Butiá',
    boiGordo: 10.10,
    vacaGorda: 8.80,
    terneiro: 13.20,
    novilha: 9.40,
    tendencia: 'down',
    history: [
      { name: 'Semana 1', boi: 10.50, vaca: 9.20 },
      { name: 'Semana 2', boi: 10.40, vaca: 9.10 },
      { name: 'Semana 3', boi: 10.20, vaca: 8.90 },
      { name: 'Atual', boi: 10.10, vaca: 8.80 }
    ]
  },
  {
    cidade: 'Guaíba',
    boiGordo: 10.40,
    vacaGorda: 9.10,
    terneiro: 13.70,
    novilha: 9.70,
    tendencia: 'up',
    history: [
      { name: 'Semana 1', boi: 9.90, vaca: 8.60 },
      { name: 'Semana 2', boi: 10.10, vaca: 8.80 },
      { name: 'Semana 3', boi: 10.30, vaca: 9.00 },
      { name: 'Atual', boi: 10.40, vaca: 9.10 }
    ]
  },
  {
    cidade: 'São Sepé',
    boiGordo: 10.00,
    vacaGorda: 8.70,
    terneiro: 13.10,
    novilha: 9.30,
    tendencia: 'stable',
    history: [
      { name: 'Semana 1', boi: 10.00, vaca: 8.70 },
      { name: 'Semana 2', boi: 9.90, vaca: 8.60 },
      { name: 'Semana 3', boi: 10.10, vaca: 8.80 },
      { name: 'Atual', boi: 10.00, vaca: 8.70 }
    ]
  }
];

export default function PrecoDoGadoPage() {
  const router = useRouter();
  const { user, logout, setAuthMode, setShowAuthModal } = useUser();
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  // States for Newsletter Modal
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', city: '' });

  // State for Share Modal
  const [showShareModal, setShowShareModal] = useState(false);

  // States for City Autocomplete inside Modal
  const [citySearch, setCitySearch] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // States for Math Captcha
  const [captchaParams, setCaptchaParams] = useState({ n1: 0, n2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  useEffect(() => {
    if (showNewsletterModal && !newsletterSuccess) {
      setCaptchaParams({ n1: Math.floor(Math.random() * 9) + 1, n2: Math.floor(Math.random() * 9) + 1 });
      setCaptchaAnswer('');
    }
  }, [showNewsletterModal, newsletterSuccess]);

  const citySuggestions = useMemo(() => {
    if (!showCitySuggestions) return [];
    if (citySearch.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()));
  }, [citySearch, showCitySuggestions]);

  const toggleCity = (cidade: string) => {
    if (expandedCity === cidade) {
      setExpandedCity(null);
    } else {
      setExpandedCity(cidade);
    }
  };

  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} className="text-emerald-600" />;
      case 'down': return <TrendingDown size={16} className="text-red-500" />;
      default: return <Minus size={16} className="text-gray-400" />;
    }
  };

  const renderChart = (history: any[]) => (
    <div className="w-full h-[250px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#999' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `R$${value.toFixed(2)}`} />
          <RechartsTooltip
            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #E9ECEF', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="boi" name="Boi Gordo" stroke="#2D5A27" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="vaca" name="Vaca Gorda" stroke="#87C036" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col pb-24 lg:pb-0 bg-[#F8F9FA]">
      <Header
        user={user}
        onMenuClick={() => { }}
        onAuthClick={(mode) => { setAuthMode(mode as 'login' | 'register'); setShowAuthModal(true); }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/')}
        onLogout={() => { logout(); router.push('/'); }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
        onMyAdsClick={() => router.push('/meus-anuncios')}
        onMessagesClick={() => router.push('/mensagens')}
      />
      <main className="max-w-5xl mx-auto px-4 lg:px-8 py-8 w-full mt-4">

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] tracking-tight mb-2">
            Cotação e Inteligência de Mercado
          </h1>
          <p className="text-[#666] leading-relaxed">
            Consulte os preços médios do Quilo Vivo (R$/kg) nas principais praças pecuárias do Rio Grande do Sul.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setShowNewsletterModal(true)}
            className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl hover:bg-[#1E3D1A] transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-[#2D5A27]/20"
          >
            <Mail size={18} /> Assinar Boletim (Grátis)
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 bg-white border border-[#E9ECEF] text-[#666] rounded-xl hover:text-[#2D5A27] hover:border-[#2D5A27] transition-all flex items-center gap-2 text-sm font-bold shadow-sm"
          >
            <Share2 size={18} /> Compartilhar
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-3xl border border-[#E9ECEF] overflow-hidden shadow-sm">

          <div className="p-6 border-b border-[#E9ECEF] flex flex-col md:flex-row md:items-center justify-between bg-[#FDFDFD] gap-2">
            <h2 className="text-xl font-bold text-[#2D5A27] flex items-center gap-2">
              Tabela de Preços (Mock)
            </h2>
            <div className="text-sm font-medium text-[#999] flex items-center gap-1">
              <Info size={16} /> Última atualização: Hoje
            </div>
          </div>

          {/* Versão Desktop (Tabela Clássica com Accordion) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[11px] uppercase tracking-wider text-[#666]">
                  <th className="p-4 font-bold">Praça Geográfica</th>
                  <th className="p-4 font-bold text-center">Boi Gordo</th>
                  <th className="p-4 font-bold text-center">Vaca Gorda</th>
                  <th className="p-4 font-bold text-center">Terneiro</th>
                  <th className="p-4 font-bold text-center">Novilha</th>
                  <th className="p-4 text-center font-bold">Tendência</th>
                  <th className="p-4 text-center font-bold w-12"></th>
                </tr>
              </thead>
              <tbody>
                {mockPraças.map((praca, idx) => (
                  <React.Fragment key={praca.cidade}>
                    <tr
                      onClick={() => toggleCity(praca.cidade)}
                      className={`border-b border-[#E9ECEF] hover:bg-[#F8F9FA] transition-colors cursor-pointer ${idx === mockPraças.length - 1 && expandedCity !== praca.cidade ? 'border-b-0' : ''}`}
                    >
                      <td className="p-4 font-bold text-[#333] whitespace-nowrap">
                        {praca.cidade}
                      </td>
                      <td className="p-4 text-center text-[#666] font-medium">
                        R$ {praca.boiGordo.toFixed(2)}
                      </td>
                      <td className="p-4 text-center text-[#666] font-medium">
                        R$ {praca.vacaGorda.toFixed(2)}
                      </td>
                      <td className="p-4 text-center text-[#666] font-medium">
                        R$ {praca.terneiro.toFixed(2)}
                      </td>
                      <td className="p-4 text-center text-[#666] font-medium">
                        R$ {praca.novilha.toFixed(2)}
                      </td>
                      <td className="p-4 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white border border-[#E9ECEF] flex items-center justify-center shadow-sm">
                          {renderTrendIcon(praca.tendencia)}
                        </div>
                      </td>
                      <td className="p-4 text-[#999]">
                        {expandedCity === praca.cidade ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </td>
                    </tr>

                    {/* Gaveta do Accordion Desktop */}
                    {expandedCity === praca.cidade && (
                      <tr className="bg-[#FDFDFD] border-b border-[#E9ECEF]">
                        <td colSpan={7} className="p-0">
                          <div className="p-6 lg:p-8 flex flex-col items-center">
                            <h3 className="text-[#333] font-bold text-lg mb-2">Evolução Gráfica - {praca.cidade}</h3>
                            <p className="text-sm text-[#666] mb-4">Veja a flutuação do Kg Vivo nas últimas 4 semanas de amostragem.</p>
                            {renderChart(praca.history)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile (Cards Responsivos com Accordion) */}
          <div className="md:hidden flex flex-col">
            {mockPraças.map((praca, idx) => (
              <div key={praca.cidade} className={`flex flex-col ${idx !== mockPraças.length - 1 ? 'border-b border-[#E9ECEF]' : ''}`}>

                {/* Cabeçalho do Card (Clicável) */}
                <div
                  className="p-5 flex flex-col gap-4 cursor-pointer hover:bg-[#F8F9FA] transition-colors active:bg-[#E9ECEF]"
                  onClick={() => toggleCity(praca.cidade)}
                >
                  <div className="flex items-center justify-between border-b border-[#F8F9FA] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#333] text-lg">{praca.cidade}</span>
                      <div className="w-8 h-8 rounded-full bg-[#F8F9FA] border border-[#E9ECEF] flex items-center justify-center shadow-sm">
                        {renderTrendIcon(praca.tendencia)}
                      </div>
                    </div>
                    <div className="text-[#999]">
                      {expandedCity === praca.cidade ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                    <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                      <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Boi Gordo</span>
                      <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.boiGordo.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                      <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Vaca Gorda</span>
                      <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.vacaGorda.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                      <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Terneiro</span>
                      <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.terneiro.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF] items-center text-center">
                      <span className="text-[10px] uppercase font-bold text-[#999] mb-1 tracking-wider">Novilha</span>
                      <span className="text-[15px] font-bold text-[#2D5A27]">R$ {praca.novilha.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Gaveta do Accordion Mobile */}
                {expandedCity === praca.cidade && (
                  <div className="p-4 bg-[#FDFDFD] border-t border-[#E9ECEF] flex flex-col items-center">
                    <h3 className="text-[#333] font-bold text-center">Histórico Gráfico</h3>
                    <span className="text-xs text-[#666] text-center mb-2">Últimas 4 semanas</span>
                    {renderChart(praca.history)}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Helper Note */}
        <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-3">
          <Info size={20} className="text-orange-500 shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800 leading-relaxed">
            <strong>Disclaimer:</strong> Os valores presentes nesta tela atualmente são fictícios (Mock) servindo apenas para demonstração do layout sob aprovação.
            Futuramente serão substituídos pelos dados reais das praças locais.
          </p>
        </div>

      </main>

      {/* Newsletter Modal */}
      <AnimatePresence>
        {showNewsletterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowNewsletterModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-[#E9ECEF] flex items-center justify-between sticky top-0 bg-white z-20">
                <h3 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Mail className="text-[#2D5A27]" size={20} /> Assinar Boletim Diário
                </h3>
                <button
                  onClick={() => setShowNewsletterModal(false)}
                  className="p-2 text-[#999] hover:text-[#333] hover:bg-[#F8F9FA] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {newsletterSuccess ? (
                  <div className="py-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h4 className="text-xl font-bold text-[#333] mb-2">Inscrição Concluída!</h4>
                    <p className="text-[#666]">Você começará a receber nossos alertas de mercado na sua caixa de entrada e telefone diariamente.</p>
                  </div>
                ) : (
                  <form className="flex flex-col gap-4" onSubmit={async (e) => {
                    e.preventDefault();
                    if (parseInt(captchaAnswer) !== (captchaParams.n1 + captchaParams.n2)) {
                      alert('Resposta matemática incorreta. Tente novamente para confirmar que é humano.');
                      return;
                    }
                    if (!formData.name || !formData.phone || !formData.email || !formData.city) {
                      alert('Por favor, preencha todos os campos.');
                      return;
                    }

                    setNewsletterLoading(true);
                    try {
                      const { error } = await (supabase as any).from('newsletter').insert([{
                        name: formData.name,
                        phone: formData.phone,
                        email: formData.email,
                        city: formData.city
                      }]);
                      if (error) throw error;
                      setNewsletterSuccess(true);
                    } catch (err) {
                      console.error('Error inserting newsletter:', err);
                      alert('Ocorreu um erro ao assinar. Tente novamente.');
                    } finally {
                      setNewsletterLoading(false);
                    }
                  }}>

                    <p className="text-sm text-[#666] mb-2 leading-relaxed">
                      Assine grátis para receber variações de preço do gado gordo direto das principais praças da região sul.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-[#666] mb-1">Seu Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                        placeholder="Ex: João da Silva"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#666] mb-1">Seu WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={e => {
                          const val = formatPhone(e.target.value);
                          setFormData({ ...formData, phone: val });
                        }}
                        className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                        placeholder="(51) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#666] mb-1">Endereço de E-mail</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                        placeholder="contato@fazenda.com.br"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-bold text-[#666] mb-1">Seu Município Principal (RS)</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                        <input
                          type="text"
                          required
                          value={citySearch}
                          onChange={(e) => {
                            setCitySearch(e.target.value);
                            setShowCitySuggestions(true);
                            setFormData(prev => ({ ...prev, city: e.target.value }));
                          }}
                          onFocus={() => setShowCitySuggestions(true)}
                          placeholder="Digite sua cidade"
                          className="w-full pl-10 pr-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl text-sm focus:border-[#2D5A27] outline-none"
                        />
                      </div>

                      {/* Autocomplete Dropdown */}
                      {showCitySuggestions && citySuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#E9ECEF] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {citySuggestions.map((city) => (
                            <div
                              key={city.name}
                              className="px-4 py-3 hover:bg-[#F8F9FA] cursor-pointer text-sm border-b border-[#F8F9FA] last:border-b-0"
                              onClick={() => {
                                setCitySearch(city.name);
                                setFormData(prev => ({ ...prev, city: city.name }));
                                setShowCitySuggestions(false);
                              }}
                            >
                              <span className="font-bold text-[#333]">{city.name}</span>
                              <span className="text-[#999] text-xs ml-2">RS</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 p-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-[#333] shrink-0">
                        Segurança: Quanto é <span className="text-[#2D5A27]">{captchaParams.n1} + {captchaParams.n2}</span>?
                      </span>
                      <input
                        type="number"
                        required
                        value={captchaAnswer}
                        onChange={e => setCaptchaAnswer(e.target.value)}
                        className="w-16 px-2 py-2 text-center border border-[#E9ECEF] rounded-lg text-sm bg-white font-bold text-[#2D5A27]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={newsletterLoading}
                      className="w-full py-3.5 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#1E3D1A] transition-colors mt-2 disabled:bg-[#999] flex items-center justify-center gap-2"
                    >
                      {newsletterLoading ? <><Loader2 size={18} className="animate-spin" /> Processando...</> : 'Confirmar Assinatura'}
                    </button>
                    <p className="text-center text-[11px] text-[#999]">Você pode se descadastrar dessa lista a qualquer hora.</p>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {user && (
        <BottomNav
          user={user}
          onAdClick={() => router.push('/?ad=new')}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}

      {/* Modal de Compartilhamento Premium */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={typeof window !== 'undefined' ? window.location.href : 'https://app.gadogaucho.com/precodogado'}
        title="Confira a cotação atualizada do gado nas praças do RS pelo Gado Gaúcho!"
        onCopySuccess={() => alert('Link das cotações copiado para a área de transferência!')}
      />
    </div>
  );
}

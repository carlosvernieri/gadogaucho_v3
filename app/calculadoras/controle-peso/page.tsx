'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scale, Plus, Trash2, Calendar, ChevronLeft, Save,
  History, Search, TrendingUp, Info, User, Check, Loader2,
  FileSpreadsheet, Edit3, ArrowUpRight, ArrowDownRight, Tag, ArrowRight
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useUser } from '@/context/UserContext';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface WeighingRecord {
  tag: string;
  description: string;
  weight: number;
  timestamp: number;
}

interface WeighingSession {
  id: string;
  name: string;
  date: string;
  records: WeighingRecord[];
}

export default function WeightControlPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2D5A27]" size={48} />
      </div>
    }>
      <WeightControlClient />
    </Suspense>
  );
}

function WeightControlClient() {
  const router = useRouter();
  const { user, setShowAdModal, setShowAuthModal, setAuthMode, logout } = useUser();

  // Navigation / UI States
  const [activeTab, setActiveTab] = useState<'session' | 'history' | 'animals'>('session');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Current Session State
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [currentRecords, setCurrentRecords] = useState<WeighingRecord[]>([]);

  // Add Record Form State
  const [inputTag, setInputTag] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [inputWeight, setInputWeight] = useState('');
  const [editingRecordIndex, setEditingRecordIndex] = useState<number | null>(null);

  // Suggestion when typing a tag
  const [suggestedDescription, setSuggestedDescription] = useState('');
  const [lastWeightInfo, setLastWeightInfo] = useState<{ weight: number; date: string } | null>(null);

  // Database of Saved Sessions (stored in localStorage)
  const [savedSessions, setSavedSessions] = useState<WeighingSession[]>([]);

  // Selected Session for Detail View (History Tab)
  const [selectedSession, setSelectedSession] = useState<WeighingSession | null>(null);

  // Selected Animal for History Detail View (Animals Tab)
  const [selectedAnimalTag, setSelectedAnimalTag] = useState<string | null>(null);
  const [animalSearchQuery, setAnimalSearchQuery] = useState('');

  // Stored inputs ref for focusing
  const tagInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Trigger Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Set default session metadata on load
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const formattedTime = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setSessionDate(formattedDate);
    setSessionName(`Pesagem ${today.toLocaleDateString('pt-BR')} ${formattedTime}`);

    // Load data from localStorage
    const saved = localStorage.getItem('gado_gaucho_weighing_sessions');
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading saved sessions:', err);
      }
    }
  }, []);

  // Save database to localStorage on update
  const saveToLocalStorage = (sessions: WeighingSession[]) => {
    localStorage.setItem('gado_gaucho_weighing_sessions', JSON.stringify(sessions));
    setSavedSessions(sessions);
  };

  // Find all unique animal tags and their details across all saved sessions
  const animalsDatabase = useMemo(() => {
    const map = new Map<string, { tag: string; description: string; weighings: { weight: number; date: string; timestamp: number }[] }>();

    // Process records in current unsaved session too (optional, but let's stick to saved sessions for formal database)
    savedSessions.forEach(session => {
      session.records.forEach(rec => {
        const cleanedTag = rec.tag.trim().toUpperCase();
        if (!cleanedTag) return;

        if (!map.has(cleanedTag)) {
          map.set(cleanedTag, {
            tag: cleanedTag,
            description: rec.description || 'Sem descrição',
            weighings: []
          });
        }

        const data = map.get(cleanedTag)!;
        // Keep description updated with the newest description provided
        if (rec.description) {
          data.description = rec.description;
        }
        data.weighings.push({
          weight: rec.weight,
          date: session.date,
          timestamp: rec.timestamp
        });
      });
    });

    // Sort weighings by timestamp ascending
    const list = Array.from(map.values()).map(animal => {
      animal.weighings.sort((a, b) => a.timestamp - b.timestamp);
      return animal;
    });

    return list;
  }, [savedSessions]);

  // Handle autocomplete/suggestions when typing a tag
  useEffect(() => {
    const cleaned = inputTag.trim().toUpperCase();
    if (!cleaned) {
      setSuggestedDescription('');
      setLastWeightInfo(null);
      return;
    }

    const animal = animalsDatabase.find(a => a.tag === cleaned);
    if (animal && animal.weighings.length > 0) {
      setSuggestedDescription(animal.description);
      const lastWeighing = animal.weighings[animal.weighings.length - 1];
      const dateObj = new Date(lastWeighing.date + 'T12:00:00'); // Prevent timezone shift
      setLastWeightInfo({
        weight: lastWeighing.weight,
        date: dateObj.toLocaleDateString('pt-BR')
      });
    } else {
      setSuggestedDescription('');
      setLastWeightInfo(null);
    }
  }, [inputTag, animalsDatabase]);

  // Add animal to current session
  const handleAddRecord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let tag = inputTag.trim().toUpperCase();
    const weight = parseFloat(inputWeight);
    const description = inputDescription.trim() || suggestedDescription || 'Sem descrição';

    if (isNaN(weight) || weight <= 0) {
      triggerToast('Por favor, insira um peso válido.');
      weightInputRef.current?.focus();
      return;
    }

    if (!tag) {
      // Generate a sequential auto tag
      const semTagPrefix = "SEM-TAG-";
      const semTagRecords = currentRecords.filter(r => r.tag.startsWith(semTagPrefix));
      let nextNum = 1;
      if (semTagRecords.length > 0) {
        const numbers = semTagRecords.map(r => {
          const numPart = r.tag.substring(semTagPrefix.length);
          const parsed = parseInt(numPart);
          return isNaN(parsed) ? 0 : parsed;
        });
        nextNum = Math.max(...numbers) + 1;
      }
      tag = `${semTagPrefix}${nextNum.toString().padStart(2, '0')}`;
    }

    // Check if tag already exists in the current session
    const isDuplicate = currentRecords.some((rec, idx) => rec.tag === tag && idx !== editingRecordIndex);
    if (isDuplicate) {
      if (!confirm(`O animal com a TAG "${tag}" já foi registrado nesta sessão. Deseja registrar novamente?`)) {
        return;
      }
    }

    const newRecord: WeighingRecord = {
      tag,
      description,
      weight,
      timestamp: Date.now()
    };

    if (editingRecordIndex !== null) {
      // Edit mode
      setCurrentRecords(prev => prev.map((rec, idx) => idx === editingRecordIndex ? newRecord : rec));
      setEditingRecordIndex(null);
      triggerToast(`Registro do animal ${tag} atualizado!`);
    } else {
      // Add mode
      setCurrentRecords(prev => [newRecord, ...prev]);
      triggerToast(`Animal ${tag} adicionado com ${weight} kg!`);
    }

    // Clear inputs and refocus tag input
    setInputTag('');
    setInputDescription('');
    setInputWeight('');
    setSuggestedDescription('');
    setLastWeightInfo(null);
    tagInputRef.current?.focus();
  };

  // Edit a record in the current list
  const handleEditRecord = (index: number) => {
    const record = currentRecords[index];
    setInputTag(record.tag);
    setInputDescription(record.description);
    setInputWeight(record.weight.toString());
    setEditingRecordIndex(index);
    tagInputRef.current?.focus();
  };

  // Delete a record from current session
  const handleDeleteRecord = (index: number) => {
    const tag = currentRecords[index].tag;
    setCurrentRecords(prev => prev.filter((_, idx) => idx !== index));
    triggerToast(`Registro do animal ${tag} removido.`);
  };

  // Save whole session
  const handleSaveSession = () => {
    if (currentRecords.length === 0) {
      triggerToast('Adicione pelo menos um animal para salvar a pesagem.');
      return;
    }

    const newSession: WeighingSession = {
      id: Date.now().toString(),
      name: sessionName.trim() || `Pesagem ${new Date().toLocaleDateString('pt-BR')}`,
      date: sessionDate || new Date().toISOString().split('T')[0],
      records: [...currentRecords].reverse() // Save chronologically
    };

    const updated = [newSession, ...savedSessions];
    saveToLocalStorage(updated);

    // Reset session and generate new name
    setCurrentRecords([]);
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const formattedTime = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setSessionDate(formattedDate);
    setSessionName(`Pesagem ${today.toLocaleDateString('pt-BR')} ${formattedTime}`);

    triggerToast('Pesagem salva com sucesso!');
    setActiveTab('history');
    setSelectedSession(newSession);
  };

  // Delete a saved session
  const handleDeleteSession = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta pesagem permanentemente?')) {
      const updated = savedSessions.filter(s => s.id !== id);
      saveToLocalStorage(updated);
      setSelectedSession(null);
      triggerToast('Pesagem excluída.');
    }
  };

  // Export session to CSV
  const handleExportCSV = (session: WeighingSession) => {
    const headers = ['TAG', 'Descrição', 'Peso (kg)', 'Data'];
    const rows = session.records.map(rec => [
      rec.tag,
      rec.description,
      rec.weight.toString(),
      session.date
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${session.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate statistics for a set of records
  const getStats = (records: WeighingRecord[]) => {
    if (records.length === 0) {
      return { count: 0, total: 0, average: 0, min: 0, max: 0 };
    }
    const weights = records.map(r => r.weight);
    const count = records.length;
    const total = weights.reduce((sum, w) => sum + w, 0);
    const average = total / count;
    const min = Math.min(...weights);
    const max = Math.max(...weights);

    return { count, total, average, min, max };
  };

  const currentStats = useMemo(() => getStats(currentRecords), [currentRecords]);

  // Selected animal data and evolution history
  const selectedAnimalData = useMemo(() => {
    if (!selectedAnimalTag) return null;
    return animalsDatabase.find(a => a.tag === selectedAnimalTag) || null;
  }, [selectedAnimalTag, animalsDatabase]);

  // Calculate evolution statistics for selected animal
  const selectedAnimalStats = useMemo(() => {
    if (!selectedAnimalData || selectedAnimalData.weighings.length === 0) return null;
    const weighings = selectedAnimalData.weighings;
    const first = weighings[0];
    const last = weighings[weighings.length - 1];
    const gain = last.weight - first.weight;

    // GMD (Ganho Médio Diário)
    let gmd = 0;
    let days = 0;
    if (weighings.length > 1) {
      const timeDiff = last.timestamp - first.timestamp;
      days = Math.max(1, Math.round(timeDiff / (1000 * 60 * 60 * 24)));
      gmd = gain / days;
    }

    return {
      firstWeight: first.weight,
      lastWeight: last.weight,
      totalGain: gain,
      days,
      gmd,
      firstDate: new Date(first.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      lastDate: new Date(last.date + 'T12:00:00').toLocaleDateString('pt-BR')
    };
  }, [selectedAnimalData]);

  // Filtered animals list based on query
  const filteredAnimals = useMemo(() => {
    const query = animalSearchQuery.toLowerCase().trim();
    if (!query) return animalsDatabase;
    return animalsDatabase.filter(a =>
      a.tag.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    );
  }, [animalsDatabase, animalSearchQuery]);

  // Chart data formatting for Recharts
  const animalChartData = useMemo(() => {
    if (!selectedAnimalData) return [];
    return selectedAnimalData.weighings.map(w => {
      const dateObj = new Date(w.date + 'T12:00:00');
      return {
        date: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        'Peso (kg)': w.weight
      };
    });
  }, [selectedAnimalData]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col pb-24 lg:pb-0">
      <Header
        user={user}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        onAuthClick={(mode) => { setAuthMode(mode); setShowAuthModal(true); }}
        onAdClick={() => router.push('/?ad=new')}
        onAdminClick={() => router.push('/admin')}
        onLogout={() => { logout(); router.push('/'); }}
        onHomeClick={() => router.push('/')}
        onFavoritesClick={() => router.push('/favoritos')}
      />

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
        listingsCount={0}
        getCategoryCount={() => 0}
        citySearch=""
        onCitySearchChange={() => { }}
        maxDistance={100}
        onMaxDistanceChange={() => { }}
        onUseMyLocation={() => { }}
        citySuggestions={[]}
        onSelectCity={() => { }}
        showSuggestions={false}
        setShowSuggestions={() => { }}
        isDesktopHidden={true}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-8">
        {/* Back and Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/calculadoras')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#666] hover:text-[#2D5A27] transition-all bg-white py-1.5 px-3 rounded-full border border-[#E9ECEF] w-fit shadow-xs mb-2"
            >
              <ChevronLeft size={14} /> Voltar para Calculadoras
            </button>
            <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm uppercase tracking-widest">
              <Scale size={18} /> Balança de Pesagem
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#1A1A1A] tracking-tight">
              Controle de Peso Animal
            </h1>
            <p className="text-[#666] text-sm mt-1">
              Registre a pesagem na beira da balança, acompanhe médias e analise a evolução do ganho de peso do seu gado.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-[#E9ECEF] p-1.5 rounded-2xl shrink-0 w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('session'); setSelectedSession(null); }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'session'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#666] hover:text-[#333]'
                }`}
            >
              <Scale size={14} /> Nova Pesagem
            </button>
            <button
              onClick={() => { setActiveTab('history'); setSelectedSession(null); }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'history'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#666] hover:text-[#333]'
                }`}
            >
              <History size={14} /> Histórico Pesagens
            </button>
            <button
              onClick={() => { setActiveTab('animals'); setSelectedAnimalTag(null); }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'animals'
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-[#666] hover:text-[#333]'
                }`}
            >
              <Tag size={14} /> Evolução de Animais
            </button>
          </div>
        </div>

        {/* Tab Content 1: Active Session (Na Beira da Balança) */}
        {activeTab === 'session' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Form & Session Details */}
            <div className="lg:col-span-5 space-y-6">

              {/* Session Meta */}
              <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#E9ECEF] shadow-xs">
                <h2 className="text-sm font-bold text-[#333] mb-4 uppercase tracking-wider">
                  Identificação do Lote
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Nome da Sessão de Pesagem</label>
                    <input
                      type="text"
                      placeholder="Ex: Lote Recria Inverno"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#333] outline-hidden focus:border-[#2D5A27] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Data da Pesagem</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#333] outline-hidden focus:border-[#2D5A27] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Entry */}
              <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#E9ECEF] shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#2D5A27]/5 rounded-bl-[80px]" />
                <h2 className="text-sm font-bold text-[#333] mb-5 flex items-center gap-2 uppercase tracking-wider relative z-10">
                  <Scale size={16} className="text-[#2D5A27]" /> Registrar Animal
                </h2>

                <form onSubmit={handleAddRecord} className="space-y-4 relative z-10">
                  {/* Tag Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">TAG do Animal (Brinco/Alfanumérico)</label>
                    <input
                      ref={tagInputRef}
                      type="text"
                      placeholder="Ex: 2026-01"
                      value={inputTag}
                      onChange={(e) => setInputTag(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl px-3.5 py-2.5 text-sm font-black text-[#333] uppercase outline-hidden focus:border-[#2D5A27] transition-all"
                    />

                    {/* Autocomplete Suggestion Info */}
                    {suggestedDescription && (
                      <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[#2D5A27]">
                          <span className="font-bold flex items-center gap-1">
                            <Check size={12} /> Animal Cadastrado
                          </span>
                          <span className="text-[10px] font-semibold bg-[#2D5A27]/10 px-1.5 py-0.5 rounded-full uppercase">
                            {suggestedDescription}
                          </span>
                        </div>
                        {lastWeightInfo && (
                          <span className="text-[#666] font-medium">
                            Última pesagem: <strong className="text-[#333]">{lastWeightInfo.weight} kg</strong> em {lastWeightInfo.date}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Weight Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">Peso do Animal (kg)</label>
                    <div className="relative flex items-center">
                      <input
                        ref={weightInputRef}
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="0.0"
                        value={inputWeight}
                        onChange={(e) => setInputWeight(e.target.value)}
                        className="w-full bg-[#FFFDE7] border border-[#F9A825]/30 rounded-xl pl-3.5 pr-10 py-2.5 text-base font-black text-[#333] outline-hidden focus:border-[#F9A825] transition-all"
                      />
                      <span className="absolute right-3.5 text-xs font-bold text-[#999]">kg</span>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1.5">
                      Descrição / Raça / Lote {suggestedDescription ? '(Autopreenchido)' : ''}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Nelore Branco, Novilha Cruza Angus"
                      value={inputDescription}
                      onChange={(e) => setInputDescription(e.target.value)}
                      disabled={!!suggestedDescription}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-hidden transition-all ${suggestedDescription
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-[#F8F9FA] border-[#E9ECEF] text-[#333] focus:border-[#2D5A27]'
                        }`}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#2D5A27] hover:bg-[#20401C] text-white rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    {editingRecordIndex !== null ? (
                      <>
                        <Edit3 size={16} /> Salvar Alteração
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Registrar Animal
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* Right Column: Live Statistics & Added Records List */}
            <div className="lg:col-span-7 space-y-6">

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#2D5A27] text-white p-4 rounded-[1.5rem] shadow-xs relative overflow-hidden">
                  <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-white/5 rounded-full" />
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-70 block mb-1">Total Animais</span>
                  <div className="text-2xl font-black">{currentStats.count}</div>
                  <span className="text-[10px] opacity-75 font-semibold">pesados hoje</span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-[#E9ECEF] shadow-xs">
                  <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest block mb-1">Peso Médio</span>
                  <div className="text-2xl font-black text-[#333]">{currentStats.average.toFixed(1)} <span className="text-xs text-[#999] font-bold">kg</span></div>
                  <span className="text-[10px] text-[#666] font-semibold">por cabeça</span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-[#E9ECEF] shadow-xs">
                  <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest block mb-1">Peso Total</span>
                  <div className="text-2xl font-black text-[#2D5A27]">{currentStats.total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-xs text-[#2D5A27] font-bold">kg</span></div>
                  <span className="text-[10px] text-[#666] font-semibold">acumulado</span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-[#E9ECEF] shadow-xs">
                  <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest block mb-1">Extremos (Min/Max)</span>
                  <div className="text-sm font-black text-[#333] mt-1.5 whitespace-nowrap">
                    Min: <span className="text-red-500">{currentStats.min.toFixed(0)} kg</span>
                  </div>
                  <div className="text-sm font-black text-[#333] whitespace-nowrap">
                    Max: <span className="text-emerald-600">{currentStats.max.toFixed(0)} kg</span>
                  </div>
                </div>
              </div>

              {/* Records List */}
              <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-xs">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#F8F9FA]">
                  <h2 className="text-sm font-bold text-[#333] uppercase tracking-wider">
                    Animais Pesados nesta Sessão ({currentRecords.length})
                  </h2>

                  {/* Save Session Button */}
                  {currentRecords.length > 0 && (
                    <button
                      onClick={handleSaveSession}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A27] hover:bg-[#20401C] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      <Save size={14} /> Salvar Pesagem
                    </button>
                  )}
                </div>

                {currentRecords.length === 0 ? (
                  <div className="text-center py-16 text-[#999] flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center text-[#2D5A27]">
                      <Scale size={28} />
                    </div>
                    <p className="text-sm font-bold">Nenhum animal registrado ainda.</p>
                    <p className="text-xs text-[#999] max-w-xs leading-relaxed">
                      Ligue a balança, digite o brinco do animal e registre os pesos conforme forem pesados.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E9ECEF]">
                          <th className="py-3 font-bold text-[#999] uppercase tracking-wider pl-2">TAG</th>
                          <th className="py-3 font-bold text-[#999] uppercase tracking-wider">Descrição / Raça</th>
                          <th className="py-3 font-bold text-[#999] uppercase tracking-wider text-right">Peso</th>
                          <th className="py-3 font-bold text-[#999] uppercase tracking-wider text-right pr-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F3F5]">
                        {currentRecords.map((rec, idx) => (
                          <tr key={idx} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-3.5 pl-2 font-black text-[#1A1A1A] tracking-wider uppercase">{rec.tag}</td>
                            <td className="py-3.5 text-[#666] font-medium">{rec.description}</td>
                            <td className="py-3.5 text-right font-black text-[#333] text-sm">{rec.weight.toFixed(1)} kg</td>
                            <td className="py-3.5 text-right pr-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditRecord(idx)}
                                  className="p-1.5 hover:bg-[#F8F9FA] rounded-lg text-[#2D5A27] transition-all"
                                  title="Editar registro"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(idx)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-all"
                                  title="Remover registro"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Tab Content 2: History (Pesagens Salvas) */}
        {activeTab === 'history' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Sessions List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#E9ECEF] shadow-xs">
                <h2 className="text-sm font-bold text-[#333] mb-4 uppercase tracking-wider flex items-center gap-2">
                  <History size={16} className="text-[#2D5A27]" /> Pesagens Salvas
                </h2>

                {savedSessions.length === 0 ? (
                  <div className="text-center py-12 text-[#999]">
                    <p className="text-sm font-bold">Nenhuma pesagem salva ainda.</p>
                    <p className="text-xs mt-1">
                      As pesagens concluídas aparecerão aqui após clicar em "Salvar Pesagem".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {savedSessions.map(session => {
                      const stats = getStats(session.records);
                      const isSelected = selectedSession?.id === session.id;
                      const dateObj = new Date(session.date + 'T12:00:00');

                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative overflow-hidden group ${isSelected
                              ? 'border-[#2D5A27] bg-[#2D5A27]/5 shadow-xs'
                              : 'border-[#E9ECEF] bg-white hover:border-[#2D5A27]/40'
                            }`}
                        >
                          {isSelected && (
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#2D5A27]" />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs font-black text-[#333] group-hover:text-[#2D5A27] transition-colors truncate">
                              {session.name}
                            </h3>
                            <span className="text-[10px] text-[#999] font-bold shrink-0 flex items-center gap-1">
                              <Calendar size={10} />
                              {dateObj.toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] text-[#666] font-semibold mt-1">
                            <div>
                              <span className="text-[#999] block">Animais</span>
                              <strong className="text-sm text-[#333]">{stats.count} cab</strong>
                            </div>
                            <div>
                              <span className="text-[#999] block">Peso Médio</span>
                              <strong className="text-sm text-[#333]">{stats.average.toFixed(1)} kg</strong>
                            </div>
                            <div>
                              <span className="text-[#999] block">Peso Total</span>
                              <strong className="text-sm text-[#2D5A27]">{stats.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Selected Session Details */}
            <div className="lg:col-span-7">
              {selectedSession ? (
                <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-xs space-y-6">
                  {/* Detail Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F8F9FA] gap-4">
                    <div>
                      <h2 className="text-base font-black text-[#1A1A1A]">
                        {selectedSession.name}
                      </h2>
                      <p className="text-xs text-[#666] flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        Pesagem realizada em {new Date(selectedSession.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportCSV(selectedSession)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-[#E9ECEF] hover:bg-[#F8F9FA] text-[#333] rounded-lg text-xs font-bold transition-all"
                        title="Exportar planilha Excel"
                      >
                        <FileSpreadsheet size={13} className="text-[#2D5A27]" /> Planilha
                      </button>
                      <button
                        onClick={() => handleDeleteSession(selectedSession.id)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg text-xs font-bold transition-all"
                        title="Excluir pesagem"
                      >
                        <Trash2 size={13} /> Excluir
                      </button>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-[#F8F9FA] rounded-2xl border border-[#E9ECEF]">
                    <div className="text-center">
                      <span className="text-[9px] font-bold text-[#999] uppercase tracking-wider block">Cabeças</span>
                      <strong className="text-lg font-black text-[#333]">{selectedSession.records.length}</strong>
                    </div>
                    <div className="text-center border-x border-[#E9ECEF]">
                      <span className="text-[9px] font-bold text-[#999] uppercase tracking-wider block">Peso Médio</span>
                      <strong className="text-lg font-black text-[#333]">{getStats(selectedSession.records).average.toFixed(1)} kg</strong>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] font-bold text-[#999] uppercase tracking-wider block">Peso Total</span>
                      <strong className="text-lg font-black text-[#2D5A27]">{getStats(selectedSession.records).total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</strong>
                    </div>
                  </div>

                  {/* Animal Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#333] uppercase tracking-wider">
                      Lista de Animais Registrados
                    </h3>
                    <div className="overflow-x-auto max-h-[40vh] overflow-y-auto pr-1">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E9ECEF] bg-gray-50/50">
                            <th className="py-2.5 pl-2 font-bold text-[#999] uppercase tracking-wider">TAG</th>
                            <th className="py-2.5 font-bold text-[#999] uppercase tracking-wider">Descrição / Raça</th>
                            <th className="py-2.5 font-bold text-[#999] uppercase tracking-wider text-right pr-2">Peso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F3F5]">
                          {selectedSession.records.map((rec, idx) => (
                            <tr key={idx} className="hover:bg-[#FAFAFA] transition-colors">
                              <td className="py-2.5 pl-2 font-black text-[#1A1A1A] uppercase tracking-wider">{rec.tag}</td>
                              <td className="py-2.5 text-[#666] font-medium">{rec.description}</td>
                              <td className="py-2.5 text-right pr-2 font-black text-[#333]">{rec.weight.toFixed(1)} kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] p-12 border border-[#E9ECEF] shadow-xs text-center text-[#999] flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center text-[#999]">
                    <History size={26} />
                  </div>
                  <h3 className="text-sm font-bold text-[#333]">Nenhuma pesagem selecionada</h3>
                  <p className="text-xs max-w-xs leading-relaxed">
                    Selecione uma pesagem na lista lateral para analisar os dados, exportar para planilha ou gerenciar.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 3: Animals Weight Evolution */}
        {activeTab === 'animals' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Unique Animals List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#E9ECEF] shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-[#333] uppercase tracking-wider flex items-center gap-2">
                  <Tag size={16} className="text-[#2D5A27]" /> Animais Cadastrados
                </h2>

                {/* Search Bar */}
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-[#999]" />
                  <input
                    type="text"
                    placeholder="Buscar por brinco ou raça..."
                    value={animalSearchQuery}
                    onChange={(e) => setAnimalSearchQuery(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-[#333] outline-hidden focus:border-[#2D5A27] transition-all"
                  />
                </div>

                {animalsDatabase.length === 0 ? (
                  <div className="text-center py-12 text-[#999]">
                    <p className="text-sm font-bold">Nenhum animal registrado ainda.</p>
                    <p className="text-xs mt-1">
                      Conclua e salve uma pesagem para cadastrar animais no banco de dados.
                    </p>
                  </div>
                ) : filteredAnimals.length === 0 ? (
                  <div className="text-center py-12 text-[#999]">
                    <p className="text-sm font-semibold">Nenhum animal corresponde à busca.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredAnimals.map(animal => {
                      const weighings = animal.weighings;
                      const lastWeighing = weighings[weighings.length - 1];
                      const firstWeighing = weighings[0];
                      const difference = lastWeighing.weight - firstWeighing.weight;

                      const isSelected = selectedAnimalTag === animal.tag;

                      return (
                        <div
                          key={animal.tag}
                          onClick={() => setSelectedAnimalTag(animal.tag)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                              ? 'border-[#2D5A27] bg-[#2D5A27]/5 shadow-xs'
                              : 'border-[#E9ECEF] bg-white hover:border-[#2D5A27]/40'
                            }`}
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-black text-[#333] uppercase tracking-wider block truncate">
                              TAG: {animal.tag}
                            </span>
                            <span className="text-[10px] text-[#666] font-medium block truncate">
                              {animal.description} · {weighings.length} {weighings.length === 1 ? 'pesagem' : 'pesagens'}
                            </span>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end">
                            <strong className="text-xs font-black text-[#333]">{lastWeighing.weight.toFixed(1)} kg</strong>

                            {/* Visual Indicator of gain */}
                            {weighings.length > 1 && (
                              <span className={`text-[9px] font-bold flex items-center gap-0.5 mt-0.5 px-1 py-0.2 rounded-md ${difference >= 0
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : 'text-red-600 bg-red-50'
                                }`}>
                                {difference >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {difference >= 0 ? `+${difference.toFixed(1)}` : difference.toFixed(1)} kg
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Animal Profile & Evolution Chart */}
            <div className="lg:col-span-7">
              {selectedAnimalData && selectedAnimalStats ? (
                <div className="bg-white rounded-[2rem] p-6 border border-[#E9ECEF] shadow-xs space-y-6">
                  {/* Animal Info Title */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#F8F9FA]">
                    <div>
                      <span className="text-[9px] font-bold text-[#999] uppercase tracking-widest block">Ficha do Animal</span>
                      <h2 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wider mt-0.5">
                        TAG {selectedAnimalData.tag}
                      </h2>
                      <p className="text-xs text-[#666] font-semibold mt-0.5">
                        Raça/Grupo: <span className="text-[#333]">{selectedAnimalData.description}</span>
                      </p>
                    </div>

                    <div className="px-4 py-2 bg-[#2D5A27]/5 border border-[#2D5A27]/10 text-[#2D5A27] rounded-xl text-xs font-black uppercase text-center">
                      <span className="text-[8px] font-bold block opacity-75">Último Peso</span>
                      {selectedAnimalStats.lastWeight.toFixed(1)} kg
                    </div>
                  </div>

                  {/* Weight Evolution Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                      <span className="text-[9px] font-bold text-[#999] uppercase tracking-wider block">Peso Inicial</span>
                      <strong className="text-sm font-black text-[#333]">{selectedAnimalStats.firstWeight.toFixed(1)} kg</strong>
                      <span className="text-[8px] text-[#999] block mt-0.5">em {selectedAnimalStats.firstDate}</span>
                    </div>

                    <div className="bg-[#F8F9FA] p-3 rounded-xl border border-[#E9ECEF]">
                      <span className="text-[9px] font-bold text-[#999] uppercase tracking-wider block">Ganho Acumulado</span>
                      <strong className={`text-sm font-black block ${selectedAnimalStats.totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}>
                        {selectedAnimalStats.totalGain >= 0 ? '+' : ''}{selectedAnimalStats.totalGain.toFixed(1)} kg
                      </strong>
                      <span className="text-[8px] text-[#999] block mt-0.5">em {selectedAnimalStats.days} dias</span>
                    </div>

                    <div className="bg-[#E9F0E8] p-3 rounded-xl border border-[#2D5A27]/10">
                      <span className="text-[9px] font-bold text-[#2D5A27] uppercase tracking-wider block">GMD (Ganho Médio Diário)</span>
                      <strong className="text-sm font-black text-[#2D5A27] block">
                        {selectedAnimalData.weighings.length > 1 ? `${selectedAnimalStats.gmd.toFixed(3)} kg` : 'N/A'}
                      </strong>
                      <span className="text-[8px] text-[#2D5A27]/70 block mt-0.5">média diária</span>
                    </div>
                  </div>

                  {/* Line Chart */}
                  {selectedAnimalData.weighings.length > 1 ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-[#333] uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-[#2D5A27]" /> Gráfico de Evolução de Peso
                      </h3>
                      <div className="h-[250px] w-full bg-[#F8F9FA] p-4 rounded-2xl border border-[#E9ECEF]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={animalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                            <Tooltip
                              contentStyle={{
                                background: '#1A1A1A',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '8px 12px',
                              }}
                              itemStyle={{ fontSize: 11, fontWeight: 700, color: '#fff' }}
                              labelStyle={{ fontSize: 9, color: '#999', fontWeight: 600 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="Peso (kg)"
                              stroke="#2D5A27"
                              strokeWidth={3}
                              dot={{ r: 5, stroke: '#2D5A27', strokeWidth: 2, fill: '#fff' }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-700 text-xs font-semibold leading-relaxed">
                      <Info size={20} className="shrink-0 text-amber-600" />
                      <div>
                        Para desenhar o gráfico de evolução e calcular o Ganho Médio Diário (GMD), é necessário registrar esse animal em pelo menos mais uma pesagem de data diferente.
                      </div>
                    </div>
                  )}

                  {/* Weighings Table List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#333] uppercase tracking-wider">
                      Histórico Detalhado de Pesagens
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E9ECEF]">
                            <th className="py-2.5 pl-2 font-bold text-[#999] uppercase tracking-wider">Data</th>
                            <th className="py-2.5 font-bold text-[#999] uppercase tracking-wider text-right">Peso Registrado</th>
                            <th className="py-2.5 font-bold text-[#999] uppercase tracking-wider text-right pr-2">Diferença</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F3F5]">
                          {selectedAnimalData.weighings.map((w, idx) => {
                            const dateObj = new Date(w.date + 'T12:00:00');
                            let diffStr = '-';
                            let diffClass = 'text-[#999]';

                            if (idx > 0) {
                              const prev = selectedAnimalData.weighings[idx - 1];
                              const diff = w.weight - prev.weight;
                              diffStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg`;
                              diffClass = diff >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50';
                            }

                            return (
                              <tr key={idx} className="hover:bg-[#FAFAFA] transition-colors">
                                <td className="py-2.5 pl-2 font-bold text-[#333]">
                                  {dateObj.toLocaleDateString('pt-BR')}
                                </td>
                                <td className="py-2.5 text-right font-black text-[#1A1A1A]">
                                  {w.weight.toFixed(1)} kg
                                </td>
                                <td className="py-2.5 text-right pr-2">
                                  <span className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${diffClass}`}>
                                    {diffStr}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] p-12 border border-[#E9ECEF] shadow-xs text-center text-[#999] flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center text-[#999]">
                    <Tag size={26} />
                  </div>
                  <h3 className="text-sm font-bold text-[#333]">Nenhum animal selecionado</h3>
                  <p className="text-xs max-w-xs leading-relaxed">
                    Selecione um animal na lista lateral para ver a ficha completa de evolução, gráfico de peso histórico e cálculo de GMD.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs font-bold whitespace-nowrap"
          >
            <Info size={16} className="text-[#2D5A27]" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {user && (
        <BottomNav
          user={user}
          onAdClick={() => setShowAdModal(true)}
          onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />
      )}
    </div>
  );
}

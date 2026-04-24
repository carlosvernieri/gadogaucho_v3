'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Sprout, FlaskConical, ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Footer } from '@/components/Footer';
import { SuggestCalculatorModal } from '@/components/SuggestCalculatorModal';

const CALCULATORS = [
  {
    id: 'gmd',
    title: 'GMD & Rentabilidade',
    description: 'Calcule o Ganho Médio Diário e projete o lucro líquido do seu lote com base no peso inicial, final e custos operacionais.',
    icon: <TrendingUp className="text-blue-600" size={32} />,
    href: '/calculadoras/gmd',
    color: 'bg-blue-50',
    borderColor: 'border-blue-100',
    tags: ['Zootecnia', 'Financeiro']
  },
  {
    id: 'pastagem',
    title: 'Formação de Pastagem',
    description: 'Estime o investimento total para formar ou reformar seu pasto, incluindo sementes, adubação, máquinas e mão de obra.',
    icon: <Sprout className="text-emerald-600" size={32} />,
    href: '/calculadoras/pastagem',
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    tags: ['Agricultura', 'Investimento']
  },
  {
    id: 'proteinado',
    title: 'Formulação de Proteinado',
    description: 'Crie misturas personalizadas, controle os níveis de ureia e proteína, e veja o custo exato por kg e por animal.',
    icon: <FlaskConical className="text-amber-600" size={32} />,
    href: '/calculadoras/proteinado',
    color: 'bg-amber-50',
    borderColor: 'border-amber-100',
    tags: ['Nutrição', 'Custo/kg']
  }
];

export default function CalculadorasPage() {
  const [isSuggestModalOpen, setIsSuggestModalOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header 
        onHomeClick={() => {}} 
        onFavoritesClick={() => {}} 
      />

      <main className="flex-grow container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D5A27]/10 text-[#2D5A27] rounded-full text-xs font-bold uppercase tracking-wider mb-6"
          >
            <Calculator size={16} /> Central de Ferramentas
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-[#1A1A1A] mb-6 tracking-tight"
          >
            Nossas <span className="text-[#2D5A27]">Calculadoras</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[#666] leading-relaxed max-w-2xl mx-auto"
          >
            Ferramentas técnicas gratuitas para auxiliar o produtor gaúcho na tomada de decisão, 
            otimizando custos e aumentando a produtividade do rebanho.
          </motion.p>
        </div>

        {/* Calculators Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-16">
          {CALCULATORS.map((calc, index) => (
            <motion.div
              key={calc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Link href={calc.href} className="block h-full">
                <div className={`h-full bg-white rounded-[2.5rem] p-8 border ${calc.borderColor} shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col`}>
                  {/* Icon & Tags */}
                  <div className="flex items-start justify-between mb-8">
                    <div className={`w-16 h-16 ${calc.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                      {calc.icon}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {calc.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold text-[#999] uppercase tracking-widest">{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-black text-[#1A1A1A] mb-4 group-hover:text-[#2D5A27] transition-colors">
                    {calc.title}
                  </h3>
                  <p className="text-[#666] text-sm leading-relaxed mb-8 flex-grow">
                    {calc.description}
                  </p>

                  {/* Action */}
                  <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-sm">
                    Acessar Calculadora
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto p-8 bg-[#2D5A27] rounded-[2.5rem] text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-bl-[200px]" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center shrink-0">
              <Calculator size={40} />
            </div>
            <div className="text-center md:text-left">
              <h4 className="text-xl font-bold mb-2">Precisa de outra ferramenta?</h4>
              <p className="text-white/70 text-sm">
                Estamos sempre desenvolvendo novas soluções para a pecuária. 
                Se você tem uma sugestão de calculadora, entre em contato conosco!
              </p>
            </div>
            <button 
              onClick={() => setIsSuggestModalOpen(true)}
              className="px-8 py-4 bg-white text-[#2D5A27] rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] transition-all shrink-0 cursor-pointer"
            >
              Sugerir Calculadora
            </button>
          </div>
        </motion.div>
      </main>

      <Footer />
      <BottomNav />

      <SuggestCalculatorModal 
        isOpen={isSuggestModalOpen} 
        onClose={() => setIsSuggestModalOpen(false)} 
      />
    </div>
  );
}

'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GestaoModule } from '@/components/gestao/GestaoModule';

export default function GestaoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Header onHomeClick={() => {}} onFavoritesClick={() => {}} />
      <main className="flex-1">
        <GestaoModule />
      </main>
      <Footer />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ListingCard } from '@/components/ListingCard';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { User, MapPin, Star, ChevronLeft } from 'lucide-react';

export default function VendedorPage() {
  const params = useParams();
  const router = useRouter();
  const sellerName = decodeURIComponent(params.name as string);
  
  const [listings, setListings] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sellerRes, allRes] = await Promise.all([
          fetch(`/api/listings?seller=${encodeURIComponent(sellerName)}`),
          fetch('/api/listings')
        ]);
        
        if (sellerRes.ok) {
          const data = await sellerRes.json();
          setListings(data);
        }
        
        if (allRes.ok) {
          const data = await allRes.json();
          setAllListings(data);
        }

        const storedUser = localStorage.getItem('gado_gaucho_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sellerName]);

  const handleShare = (id: number) => {
    const url = `${window.location.origin}/anuncio/${id}`;
    navigator.clipboard.writeText(url);
    // You could add a toast here if you want, similar to the ad page
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
          listingsCount={allListings.length}
          getCategoryCount={(catName) => allListings.filter(l => l.category.toLowerCase() === catName.toLowerCase()).length}
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
          <div className="mb-8">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-[#666] hover:text-[#2D5A27] transition-colors mb-4 group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>
            
            <div className="bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#F8F9FA] shadow-md">
                <Image 
                  src={`https://picsum.photos/seed/${sellerName}/200/200`} 
                  alt={sellerName} 
                  fill 
                  className="object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-[#333] mb-2">{sellerName}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-[#666]">
                  <div className="flex items-center gap-1">
                    <MapPin size={16} className="text-[#2D5A27]" />
                    Rio Grande do Sul
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-[#FFC107] fill-[#FFC107]" />
                    <span className="font-bold text-[#333]">4.8</span>
                    <span className="text-[#999]">(124 avaliações)</span>
                  </div>
                  <div className="px-3 py-1 bg-[#E9F0E8] text-[#2D5A27] rounded-full text-[10px] font-bold uppercase">
                    Vendedor Verificado
                  </div>
                </div>
              </div>
              <div className="bg-[#F8F9FA] px-6 py-4 rounded-2xl text-center">
                <div className="text-2xl font-bold text-[#2D5A27]">{listings.length}</div>
                <div className="text-[10px] font-bold text-[#999] uppercase">Anúncios Ativos</div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-[#333] mb-6">Anúncios de {sellerName}</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl h-[400px] animate-pulse border border-[#E9ECEF]" />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map((l) => (
                <ListingCard 
                  key={l.id} 
                  listing={l} 
                  onShare={handleShare}
                  onClick={() => router.push(`/anuncio/${l.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E9ECEF]">
              <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-[#999]" />
              </div>
              <h3 className="text-lg font-bold text-[#333] mb-2">Nenhum anúncio ativo</h3>
              <p className="text-[#666]">Este vendedor não possui anúncios no momento.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

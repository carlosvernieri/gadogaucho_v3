'use client';

import React from 'react';
import { MapPin, Search, X, LayoutGrid } from 'lucide-react';
import { CATEGORIES_LIST } from '@/lib/data';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  listingsCount: number;
  getCategoryCount: (category: string) => number;
  citySearch: string;
  onCitySearchChange: (query: string) => void;
  maxDistance: number;
  onMaxDistanceChange: (distance: number) => void;
  onUseMyLocation: () => void;
  citySuggestions: any[];
  onSelectCity: (city: any) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
}

export const Sidebar = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  listingsCount,
  getCategoryCount,
  citySearch,
  onCitySearchChange,
  maxDistance,
  onMaxDistanceChange,
  onUseMyLocation,
  citySuggestions,
  onSelectCity,
  showSuggestions,
  setShowSuggestions
}: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleCategorySelect = (catName: string | null) => {
    if (pathname !== '/') {
      if (catName) {
        router.push(`/?category=${encodeURIComponent(catName)}`);
      } else {
        router.push('/');
      }
    } else {
      onSelectCategory(catName);
    }
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-[280px] bg-white lg:bg-transparent lg:relative lg:block lg:translate-x-0 transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      <div className="p-6 lg:p-0 h-full overflow-y-auto lg:sticky lg:top-8">
        <div className="mb-7">
          <div className="flex items-center justify-between mb-7 lg:hidden">
            <span className="text-xl font-bold text-[#2D5A27]">Filtros</span>
            <button onClick={onClose} className="text-[#666] cursor-pointer"><X size={24} /></button>
          </div>

          {/* Localidade */}
          <div className="mb-7">
            <div className="flex items-center gap-2 text-sm font-bold text-[#333] mb-4">
              <MapPin size={18} className="text-[#2D5A27]" /> Localidade
            </div>
            <button 
              onClick={onUseMyLocation}
              className="w-full py-2.5 bg-[#E9F0E8] text-[#2D5A27] text-[11px] font-bold rounded-lg mb-3 hover:bg-[#D3E1D1] transition-all cursor-pointer"
            >
              Usar minha localização atual
            </button>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ou buscar município - RS..." 
                value={citySearch}
                onChange={(e) => onCitySearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="w-full bg-white border border-[#E9ECEF] rounded-lg px-4 py-2.5 text-xs outline-none focus:border-[#2D5A27] transition-all"
              />
              {citySuggestions.length > 0 && showSuggestions && (
                <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-xl z-10 overflow-hidden">
                  {citySuggestions.map((city: any) => (
                    <button 
                      key={city.name}
                      type="button"
                      onClick={() => onSelectCity(city)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-xs">{city.name}</span>
                      <span className="text-[10px] text-[#999]">RS</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {citySearch && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#999] uppercase">Distância Máxima</span>
                  <span className="text-[10px] font-bold text-[#2D5A27]">{maxDistance} km</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  step="10"
                  value={maxDistance}
                  onChange={(e) => onMaxDistanceChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#E9ECEF] rounded-lg appearance-none cursor-pointer accent-[#2D5A27]"
                />
              </div>
            )}
          </div>

          {/* Filtrar por Código */}
          <div className="mb-7">
            <div className="flex items-center gap-2 text-sm font-bold text-[#333] mb-4">
              <Search size={18} className="text-[#2D5A27]" /> Filtrar por Código
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: 123" 
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="flex-1 bg-white border border-[#E9ECEF] rounded-lg px-4 py-2.5 text-xs outline-none focus:border-[#2D5A27] transition-all"
              />
              <button className="w-10 h-10 bg-[#2D5A27] text-white rounded-lg flex items-center justify-center hover:bg-[#1E3D1A] transition-all cursor-pointer">
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Categorias */}
          <div className="mb-7">
            <div className="flex items-center gap-2 text-sm font-bold text-[#333] mb-4">
              <LayoutGrid size={18} className="text-[#2D5A27]" /> Categorias
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => handleCategorySelect(null)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!selectedCategory ? 'bg-[#2D5A27] text-white' : 'text-[#666] hover:bg-[#F8F9FA]'}`}
              >
                <span>Todos as Categorias</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${!selectedCategory ? 'bg-white/20' : 'bg-[#E9ECEF]'}`}>{listingsCount}</span>
              </button>
              {CATEGORIES_LIST.map((catName: string) => {
                const count = getCategoryCount(catName);
                return (
                  <button 
                    key={catName}
                    onClick={() => handleCategorySelect(catName)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${selectedCategory?.toLowerCase() === catName.toLowerCase() ? 'bg-[#2D5A27] text-white' : 'text-[#666] hover:bg-[#F8F9FA]'}`}
                  >
                    <span>{catName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${selectedCategory?.toLowerCase() === catName.toLowerCase() ? 'bg-white/20' : 'bg-[#E9ECEF]'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

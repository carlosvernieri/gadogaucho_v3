'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Heart, Share2, Star, Video } from 'lucide-react';
import { slugify } from '@/lib/utils';

export const ListingDetail = ({ listing, onShare }: { listing: any, onShare: (id: number) => void }) => {
  const [activeMedia, setActiveMedia] = useState(0);
  const allMedia = [...(listing.images || []), ...(listing.videos || [])];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col lg:flex-row gap-8"
    >
      {/* Left: Gallery */}
      <div className="flex-1">
        <div className="relative aspect-[16/10] rounded-3xl overflow-hidden mb-4 shadow-lg bg-[#F8F9FA]">
          {activeMedia < (listing.images?.length || 0) ? (
            <Image 
              src={allMedia[activeMedia]} 
              alt={listing.title} 
              fill 
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <video 
              src={allMedia[activeMedia]} 
              controls 
              className="w-full h-full object-contain bg-black"
            />
          )}
          <Link 
            href="/"
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#333] hover:bg-white transition-all shadow-md z-10"
          >
            <ChevronLeft size={24} />
          </Link>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {allMedia.map((_: string, idx: number) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all ${activeMedia === idx ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} 
              />
            ))}
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2">
          {allMedia.map((media: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => setActiveMedia(idx)}
              className={`relative w-24 aspect-square rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeMedia === idx ? 'border-[#2D5A27]' : 'border-transparent opacity-70'}`}
            >
              {idx < (listing.images?.length || 0) ? (
                <Image src={media} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <Video size={24} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Right: Info */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-1">
              <Link 
                href={`/categoria/${slugify(listing.category)}`}
                className="text-[10px] font-bold text-[#999] uppercase tracking-wider hover:text-[#2D5A27] transition-colors"
              >
                {listing.category}
              </Link>
              <span className="text-[10px] text-[#999]">Cód: #{listing.id}</span>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#DC3545] hover:bg-white border border-transparent hover:border-[#E9ECEF] transition-all">
                <Heart size={20} />
              </button>
              <button 
                onClick={() => onShare(listing.id)}
                className="w-10 h-10 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#666] hover:bg-white border border-transparent hover:border-[#E9ECEF] transition-all"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <span className="text-[10px] font-bold text-[#999] uppercase">Preço por kg</span>
            <div className="text-4xl font-bold text-[#2D5A27] mb-2">
              R$ {listing.priceKg.toFixed(2)}/kg
            </div>
            <div className="grid grid-cols-3 gap-4 text-[11px] text-[#666]">
              <div>
                <span className="block opacity-60">Peso Médio:</span>
                <span className="font-bold">{listing.avgWeight}kg</span>
              </div>
              <div>
                <span className="block opacity-60">Lote:</span>
                <span className="font-bold">{listing.quantity} animais</span>
              </div>
              <div>
                <span className="block opacity-60">Valor Total: R$</span>
                <span className="font-bold">{listing.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-[#333] mb-4 leading-tight">{listing.title}</h1>
          <p className="text-sm text-[#666] leading-relaxed mb-8">
            {listing.description}
          </p>
          
          <div className="bg-[#F8F9FA] rounded-2xl p-4 mb-6 flex items-center gap-4">
            <Link 
              href={`/vendedor/${encodeURIComponent(listing.seller)}`}
              className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm hover:opacity-80 transition-opacity"
            >
              <Image src={`https://picsum.photos/seed/${listing.seller}/100/100`} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
            </Link>
            <div className="flex-1">
              <Link 
                href={`/vendedor/${encodeURIComponent(listing.seller)}`}
                className="font-bold text-sm text-[#333] hover:text-[#2D5A27] transition-colors"
              >
                {listing.seller}
              </Link>
              <div className="flex items-center gap-1 text-[#FFC107]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={10} fill={i < Math.floor(listing.sellerRating) ? 'currentColor' : 'none'} />
                ))}
                <span className="text-[10px] text-[#999] ml-1">(124 avaliações)</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <button className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all active:scale-[0.98]">
              Tenho Interesse
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

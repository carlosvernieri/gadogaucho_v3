'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Share2, MapPin, Loader2 } from 'lucide-react';
import { Badge } from './Badge';

export const ListingCard = ({ 
  listing, 
  onShare,
  onClick
}: { 
  listing: any, 
  onShare?: (id: number) => void,
  onClick?: () => void
}) => {
  const [isNavigating, setIsNavigating] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow group relative"
    >
      {isNavigating && (
        <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#E9ECEF] border-t-[#2D5A27] rounded-full animate-spin" />
          <Loader2 size={16} className="text-[#2D5A27] animate-pulse absolute" />
          <span className="mt-3 text-[10px] font-bold text-[#2D5A27] uppercase tracking-wider">Carregando...</span>
        </div>
      )}
      
      {/* Action Buttons - Moved outside Link to avoid nested interactive elements */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#DC3545] hover:bg-white transition-colors cursor-pointer"
        >
          <Heart size={18} />
        </button>
        <button 
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            if (onShare) onShare(listing.id);
          }}
          className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#666] hover:bg-white transition-colors cursor-pointer"
        >
          <Share2 size={16} />
        </button>
      </div>

      <Link 
        href={`/anuncio/${listing.id}`} 
        className="block"
        onClick={() => {
          setIsNavigating(true);
          if (onClick) onClick();
        }}
      >
        <div className="relative aspect-[4/3]">
          <Image 
            src={listing.image} 
            alt={listing.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge>{listing.category} <span className="font-normal opacity-60">cod: {listing.id}</span></Badge>
            {listing.verified && <Badge variant="verified">VERIFICADO</Badge>}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-bold text-[#333] mb-1">{listing.title.split(' ')[0]} <span className="text-xs font-normal opacity-40">cod: {listing.id}</span></h3>
          <div className="text-2xl font-bold text-[#2D5A27] mb-2">
            R$ {listing.priceKg.toFixed(2)}/kg
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#666] mb-4">
            <span>{listing.avgWeight}kg méd.</span>
            <span>•</span>
            <span>{listing.quantity} animais</span>
            <span>•</span>
            <span>R$ {listing.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-[#999] mb-4">
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span className="uppercase">{listing.location}</span>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/vendedor/${encodeURIComponent(listing.seller)}`;
              }}
              className="font-bold text-[#2D5A27] hover:underline cursor-pointer"
            >
              {listing.seller}
            </button>
          </div>
          
          <div className="w-full py-2.5 rounded-lg border border-[#2D5A27] text-[#2D5A27] font-bold text-sm hover:bg-[#2D5A27] hover:text-white transition-all text-center">
            Ver Detalhes
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

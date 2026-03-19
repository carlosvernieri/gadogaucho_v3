'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { MapPin, Pencil, Trash2, CheckCircle, AlertCircle, Clock, ShieldCheck, Heart } from 'lucide-react';
import { Badge } from './Badge';

export const ListingListItem = ({ 
  listing, 
  onEdit, 
  onDelete, 
  onToggleSold, 
  onVerify,
  onView,
  onRemoveFavorite,
  isOwner = true
}: { 
  listing: any, 
  onEdit?: (listing: any) => void, 
  onDelete?: (id: number) => void,
  onToggleSold?: (id: number, currentStatus: boolean) => void,
  onVerify?: (id: number) => void,
  onView?: (id: number) => void,
  onRemoveFavorite?: (id: number) => void,
  isOwner?: boolean
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-white rounded-2xl overflow-hidden border border-[#E9ECEF] shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center p-4 gap-6 ${listing.sold ? 'opacity-90 grayscale-[0.3]' : ''}`}
    >
      <div 
        className="relative w-full md:w-48 aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
        onClick={() => onView?.(listing.id)}
      >
        <Image 
          src={listing.image} 
          alt={listing.title} 
          fill 
          className="object-cover"
          referrerPolicy="no-referrer"
        />
        {listing.sold && (
          <div className="absolute inset-0 bg-red-500/70 mix-blend-overlay pointer-events-none" />
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge variant={listing.verified ? 'verified' : 'default'}>
            {listing.verified ? 'VERIFICADO' : 'PENDENTE'}
          </Badge>
          {listing.verification_requested && !listing.verified && (
            <Badge variant="default" className="bg-blue-500 text-white border-none">
              SOLICITADO
            </Badge>
          )}
          {listing.sold && (
            <Badge variant="default" className="bg-red-50 text-red-600 border border-red-100 shadow-none">
              VENDIDO
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView?.(listing.id)}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Cód: {listing.id}</span>
          <span className="text-[#E9ECEF]">•</span>
          <span className="text-[10px] font-bold text-[#2D5A27] uppercase tracking-wider">{listing.category}</span>
        </div>
        <h3 className="text-lg font-bold text-[#333] mb-1 truncate">{listing.title}</h3>
        
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#666] mb-3">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span className="uppercase">{listing.location}</span>
          </div>
          <span>•</span>
          <span>{listing.quantity} animais</span>
          <span>•</span>
          <span>{listing.avgWeight}kg méd.</span>
        </div>

        <div className="text-xl font-bold text-[#2D5A27]">
          R$ {listing.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          <span className="text-xs font-normal text-[#999] ml-2">(R$ {listing.priceKg.toFixed(2)}/kg)</span>
        </div>
      </div>

      <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto">
        {isOwner ? (
          <>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => onEdit?.(listing)}
                className="flex-1 md:w-32 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Pencil size={14} /> Editar
              </button>
              <button 
                onClick={() => onDelete?.(listing.id)}
                className="flex-1 md:w-32 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => onToggleSold?.(listing.id, !!listing.sold)}
                className="flex-1 md:w-32 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle size={14} /> {listing.sold ? 'Disponível' : 'Vendido'}
              </button>
              {!listing.verified && (
                <button 
                  onClick={() => onVerify?.(listing.id)}
                  disabled={!!listing.verification_requested}
                  className={`flex-1 md:w-32 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${listing.verification_requested ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer'}`}
                >
                  {listing.verification_requested ? <Clock size={14} /> : <ShieldCheck size={14} />} 
                  {listing.verification_requested ? 'Pendente' : 'Verificar'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <button 
              onClick={() => onView?.(listing.id)}
              className="w-full md:w-40 py-3 bg-[#2D5A27] text-white rounded-xl text-sm font-bold hover:bg-[#1E3D1A] transition-all cursor-pointer shadow-sm"
            >
              Ver Detalhes
            </button>
            <button 
              onClick={() => onRemoveFavorite?.(listing.id)}
              className="w-full md:w-40 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Heart size={16} fill="currentColor" /> Remover
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

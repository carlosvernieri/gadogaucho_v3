'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft, Heart, Share2, Video, CheckCircle,
  MapPin, TrendingUp, Info, BarChart3, User
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { slugify } from '@/lib/utils';
import { Badge } from './Badge';
import { InterestForm } from './InterestForm';

export const ListingDetail = ({
  listing,
  onShare,
  onToggleFavorite,
  isFavorite
}: {
  listing: any,
  onShare: (id: number) => void,
  onToggleFavorite: (id: number) => void,
  isFavorite: boolean
}) => {
  const [activeMedia, setActiveMedia] = useState(0);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [insightData, setInsightData] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState(true);

  const allMedia = [...(listing.images || []), ...(listing.videos || [])];

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        setLoadingInsight(true);
        const res = await fetch(`/api/listings/${listing.id}/price-insight`);
        const data = await res.json();
        if (data) {
          setInsightData(data);
        }
      } catch (err) {
        console.error('Error fetching price insights:', err);
      } finally {
        setLoadingInsight(false);
      }
    };

    if (listing.id) {
      fetchInsight();
    }
  }, [listing.id]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left: Gallery */}
      <div className="flex-1 min-w-0 w-full">
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
          {listing.sold && (
            <div className="absolute inset-0 bg-red-500/70 mix-blend-overlay pointer-events-none" />
          )}
          <Link
            href="/"
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#333] hover:bg-white transition-all shadow-md z-10"
          >
            <ChevronLeft size={24} />
          </Link>

          {listing.sold && (
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="default" className="bg-red-50 text-red-600 border border-red-100 shadow-none px-3 py-1.5 text-xs flex items-center gap-1">
                <CheckCircle size={12} /> VENDIDO
              </Badge>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {allMedia.map((_: string, idx: number) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${activeMedia === idx ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
              {<Link
                href={`/categoria/${slugify(listing.category)}`}
                className="text-[11px] font-bold text-[#999] uppercase tracking-wider hover:text-[#2D5A27] transition-colors"
              >
                {listing.category.charAt(0).toUpperCase() + listing.category.slice(1).toLowerCase()}
              </Link>}
              <span className="text-[11px] text-[#999]">Cód: #{listing.id}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onToggleFavorite(listing.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${isFavorite
                  ? 'bg-[#DC3545] text-white border-[#DC3545]'
                  : 'bg-[#F8F9FA] text-[#DC3545] border-transparent hover:border-[#E9ECEF] hover:bg-white'
                  }`}
              >
                <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
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
            <span className="text-[11px] font-bold text-[#999] uppercase">Preço por kg</span>
            <div className="text-3xl font-bold text-[#2D5A27] mb-2">
              R$ {listing.priceKg.toFixed(2)}/kg
            </div>
            <div className="grid grid-cols-3 gap-4 text-[12px] text-[#666]">
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

          <h1 className="text-2xl font-bold text-[#333] mb-2 leading-tight">{listing.category.charAt(0).toUpperCase() + listing.category.slice(1).toLowerCase()} em {listing.location.charAt(0).toUpperCase() + listing.location.slice(1).toLowerCase()}</h1>
          <p className="text-sm text-[#666] leading-relaxed mb-10">
            {listing.description}
          </p>
          {/* <div className="flex items-center gap-2 text-[12px] text-[#666] mb-8 pb-8 border-b border-[#F1F3F5]">
            <MapPin size={14} className="text-[#999]" />
            <span className="uppercase">{listing.location}</span>
          </div> */}

          {/* Market Intelligence Chart */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
                  <BarChart3 size={18} className="text-[#2D5A27]" />
                </div>
                <h3 className="font-bold text-[#333]">Inteligência de Mercado</h3>
              </div>
              <Badge variant="default" className="bg-[#E9F0E8] text-[#2D5A27] text-[10px] px-2 py-1">
                8 SEMANAS
              </Badge>
            </div>

            <p className="text-[12px] text-[#666] mb-6 leading-relaxed">
              Evolução do preço médio para <strong className="text-[#333]">{listing.category}</strong>. Compare os valores das praças de leilão com a média do Gado Gaúcho.
            </p>

            {!loadingInsight && insightData?.isMock && (
              <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex gap-3 text-amber-900 shadow-sm shadow-amber-500/5">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold text-amber-900 block mb-0.5">Nota de Transparência:</strong>
                  Não encontramos dados de leilões locais recentes suficientes para a categoria <strong className="text-amber-950">{listing.category}</strong> próximos a {listing.location.split('-')[0].trim()}. Os preços apresentados no gráfico e tabela são **estimativas médias baseadas no mercado estadual**.
                </div>
              </div>
            )}

            {loadingInsight ? (
              <div className="h-[250px] flex items-center justify-center bg-[#F8F9FA] rounded-2xl border border-dashed border-[#E9ECEF]">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#2D5A27] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#999] font-medium">Carregando dados...</span>
                </div>
              </div>
            ) : insightData.chartData && insightData.chartData.length > 0 ? (
              <div className="space-y-6">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insightData.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#999' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#999' }}
                        axisLine={false}
                        tickLine={false}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [`R$ ${Number(value).toFixed(2)}/kg`, String(name)]}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        height={45}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }}
                      />
                      {insightData.closestPlazas?.[0] && (
                        <Line
                          type="monotone"
                          dataKey="plaza1"
                          name={insightData.closestPlazas[0].name}
                          stroke="#1E3D1A"
                          strokeWidth={2.5}
                          dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 5 }}
                          connectNulls={true}
                        />
                      )}
                      {insightData.closestPlazas?.[1] && (
                        <Line
                          type="monotone"
                          dataKey="plaza2"
                          name={insightData.closestPlazas[1].name}
                          stroke="#2D5A27"
                          strokeWidth={2}
                          dot={{ r: 2, strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                        />
                      )}
                      {insightData.closestPlazas?.[2] && (
                        <Line
                          type="monotone"
                          dataKey="plaza3"
                          name={insightData.closestPlazas[2].name}
                          stroke="#5A8D53"
                          strokeWidth={2}
                          dot={{ r: 2, strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="platformPrice"
                        name="Gado Gaúcho"
                        stroke="#87C036"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 5 }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Table */}
                <div className="overflow-x-auto rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
                  <table className="w-full text-left text-[11px] min-w-[320px]">
                    <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[#999] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 whitespace-nowrap">Semana</th>
                        {insightData.closestPlazas?.map((p: any) => (
                          <th key={p.id} className="px-3 py-2 truncate max-w-[80px] whitespace-nowrap">{p.name}</th>
                        ))}
                        <th className="px-3 py-2 text-[#2D5A27] whitespace-nowrap">Gado Gaúcho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F3F5]">
                      {insightData.tableData?.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#FDFDFD] transition-colors">
                          <td className="px-3 py-2 font-bold text-[#666] whitespace-nowrap">{row.week}</td>
                          {row.plazas.map((pPrice: any, pIdx: number) => (
                            <td key={pIdx} className="px-3 py-2 font-medium text-[#333] whitespace-nowrap">
                              {pPrice.price ? `${pPrice.price.toFixed(2)}` : '-'}
                            </td>
                          ))}
                          <td className="px-3 py-2 font-bold text-[#2D5A27] bg-[#E9F0E8]/20 whitespace-nowrap">
                            {row.platformPrice ? `${row.platformPrice.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center bg-[#F8F9FA] rounded-2xl border border-dashed border-[#E9ECEF]">
                <span className="text-xs text-[#999]">Sem dados suficientes para o gráfico.</span>
              </div>
            )}

            <div className="mt-6 p-4 bg-[#F8F9FA] border border-[#E9ECEF] rounded-2xl flex gap-3 italic">
              <Info size={16} className="text-[#2D5A27] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#666] leading-relaxed">
                As praças selecionadas são as <strong className="text-[#333]">3 mais próximas</strong> do município deste anúncio. Valores referem-se estritamente à categoria <strong className="text-[#333]">{listing.category}</strong>.
              </p>
            </div>
          </div>

          <div className="bg-[#F8F9FA] rounded-2xl p-5 mb-8 flex items-center gap-4">
            <Link
              href={`/vendedor/${listing.user_id}`}
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#2D5A27] border-2 border-[#E9F0E8] shadow-sm hover:opacity-80 transition-opacity"
            >
              <User size={24} />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/vendedor/${listing.user_id}`}
                  className="font-bold text-sm text-[#333] hover:text-[#2D5A27] transition-colors"
                >
                  {listing.seller}
                </Link>
                {listing.sellerVerified && (
                  <Badge variant="seller-verified">
                    VERIFICADO
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-[#999]">
                Membro desde 2024
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setShowInterestForm(true)}
              className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all active:scale-[0.98]"
            >
              Tenho Interesse
            </button>
          </div>
        </div>
      </div>

      <InterestForm
        isOpen={showInterestForm}
        onClose={() => setShowInterestForm(false)}
        listingId={listing.id}
        listingTitle={listing.title}
      />
    </div >
  );
};

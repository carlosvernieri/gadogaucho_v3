import React, { useEffect, useRef, useState } from 'react';
import { AuctionPlaza } from '@/types/auction';

interface RSMapProps {
  plazas: AuctionPlaza[];
  onEditPlaza?: (plaza: AuctionPlaza) => void;
}

export function RSMap({ plazas, onEditPlaza }: RSMapProps) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Se o Leaflet já estiver carregado no escopo global
    if ((window as any).L) {
      setLoaded(true);
      return;
    }

    // 1. Injetar a folha de estilos (CSS) do Leaflet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // 2. Injetar o script JS do Leaflet
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.onload = () => {
      setLoaded(true);
    };
    script.onerror = () => {
      setError(true);
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Destruir mapa existente para evitar duplicação/erros ao remontar
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Inicializar o Mapa do Rio Grande do Sul
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([-30.0346, -51.2177], 7);

    mapRef.current = map;

    // Adicionar camada CartoDB Positron (estilo limpo, moderno, cinza claro)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Criar Pin customizado usando HTML/CSS e Lucide SVG
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          background-color: #2D5A27;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: transform 0.2s ease-in-out;
        " onmouseover="this.style.transform='scale(1.15)';" onmouseout="this.style.transform='scale(1.0)';">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34]
    });

    const markers: any[] = [];

    // Adicionar marcadores para cada praça
    plazas.forEach(p => {
      if (p.lat && p.lng) {
        const marker = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(map);
        
        // Estruturar conteúdo do Popup
        const popupContainer = document.createElement('div');
        popupContainer.style.fontFamily = 'Inter, sans-serif';
        popupContainer.style.padding = '4px 6px';
        popupContainer.style.textAlign = 'center';
        
        popupContainer.innerHTML = `
          <h4 style="margin: 0 0 2px 0; font-weight: 800; color: #333; font-size: 13px;">${p.name}</h4>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 11px; font-weight: 500;">${p.city}</p>
          <button class="edit-btn-${p.id}" style="
            background-color: #2D5A27;
            color: white;
            border: none;
            padding: 6px 12px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='#1E3D1A';" onmouseout="this.style.backgroundColor='#2D5A27';">Editar Praça</button>
        `;

        marker.bindPopup(popupContainer);

        // Adicionar listener ao botão quando o popup abrir
        marker.on('popupopen', () => {
          const btn = popupContainer.querySelector(`.edit-btn-${p.id}`);
          if (btn && onEditPlaza) {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              onEditPlaza(p);
              marker.closePopup();
            });
          }
        });

        markers.push(marker);
      }
    });

    // Ajustar visualização para enquadrar todos os pins
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }, [loaded, plazas, onEditPlaza]);

  if (error) {
    return (
      <div className="h-96 w-full bg-[#F8F9FA] rounded-[2rem] border border-red-100 flex flex-col items-center justify-center text-red-500 text-sm font-semibold p-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="mb-2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        Erro ao carregar o serviço de mapas. Por favor, verifique sua conexão.
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[2rem] border border-[#E9ECEF] p-5 shadow-sm relative overflow-hidden mt-6">
      <div className="flex flex-col mb-4">
        <h4 className="font-bold text-[#333] text-base">Distribuição Geográfica de Praças</h4>
        <p className="text-xs text-[#999]">Visualização no mapa do Rio Grande do Sul das praças de leilão cadastradas</p>
      </div>
      
      <div 
        ref={containerRef} 
        className="h-96 w-full rounded-2xl overflow-hidden border border-[#E9ECEF] bg-[#F8F9FA]"
        style={{ minHeight: '380px', zIndex: 1 }}
      >
        {!loaded && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#2D5A27] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-[#666] font-medium">Carregando mapa interativo...</p>
          </div>
        )}
      </div>
    </div>
  );
}

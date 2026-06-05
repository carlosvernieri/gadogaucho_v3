'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Video, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { CATEGORIES_LIST, RS_CITIES } from '@/lib/data';
import { safeJsonStringify, generateVideoThumbnail, deleteMediaFromStorage, getListingUrl } from '@/lib/utils';
import { Spinner } from '@/components/Spinner';

export const AdModal = () => {
  const { user, showAdModal, setShowAdModal, editingListing, setEditingListing } = useUser();
  const router = useRouter();
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);

  // Ad Form State
  const [adForm, setAdForm] = useState({
    category: 'Touro',
    breed: '',
    weight: 0,
    priceKg: 0,
    batchSize: 1,
    city: '',
    description: '',
    images: [] as string[],
    videos: [] as string[]
  });

  const [citySearchAd, setCitySearchAd] = useState('');
  const [showAdSuggestions, setShowAdSuggestions] = useState(false);

  // File Upload Refs
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAdModal) {
      if (editingListing) {
        setAdForm({
          category: editingListing.category || 'Touro',
          breed: editingListing.breed || '',
          weight: editingListing.avgWeight || 0,
          priceKg: editingListing.priceKg || 0,
          batchSize: editingListing.quantity || 1,
          city: editingListing.location ? editingListing.location.split(' - ')[0] : '',
          description: editingListing.description || '',
          images: Array.isArray(editingListing.images) ? editingListing.images : (editingListing.image ? [editingListing.image] : []),
          videos: Array.isArray(editingListing.videos) ? editingListing.videos : []
        });
        setCitySearchAd(editingListing.location ? editingListing.location.split(' - ')[0] : '');
        setMediaToDelete([]);
      } else {
        setAdForm({
          category: 'Touro',
          breed: '',
          weight: 0,
          priceKg: 0,
          batchSize: 1,
          city: '',
          description: '',
          images: [],
          videos: []
        });
        setCitySearchAd('');
        setMediaToDelete([]);
      }
    }
  }, [showAdModal, editingListing]);

  // Lock scroll
  useEffect(() => {
    if (showAdModal) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAdModal]);

  const citySuggestionsAd = useMemo(() => {
    if (!showAdSuggestions) return [];
    if (citySearchAd.length < 3) return [];
    return RS_CITIES.filter(c => c.name.toLowerCase().includes(citySearchAd.toLowerCase()));
  }, [citySearchAd, showAdSuggestions]);

  const totalPrice = useMemo(() => {
    return adForm.weight * adForm.priceKg;
  }, [adForm.weight, adForm.priceKg]);

  const dispatchToast = (msg: string) => {
    window.dispatchEvent(new CustomEvent('show_toast', { detail: msg }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    const newFiles: string[] = [];
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (type === 'images' && file.size > 5 * 1024 * 1024) {
        dispatchToast('A imagem é muito grande. Máximo 5MB.');
        continue;
      }
      if (type === 'videos' && file.size > 50 * 1024 * 1024) {
        dispatchToast('O vídeo é muito grande. Máximo 50MB.');
        continue;
      }

      try {
        let fileToUpload: File | Blob = file;
        let fileExt = file.name.split('.').pop();

        if (type === 'images') {
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.8, // Slightly higher quality
              fileType: 'image/webp',
            };
            fileToUpload = await imageCompression(file, options);
            fileExt = 'webp';
          } catch (error) {
            console.error('Erro na compressão:', error);
          }
        }

        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gado_gaucho_media')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('gado_gaucho_media')
          .getPublicUrl(filePath);

        newFiles.push(data.publicUrl);

        if (type === 'videos' && adForm.images.length === 0 && newImages.length === 0) {
          try {
            const thumbBlob = await generateVideoThumbnail(file);
            const thumbName = `thumb_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
            const { error: thumbErr } = await supabase.storage
              .from('gado_gaucho_media')
              .upload(`images/${thumbName}`, thumbBlob);

            if (!thumbErr) {
              const { data: thumbData } = supabase.storage
                .from('gado_gaucho_media')
                .getPublicUrl(`images/${thumbName}`);
              newImages.push(thumbData.publicUrl);
            }
          } catch (err) {
            console.error('Failed to generate video thumbnail:', err);
          }
        }

      } catch (err) {
        console.error('Upload Error:', err);
        dispatchToast(`Erro ao enviar ${file.name}.`);
      }
    }

    setAdForm((prev) => {
      if (type === 'videos') {
        return {
          ...prev,
          videos: [...prev.videos, ...newFiles],
          images: newImages.length > 0 ? [...prev.images, ...newImages] : prev.images
        };
      } else {
        return {
          ...prev,
          images: [...prev.images, ...newFiles]
        };
      }
    });

    e.target.value = '';

    if (newFiles.length > 0) {
      dispatchToast('Mídia adicionada com sucesso!');
    }
    setIsUploadingMedia(false);
  };

  const removeFile = (index: number, type: 'images' | 'videos') => {
    const fileUrl = adForm[type][index];
    if (fileUrl) {
      if (editingListing) {
        setMediaToDelete(prev => [...prev, fileUrl]);
      } else {
        deleteMediaFromStorage([fileUrl]);
      }
    }
    setAdForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setAdForm(prev => {
      const newImages = [...prev.images];
      if (direction === 'left' && index > 0) {
        const temp = newImages[index - 1];
        newImages[index - 1] = newImages[index];
        newImages[index] = temp;
      } else if (direction === 'right' && index < newImages.length - 1) {
        const temp = newImages[index + 1];
        newImages[index + 1] = newImages[index];
        newImages[index] = temp;
      }
      return { ...prev, images: newImages };
    });
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      dispatchToast('Você precisa estar logado.');
      return;
    }

    setIsSubmittingAd(true);

    const cityData = RS_CITIES.find(c => c.name.toLowerCase() === adForm.city.toLowerCase());

    const newAd = {
      category: adForm.category.toUpperCase(),
      breed: adForm.breed || null,
      title: `${adForm.category} em ${adForm.city}`,
      price: totalPrice,
      priceKg: adForm.priceKg,
      avgWeight: adForm.weight,
      quantity: adForm.batchSize,
      location: `${adForm.city.toUpperCase()} - RS`,
      lat: cityData?.lat || null,
      lng: cityData?.lng || null,
      user_id: user?.id,
      image: (Array.isArray(adForm.images) && adForm.images.length > 0 ? adForm.images[0] : null) || 'https://picsum.photos/seed/newcattle/800/600',
      description: adForm.description,
      images: Array.isArray(adForm.images) && adForm.images.length > 0 ? adForm.images : ['https://picsum.photos/seed/newcattle/800/600'],
      videos: Array.isArray(adForm.videos) ? adForm.videos : [],
      verified: false
    };

    try {
      const url = editingListing ? `/api/listings/${editingListing.id}` : '/api/listings';
      const method = editingListing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(newAd)
      });

      if (res.ok) {
        const savedAd = await res.json();
        if (editingListing) {
          if (mediaToDelete.length > 0) {
            await deleteMediaFromStorage(mediaToDelete);
            setMediaToDelete([]);
          }
          window.dispatchEvent(new CustomEvent('ad_updated', { detail: savedAd }));
          dispatchToast('Anúncio atualizado com sucesso!');
          setShowAdModal(false);
          setEditingListing(null);
        } else {
          window.dispatchEvent(new CustomEvent('ad_created', { detail: savedAd }));
          dispatchToast('Anúncio criado com sucesso!');
          setShowAdModal(false);
          setEditingListing(null);
          router.push(getListingUrl(savedAd));
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        dispatchToast(`Erro ao ${editingListing ? 'atualizar' : 'criar'} anúncio: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error(`Error ${editingListing ? 'updating' : 'creating'} ad:`, error);
      dispatchToast(`Erro: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmittingAd(false);
    }
  };

  if (!showAdModal) return null;

  return (
    <AnimatePresence>
      {showAdModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowAdModal(false); setEditingListing(null); setMediaToDelete([]); }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[95dvh] flex flex-col"
          >
            {(isSubmittingAd || isUploadingMedia) && (
              <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
                <Spinner size="xl" className="mb-4" />
                <h3 className="text-lg font-bold text-[#2D5A27] animate-pulse">
                  {isUploadingMedia ? 'Enviando mídias...' : 'Processando anúncio...'}
                </h3>
                <p className="text-sm text-[#666] mt-2 text-center px-4">
                  {isUploadingMedia ? 'Aguarde o carregamento das suas fotos e vídeos.' : 'Salvando dados no sistema...'}
                </p>
              </div>
            )}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-10 pb-4 border-b border-[#F8F9FA]">
                <h2 className="text-xl md:text-2xl font-bold text-[#333]">
                  {editingListing ? 'Editar Anúncio' : 'Novo Anúncio'}
                </h2>
                <button type="button" onClick={() => { setShowAdModal(false); setEditingListing(null); setMediaToDelete([]); }} className="text-[#999] hover:text-[#333] cursor-pointer bg-[#F8F9FA] rounded-full p-2">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitAd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Categoria</label>
                    <select
                      value={adForm.category}
                      onChange={(e) => setAdForm({ ...adForm, category: e.target.value })}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all appearance-none"
                    >
                      {CATEGORIES_LIST.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Município (RS)</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={citySearchAd}
                        onChange={(e) => {
                          setCitySearchAd(e.target.value);
                          setAdForm({ ...adForm, city: e.target.value });
                          setShowAdSuggestions(true);
                        }}
                        onFocus={() => setShowAdSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowAdSuggestions(false), 200)}
                        placeholder="Busque o município..."
                        className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all cursor-text"
                      />
                      {citySuggestionsAd.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-[#E9ECEF] rounded-xl mt-1 shadow-2xl z-20 max-h-48 overflow-y-auto">
                          {citySuggestionsAd.map((city: any) => (
                            <button
                              key={city.name}
                              type="button"
                              onClick={() => {
                                setAdForm({ ...adForm, city: city.name });
                                setCitySearchAd(city.name);
                                setShowAdSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-[#F8F9FA] transition-colors flex items-center justify-between cursor-pointer border-b border-[#F8F9FA] last:border-0"
                            >
                              <span className="font-medium text-[#333]">{city.name}</span>
                              <span className="text-[10px] uppercase font-bold text-[#999]">RS</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Raça</label>
                    <select
                      value={adForm.breed}
                      onChange={(e) => setAdForm({ ...adForm, breed: e.target.value })}
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all appearance-none"
                    >
                      <option value="">Selecione a raça...</option>
                      <option value="Angus">Angus</option>
                      <option value="Brangus">Brangus</option>
                      <option value="Braford">Braford</option>
                      <option value="Hereford">Hereford</option>
                      <option value="Cruza Angus">Cruza Angus</option>
                      <option value="Cruza Braford">Cruza Braford</option>
                      <option value="Jersey">Jersey</option>
                      <option value="Holandesa">Holandesa</option>
                      <option value="Nelore">Nelore</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Peso Médio (kg)</label>
                    <input
                      type="number"
                      required
                      value={adForm.weight || ''}
                      onChange={(e) => setAdForm({ ...adForm, weight: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Valor por kg (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={adForm.priceKg || ''}
                      onChange={(e) => setAdForm({ ...adForm, priceKg: Number(e.target.value) })}
                      placeholder="0,00"
                      className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Valor Total Estimado</label>
                    <div className="w-full bg-[#E9F0E8] text-[#2D5A27] font-bold rounded-xl px-4 py-3 text-sm border border-transparent shadow-inner">
                      R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Tamanho do Lote (Animais)</label>
                  <input
                    type="number"
                    required
                    value={adForm.batchSize}
                    onChange={(e) => setAdForm({ ...adForm, batchSize: Number(e.target.value) })}
                    placeholder="1"
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#999] uppercase mb-1 ml-2">Descrição e Observações</label>
                  <textarea
                    rows={4}
                    value={adForm.description}
                    onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                    placeholder="Detalhes sobre genética, vacinação, nutrição, etc."
                    className="w-full bg-[#F8F9FA] border border-[#E9ECEF] focus:border-[#2D5A27] focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-[#333] outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={(e) => handleFileChange(e, 'images')}
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingMedia}
                    />
                    <button
                      type="button"
                      disabled={isUploadingMedia}
                      onClick={() => imageInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl transition-all ${isUploadingMedia ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2D5A27] hover:bg-[#F8F9FA] cursor-pointer text-[#999] hover:text-[#2D5A27] bg-white shadow-sm'}`}
                    >
                      {isUploadingMedia ? <Spinner size="sm" variant="default" /> : <Camera size={24} />}
                      <span className="text-[10px] font-bold uppercase">{isUploadingMedia ? 'Enviando...' : 'Adicionar Fotos'}</span>
                    </button>

                    <input
                      type="file"
                      ref={videoInputRef}
                      onChange={(e) => handleFileChange(e, 'videos')}
                      multiple
                      accept="video/*"
                      className="hidden"
                      disabled={isUploadingMedia}
                    />
                    <button
                      type="button"
                      disabled={isUploadingMedia}
                      onClick={() => videoInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E9ECEF] rounded-2xl transition-all ${isUploadingMedia ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#2D5A27] hover:bg-[#F8F9FA] cursor-pointer text-[#999] hover:text-[#2D5A27] bg-white shadow-sm'}`}
                    >
                      {isUploadingMedia ? <Spinner size="sm" variant="default" /> : <Video size={24} />}
                      <span className="text-[10px] font-bold uppercase">{isUploadingMedia ? 'Enviando...' : 'Adicionar Vídeos'}</span>
                    </button>
                  </div>

                  {/* Previews */}
                  {(adForm.images.length > 0 || adForm.videos.length > 0) && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                      {adForm.images.map((img, idx) => (
                        <div key={`img-${idx}`} className="relative aspect-square rounded-xl overflow-hidden group border border-[#E9ECEF] shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="" className="w-full h-full object-cover" />

                          {/* Reorder Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            {idx > 0 && (
                              <button type="button" onClick={() => moveImage(idx, 'left')} className="p-1 bg-white/90 text-[#333] rounded-full hover:bg-white transition-colors">
                                <ChevronLeft size={14} />
                              </button>
                            )}
                            {idx < adForm.images.length - 1 && (
                              <button type="button" onClick={() => moveImage(idx, 'right')} className="p-1 bg-white/90 text-[#333] rounded-full hover:bg-white transition-colors">
                                <ChevronRight size={14} />
                              </button>
                            )}
                          </div>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => removeFile(idx, 'images')}
                            className="absolute top-1 right-1 bg-white/90 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 hover:bg-red-50"
                          >
                            <X size={12} className="stroke-[3px]" />
                          </button>

                          {/* Capa Badge */}
                          {idx === 0 && (
                            <div className="absolute top-1 left-1 bg-[#2D5A27] text-white text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">
                              Capa
                            </div>
                          )}
                        </div>
                      ))}
                      {adForm.videos.map((vid, idx) => (
                        <div key={`vid-${idx}`} className="relative aspect-square rounded-xl overflow-hidden group bg-[#1A1A1A] flex items-center justify-center shadow-sm">
                          <Video size={20} className="text-white/50" />
                          <button
                            type="button"
                            onClick={() => removeFile(idx, 'videos')}
                            className="absolute top-1 right-1 bg-white/90 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 hover:bg-red-50"
                          >
                            <X size={12} className="stroke-[3px]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#F8F9FA]">
                  <button className="w-full py-4 bg-[#2D5A27] text-white font-bold rounded-2xl shadow-lg shadow-[#2D5A27]/20 hover:bg-[#1E3D1A] transition-all cursor-pointer flex justify-center items-center gap-2 text-lg">
                    {editingListing ? 'Salvar Alterações' : 'Publicar Anúncio'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const RS_CITIES = [
  { name: 'Porto Alegre', lat: -30.0346, lng: -51.2177 },
  { name: 'Caxias do Sul', lat: -29.1678, lng: -51.1794 },
  { name: 'Pelotas', lat: -31.7654, lng: -52.3376 },
  { name: 'Santa Maria', lat: -29.6842, lng: -53.8069 },
  { name: 'Canoas', lat: -29.9181, lng: -51.1781 },
  { name: 'Passo Fundo', lat: -28.2628, lng: -52.4067 },
  { name: 'Uruguaiana', lat: -29.7547, lng: -57.0883 },
  { name: 'Bagé', lat: -31.3314, lng: -54.1061 },
  { name: 'Erechim', lat: -27.6341, lng: -52.2739 },
  { name: 'Santa Cruz do Sul', lat: -29.7181, lng: -52.4272 },
  { name: 'Bento Gonçalves', lat: -29.1706, lng: -51.5181 },
  { name: 'Mariana Pimentel', lat: -30.3533, lng: -51.5833 },
];

export const CATEGORIES_LIST = [
  'Touro', 'Boi Castrado', 'Novilho', 'Novilha', 'Terneiro', 'Terneira', 'Vaca', 'Vaca com Cria', 'Vaca Prenha', 'Gado de Leite'
];

export const INITIAL_LISTINGS = [
  {
    title: 'Lote de Novilhos Angus',
    price: 45000,
    priceKg: 12.50,
    avgWeight: 360,
    quantity: 10,
    category: 'NOVILHO',
    seller: 'Estância do Sol',
    sellerRating: 4.8,
    verified: true,
    image: 'https://picsum.photos/seed/cattle1/800/600',
    images: ['https://picsum.photos/seed/cattle1_1/800/600'],
    description: 'Excelente lote de novilhos Angus, prontos para engorda.',
    location: 'URUGUAIANA - RS'
  },
  {
    title: 'Vacas Nelore com Cria',
    price: 68000,
    priceKg: 10.80,
    avgWeight: 450,
    quantity: 14,
    category: 'VACA COM CRIA',
    seller: 'Fazenda Pampa',
    sellerRating: 4.5,
    verified: false,
    image: 'https://picsum.photos/seed/cattle2/800/600',
    images: ['https://picsum.photos/seed/cattle2_1/800/600'],
    description: 'Vacas Nelore de ótima genética com crias ao pé.',
    location: 'BAGÉ - RS'
  }
];

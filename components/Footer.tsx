import React from 'react';
import Link from 'next/link';
import { Instagram, MessageCircle, ShieldCheck } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E9ECEF] pt-12 pb-24 lg:pb-12 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Logo e Descrição */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="font-logo text-3xl text-[#2D5A27]">
              Gado Gaúcho
            </Link>
            <p className="text-sm text-[#666] leading-relaxed max-w-sm">
              A principal plataforma de negociação de gado do Rio Grande do Sul.
              Segurança, agilidade e os melhores lotes do estado na palma da sua mão.
            </p>
          </div>

          {/* Links Úteis */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-[#333] text-sm uppercase tracking-wider">Acesso Rápido</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/relatorio-preco-do-gado" className="text-sm font-bold text-[#2D5A27] hover:text-[#1E3D1A] transition-colors w-fit flex items-center gap-1">
                Boletim Semanal de Preços
              </Link>
              <Link href="/calculadoras/gmd" className="text-sm font-bold text-[#2D5A27] hover:text-[#1E3D1A] transition-colors w-fit flex items-center gap-1">
                Calculadora GMD
              </Link>
              <Link href="/calculadoras/proteinado" className="text-sm font-bold text-[#2D5A27] hover:text-[#1E3D1A] transition-colors w-fit flex items-center gap-1">
                Calculadora de Proteinado
              </Link>
              <Link href="/calculadoras/pastagem" className="text-sm font-bold text-[#2D5A27] hover:text-[#1E3D1A] transition-colors w-fit flex items-center gap-1">
                Calculadora de Pastagem
              </Link>
              <Link href="/precodogado" className="text-sm text-[#666] hover:text-[#2D5A27] transition-colors w-fit">
                Inteligência de Mercado
              </Link>
              <Link href="/termos" className="text-sm text-[#666] hover:text-[#2D5A27] transition-colors w-fit">
                Termos de Uso
              </Link>
              <Link href="/politica-de-privacidade" className="text-sm text-[#666] hover:text-[#2D5A27] transition-colors w-fit">
                Política de Privacidade
              </Link>
              <Link href="/contato" className="text-sm text-[#666] hover:text-[#2D5A27] transition-colors w-fit">
                Contato
              </Link>
            </nav>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-[#333] text-sm uppercase tracking-wider">Nossas Redes</h4>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/gadogaucho"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#666] hover:text-[#E1306C] hover:bg-[#E1306C]/10 transition-all cursor-pointer"
                title="Siga-nos no Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://wa.me/5551981926800"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#666] hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all cursor-pointer"
                title="Fale conosco no WhatsApp"
              >
                <MessageCircle size={20} />
              </a>
            </div>

            {/* Selo extra de segurança */}
          </div>

        </div>

        {/* Divisor e Copyright */}
        <div className="border-t border-[#E9ECEF] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#999]">
            &copy; {currentYear} Gado Gaúcho. Todos os direitos reservados.
          </p>
          <p className="text-xs text-[#999]">
            Feito para o pecuarista gaúcho.
          </p>
        </div>
      </div>
    </footer>
  );
}

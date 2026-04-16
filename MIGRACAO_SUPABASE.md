# Relatório de Migração: Supabase Auth & SSR

Este documento detalha a migração do sistema de autenticação do Gado Gaúcho de uma implementação customizada para o Supabase Auth Nativo.

## 1. Estratégia de Migração (Lazy Migration)
Para evitar que os usuários tivessem que resetar suas senhas, implementamos uma "Migração Preguiçosa" no arquivo `app/api/auth/login/route.ts`:
- O sistema tenta o login nativo no Supabase.
- Se falhar, ele verifica as credenciais na tabela legada `public.users` (suporta Bcrypt e Texto Simples).
- Se as credenciais legadas estiverem corretas, o usuário é criado no Supabase Auth em tempo real.
- Um trigger SQL (`handle_new_user`) sincroniza o novo UUID com os dados antigos (`listings`, `messages`, `favorites`).

## 2. Mudanças no Banco de Dados (PostgreSQL)
Realizamos alterações estruturais para suportar UUIDs:
- **Conversão de Tipos**: Alteramos a coluna `id` da tabela `users` de `INTEGER` para `TEXT`.
- **Integridade Referencial**: Atualizamos todas as Foreign Keys para `ON UPDATE CASCADE`. Isso garantiu que, ao mudar o ID do usuário de um número para um UUID, todos os anúncios e mensagens vinculados fossem atualizados automaticamente.
- **Trigger de Sincronização**: Criamos uma função no banco que intercepta a criação de usuários pelo Supabase e faz o "merge" com os registros existentes na tabela `public`.

## 3. Persistência e SSR (Server-Side Rendering)
A autenticação agora é baseada em Cookies seguros em vez de `localStorage`:
- **Middleware**: Força a renovação da sessão em cada requisição, evitando expiracões inesperadas.
- **UserContext**: Centraliza o estado de autenticação e expõe a variável `isAuthReady`, garantindo que as páginas só carreguem após o Supabase confirmar o login.
- **Proteção de Rotas**: Páginas como `/admin`, `/meus-anuncios`, `/mensagens` e `/favoritos` foram refatoradas para validar a sessão de forma reativa.

## 4. Arquivos Principais Modificados
- `app/api/auth/login/route.ts`: Lógica de migração e login.
- `context/UserContext.tsx`: Gerenciamento global de estado.
- `middleware.ts`: Proteção de nível de servidor e persistência de cookies.
- `lib/supabase.ts`: Configuração dos clientes Admin e Browser.
- `app/admin/page.tsx`, `app/meus-anuncios/page.tsx`, etc: Atualização da proteção de rota.

## 5. Como manter
- **Novos Usuários**: São criados diretamente no Supabase via `auth.signUp`.
- **Limpeza**: Futuramente, a lógica de senhas legadas no login pode ser removida (recomendado após 6 meses de uso).
- **Segurança**: Agora é possível ativar o RLS (Row Level Security) em todas as tabelas usando `auth.uid()`.

---
**Data da Atualização**: 15 de Abril de 2026
**Responsável**: Antigravity AI Coding Assistant

# Projeto de controle de estoque

Aplicação React, TypeScript e TanStack Start, com Supabase para autenticação e
persistência. O desenvolvimento e as configurações devem funcionar localmente,
sem depender de plataformas de criação ou hospedagem específicas.

## Regras de estoque

- O saldo (`products.quantity`) é alterado somente pelo gatilho de inserção de
  movimentações. Nunca atualize o saldo diretamente pelo cliente.
- Cada usuário acessa apenas os próprios produtos e movimentações, protegidos
  pelas políticas RLS que verificam `user_id`.
- Preserve essas garantias ao alterar formulários, consultas ou migrações.

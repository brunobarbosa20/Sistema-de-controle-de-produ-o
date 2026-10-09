# Controle de Estoque

Aplicação responsiva para cadastro de produtos, controle de saldo por unidade
(UN) ou grama (GR), registro de entradas e saídas e consulta do histórico.
Cada produto usa uma única unidade fixa: peças são controladas em UN e itens
pesados em gramas inteiras (GR). O valor de itens em GR é informado por grama.
O cadastro do produto não guarda preço; os valores são informados e registrados
nas entradas. Saídas registram somente quantidade e observação.

## Tecnologias

- React, TypeScript e TanStack Start
- Vite e Tailwind CSS
- Supabase (PostgreSQL e autenticação)

## Desenvolvimento local

Requisitos: Node.js e npm.

1. Instale as dependências:

   ```sh
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha a URL e a chave publicável do seu
   projeto Supabase.
3. No Supabase, aplique as migrações SQL em ordem. Em uma instalação nova,
   aplique `0000_migration.sql`, `0001_shared_inventory.sql`,
   `0002_product_archive.sql`, `0003_grams_unit.sql` e
   `0004_entry_only_prices.sql`, nesta ordem. Se o estoque compartilhado, o
   arquivamento e a unidade GR já estão ativos, aplique somente
   `0004_entry_only_prices.sql`. A migração `0001` configura o estoque
   compartilhado e promove `bruno@teste.com` como primeiro administrador.
   A migração `0003` converte os saldos e o histórico existentes de KG para GR,
   preservando os valores totais ao converter também os preços por unidade.
4. Inicie a aplicação:

   ```sh
   npm run dev
   ```

Para entrar com Google, habilite o provedor Google na autenticação do Supabase e
configure as URLs de redirecionamento do projeto. O acesso por e-mail e senha
não depende dessa configuração.

## Comandos

- `npm run dev`: servidor de desenvolvimento
- `npm run build`: build de produção
- `npm run lint`: análise estática
- `npm test`: testes

## Acesso ao estoque

Todos os usuários autenticados veem o mesmo estoque. Novos cadastros entram com
permissão **Consulta**. Administradores podem alterar o nível de acesso na aba
**Equipe**:

- **Administrador:** consulta e operação do estoque e gerenciamento de papéis.
- **Operador:** consulta, cadastro de produtos e registro de entradas/saídas.
- **Consulta:** somente leitura.

Os papéis e as permissões são aplicados no PostgreSQL por RLS; ocultar botões na
interface não é a única proteção. O banco não apaga produtos nem histórico quando
uma conta é removida: as colunas de autoria guardam UUID e e-mail como registro,
sem chave estrangeira para a conta. A exclusão física de produtos e movimentações
por usuários autenticados não é permitida; produtos com movimentações também
estão protegidos por restrição no banco.

O saldo é alterado somente por movimentações. O cadastro de produto e seu saldo
inicial são gravados em uma única operação no banco.

Para preservar o histórico, produtos não são apagados: operadores e
administradores podem inativar produtos com saldo zero, consultar itens inativos
e reativá-los. Novas movimentações só podem ser feitas em produtos ativos.

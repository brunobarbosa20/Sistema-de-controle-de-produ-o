# Controle de Estoque

Aplicação responsiva para cadastro de produtos, controle de saldo por unidade
(UN) ou grama (GR), registro de entradas e saídas e consulta do histórico.
Cada produto usa uma única unidade fixa: peças são controladas em UN e itens
pesados em gramas inteiras (GR). Nas entradas de itens em GR, informe o peso e o
valor total do pacote; o sistema calcula e registra o custo por grama. Para itens
em UN, informe o custo por unidade. O cadastro do produto não guarda preço; os
valores são registrados nas entradas. Saídas registram somente quantidade e
observação.

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
   `0002_product_archive.sql`, `0003_grams_unit.sql`,
   `0004_entry_only_prices.sql`, `0005_product_code.sql`,
   `0006_product_observations.sql`, `0007_recipes.sql`,
   `0008_cancelled_products.sql`, `0009_recipe_product_preregistration.sql` e
   `0010_backfill_recipe_ingredients.sql` e `0011_milliliter_unit.sql`, nesta
   ordem. Se as migrações até `0010` já estão ativas, aplique
   `0011_milliliter_unit.sql`. A
   migração `0001` configura o estoque compartilhado e promove
   `bruno@teste.com` como primeiro administrador.
   A migração `0003` converte os saldos e o histórico existentes de KG para GR,
   preservando os valores totais ao converter também os preços por unidade.
   A migração `0005` atribui códigos únicos no formato `MP00000001` aos produtos
   existentes e novos.
   A migração `0006` adiciona observações aos itens e à função de cadastro.
   A migração `0007` cria receitas compartilhadas e ingredientes com controle de
   acesso: usuários autenticados podem consultar e criar receitas; somente o
   criador pode editar ou excluir.
   A migração `0008` adiciona a aba de produtos cancelados. O saldo original é
   preservado como histórico, mas os produtos cancelados ficam fora das listas e
   contagens normais e não aceitam novas movimentações.
   A migração `0009` cria pré-cadastros para ingredientes ainda inexistentes ao
   salvar receitas, atribui o código MP e mantém o saldo zerado. Operadores e
   administradores finalizam esses itens pela Home antes de movimentá-los.
   A migração `0010` associa ingredientes livres de receitas já existentes a
   produtos compatíveis ou cria os pré-cadastros pendentes correspondentes.
   A migração `0011` habilita ML (mililitros) como unidade de estoque e de
   ingredientes, com cálculo do custo por mililitro nas entradas.
4. Inicie a aplicação:

   ```sh
   npm run dev
   ```

Para entrar com Google, habilite o provedor Google na autenticação do Supabase e
configure as URLs de redirecionamento do projeto. O acesso por e-mail e senha
não depende dessa configuração.

## Publicação no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica a aplicação ao enviar
alterações para a branch `main` ou ao executá-lo manualmente em **Actions**.
Antes da primeira publicação:

1. Em **Settings > Pages**, escolha **GitHub Actions** como fonte de publicação.
2. Em **Settings > Secrets and variables > Actions > Variables**, crie
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do
   projeto Supabase.
3. Execute o workflow **Deploy to GitHub Pages** em **Actions** ou envie um
   commit para `main`.
4. Copie a URL do site exibida na execução do workflow e configure-a como
   **Site URL** e URL de redirecionamento permitida em **Authentication > URL
   Configuration** no Supabase. Inclua a URL da página com o caminho do
   repositório na lista de redirecionamentos.

A chave `VITE_SUPABASE_PUBLISHABLE_KEY` é pública e fica incluída no JavaScript
do navegador; a segurança dos dados depende das políticas RLS do Supabase.
Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` nas variáveis do GitHub Pages.
O GitHub Pages hospeda apenas arquivos estáticos; as operações de dados e
autenticação deste app são feitas diretamente pelo cliente Supabase.

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

## Receitas

Receitas são compartilhadas entre usuários autenticados. Qualquer usuário
autenticado pode cadastrar uma receita; somente o criador pode editá-la ou
excluí-la. Cada receita registra nome, rendimento em porções e ingredientes com
quantidade inteira em UN ou GR. Ingredientes podem ser vinculados a produtos
ativos do estoque ou salvos como ingredientes livres; salvar ou editar uma
receita não altera o saldo do estoque.

# Estuda+

App de estudos (chat, resumo, flashcards, quiz, cronômetro por matéria,
repertório de redação, treino de tabuada/raízes, anexo de imagem/PDF/áudio
no chat e no quiz, feed de atividades e comparação de estatísticas com
amigos, e calculadora de nota de corte) com login Google via
Supabase Auth, estatísticas e sessões de estudo persistidas no Postgres do
Supabase, perfil editável (nome + foto no Supabase Storage) e
configurações de tema claro/escuro e idioma (pt/es/en). Roda na web e,
empacotado com Capacitor, como app Android.

## Arquitetura (por que foi feito assim)

- **Auth**: Supabase Auth com provedor Google.
  - Na **web**, usa `signInWithOAuth` (fluxo de redirect: manda pro
    Google, o Google volta pro seu domínio, e o client detecta a sessão
    sozinho na URL de volta).
  - No **Android nativo**, o Google bloqueia OAuth dentro de WebViews
    (erro `disallowed_useragent`). Por isso o login nativo usa o plugin
    `@capgo/capacitor-social-login`, que abre o seletor de conta do
    próprio Android, pega um ID token nativo e troca ele por uma sessão
    do Supabase via `signInWithIdToken` (com nonce hasheado em SHA-256,
    exigido pelo Supabase pra esse fluxo).
- **Dados**: Postgres do Supabase, três tabelas (todas com Row Level
  Security — cada usuário só lê/escreve as próprias linhas):
  - `profiles` — nome, e-mail, foto, tema e idioma, tudo numa linha só
    (no Firestore isso era espalhado em subcoleções; no Postgres não
    precisa). Sincroniza em tempo real via Supabase Realtime.
  - `study_stats` — `flashcards_viewed`, `questions_answered`,
    `correct_answers`, `drills_answered`, `drills_correct`, atualizados
    por funções SQL (`increment_flashcard_viewed`,
    `record_quiz_answer`, `record_drill_answer`) que fazem
    `UPDATE ... SET x = x + 1` atomicamente — equivalente ao
    `increment()` do Firestore, sem risco de race condition.
  - `study_sessions` — uma linha por cronômetro finalizado (`materia`,
    `segundos`, `started_at`), usada pra montar o gráfico da semana.
  - Uma trigger (`handle_new_user`) cria a linha de `profiles` e
    `study_stats` automaticamente no primeiro login — o app não precisa
    mais fazer esse "upsert" manualmente como fazia no Firestore.
  - Tudo isso está em `supabase/schema.sql` — é só colar no SQL Editor
    do seu projeto Supabase (ver passo 2).
- **Arquivos**: foto de perfil vai pro bucket `avatars` do Supabase
  Storage (`{uid}/avatar.ext`, público pra leitura, só o dono escreve).
- **IA**: as chamadas de IA passam por uma função serverless
  (`api/chatWithAI.js`, hospedada na Vercel), nunca direto do navegador —
  assim as chaves de API (Groq/Gemini) ficam só no servidor (variáveis de
  ambiente da Vercel), nunca expostas no bundle do cliente. A rota
  verifica o token de sessão do Supabase (`getUser(token)`, que valida
  contra o servidor de Auth) antes de aceitar a chamada, tenta a Groq
  primeiro e, se falhar (erro, limite de uso etc.), cai automaticamente
  para o Gemini (Google AI Studio). Mensagens com anexo (imagem, PDF ou
  áudio) vão direto pro Gemini via API nativa, sem tentar a Groq antes —
  ela só processa texto. **Groq e Gemini têm tier gratuito de verdade**
  (sem cartão, sem saldo pré-pago), então o app inteiro roda sem custo
  nenhum. O idioma escolhido nas configurações é enviado no
  `system prompt`, então o chat, os resumos, os flashcards, o quiz e o
  repertório respondem no idioma selecionado.

  > **Por que Vercel pra IA, e não uma Edge Function do Supabase?** O
  > Supabase também tem funções serverless (Edge Functions, em Deno) que
  > funcionariam igual de bem pra isso — foi só uma escolha de manter a
  > IA na Vercel (que já estava configurada) e usar o Supabase focado em
  > dados/auth/storage. Se preferir consolidar tudo no Supabase, dá pra
  > portar `api/chatWithAI.js` pra uma Edge Function sem mudar a lógica,
  > só a sintaxe do handler.

## 1. Instalar dependências

```bash
npm install
```

## 2. Criar e configurar o projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (gratuito, sem
   cartão).
2. **SQL Editor → New query** → cole o conteúdo inteiro de
   `supabase/schema.sql` → **Run**. Isso cria as tabelas, as políticas de
   RLS, a trigger de criação de perfil, as funções de incremento e o
   bucket de avatares. Depois, faça o mesmo com
   `supabase/schema_friends.sql` (sistema de amigos) e
   `supabase/schema_activities.sql` (feed de atividades, depende da
   tabela de amigos existir primeiro) - são arquivos separados porque
   foram adicionados depois; se você já rodou o `schema.sql` antes, só
   precisa rodar os novos, não o primeiro de novo.
3. **Authentication → Sign in / Providers → Google** → habilite, e
   preencha o **Client ID** e **Client Secret** do Google (veja o passo
   3 abaixo pra saber de onde tirar).
4. **Authentication → URL Configuration** → confirme que
   `http://localhost:5173` (e depois o domínio da Vercel) estão nas
   **Redirect URLs**.

## 3. Configurar o OAuth do Google

Você pode reaproveitar um **Client ID do tipo "Web application"** já
existente no Google Cloud Console (Credentials), ou criar um novo:

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   abra o Client ID Web (ou crie um).
2. Em **Authorized redirect URIs**, adicione:
   `https://SEU-PROJETO.supabase.co/auth/v1/callback`
   (pega a URL exata na tela do passo 2.3 do Supabase, ela mostra o
   callback certo).
3. Copie o **Client ID** e o **Client secret** e cole na tela do Google
   dentro do Supabase (passo 2.3).
4. Guarde o Client ID também — ele vai pro `.env.local` como
   `VITE_GOOGLE_WEB_CLIENT_ID` (usado pelo login nativo no Android).

## 4. Configurar as variáveis de ambiente

Copie o template e preencha:

```bash
cp .env.local.example .env.local
```

- `VITE_SUPABASE_URL` / `SUPABASE_URL` → Dashboard → Settings → API →
  "Project URL".
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` →
  Dashboard → Settings → API Keys → chave `sb_publishable_...` (não é
  secreta, pode ir no cliente — é o equivalente atual da antiga `anon
  key`).
- `VITE_GOOGLE_WEB_CLIENT_ID` → o Client ID do passo 3.
- `GROQ_API_KEY` → console.groq.com → API Keys. Plano gratuito, sem
  cartão, ~30 requisições/minuto — dá pra tudo em texto (chat, resumo,
  flashcards, quiz, repertório).
- `GEMINI_API_KEY` → aistudio.google.com/apikey (Google AI Studio).
  Também gratuito de verdade, sem cartão — ~1.500 requisições/dia. Usada
  como fallback de texto e como rota principal de **qualquer mensagem
  com anexo** (imagem, PDF ou áudio) no Chat e no Quiz.

## 5. Rodar localmente

O `npm run dev` sozinho (Vite) sobe o site, mas **não** roda a pasta
`api/` — os recursos de IA vão dar erro de rede. Pra testar tudo junto,
use o CLI da Vercel (já está no `package.json` como devDependency):

```bash
npx vercel dev
```

Na primeira vez ele pergunta pra linkar a um projeto Vercel — pode
responder que sim/criar um novo, é gratuito. Ele lê as variáveis do
`.env.local` automaticamente. Depois disso abre em `http://localhost:3000`
(não mais o 5173 do Vite puro).

Se você só quer mexer em UI/timer/tabuada (nada que chame IA), o
`npm run dev` normal (porta 5173) continua funcionando sem precisar da
Vercel.

## 6. Deploy

```bash
npx vercel --prod
```

Na primeira vez, a Vercel vai pedir pra configurar as env vars de
produção — cole os mesmos valores do `.env.local` (ou rode
`npx vercel env add GROQ_API_KEY production` pra cada uma). Depois volte
no passo 2.4 e adicione o domínio final da Vercel nas **Redirect URLs**
do Supabase Authentication.

## 7. Empacotar para Android (Capacitor)

```bash
npx cap init "Estuda+" "com.exportza.estudaplus" --web-dir dist
npm run build
npx cap add android
npx cap sync android
```

O login Google nativo usa o `@capgo/capacitor-social-login`, que já vem
configurado em `capacitor.config.json`. Você ainda precisa:

1. No Google Cloud Console, criar um **Client ID do tipo "Android"**
   (pacote `com.exportza.estudaplus` + SHA-1 de assinatura). Gere o
   SHA-1 do keystore de debug:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
2. Esse Client ID Android **não** vai no `webClientId` (esse continua
   sendo o Web Client ID) — ele só precisa existir e estar corretamente
   registrado no Google Cloud Console com o pacote e o SHA-1 certos; é
   isso que autoriza o app assinado a completar o login.
3. Abrir/rodar o projeto pelo Android Studio (`npx cap open android`).

## Estrutura de dados (Postgres / Supabase)

```
profiles
  id (= auth.users.id), display_name, email, photo_url,
  theme, language, last_login, updated_at

study_stats
  user_id, flashcards_viewed, questions_answered, correct_answers,
  drills_answered, drills_correct, updated_at

study_sessions
  id, user_id, materia, segundos, started_at, created_at
```

Schema completo, com RLS, trigger e funções, em `supabase/schema.sql`.
Toda tabela tem Row Level Security ativado com política
`auth.uid() = user_id` (ou `= id` em `profiles`) — nenhum usuário
autenticado consegue ler ou escrever a linha de outro.

## Timer, Perfil e Configurações — como usar

- **Cronômetro**: escolha ou digite uma matéria, inicie, pause/retome à
  vontade e clique em "Salvar e encerrar" para gravar a sessão. A aba
  mostra o gráfico da semana (minutos por dia) e o tempo total por
  matéria, ambos recalculados em tempo real a cada sessão salva.
- **Perfil**: troca o nome de exibição e a foto (upload vai pro bucket
  `avatars` do Supabase Storage) e mostra, na mesma tela, as estatísticas
  de estudo (flashcards vistos, acertos de quiz e de tabuada/raízes,
  taxa de acerto) — tudo em tempo real via Supabase Realtime. Vale tanto
  na web quanto no Android.
- **Configurações**: tema claro/escuro aplicado na hora (sem reload) e
  idioma (Português, Español, English) — o idioma também muda o idioma
  das respostas de IA no chat, resumo, flashcards, quiz e repertório.
- **Tabuada e Raízes**: treino de matemática rápida (tabuada de 1 a N e
  raízes/quadrados perfeitos), gerado localmente no dispositivo — sem
  chamada de IA, então funciona até sem internet e não consome as
  chamadas de Groq/Gemini. Contabiliza acertos separadamente na tela
  de Perfil.
- **Anexos no Chat e no Quiz** (imagem, PDF, áudio): em vez de uma aba
  separada, o botão de clipe (📎) fica direto na caixa de mensagem do
  Chat e no campo de tema do Quiz — igual ao próprio Claude. No Chat, dá
  pra anexar uma foto de exercício, um PDF ou um áudio e conversar sobre
  o conteúdo, com histórico completo (múltiplos anexos por conversa). No
  Quiz, o anexo vira o material-fonte pra gerar as questões (com o campo
  de tema funcionando como um foco opcional). Toda essa parte vai direto
  pro Gemini via API nativa (`generateContent`), que tem suporte de
  primeira classe pra imagem, PDF e áudio no mesmo formato — a Groq nunca
  é tentada quando tem anexo, porque ela só processa texto. Limite de
  15MB por arquivo (a Gemini limita ~20MB por requisição inteira,
  somando todos os anexos + texto).
- **Amigos** (`Friends.jsx`): busca por e-mail (via função `search_users_by_email`,
  que só devolve nome/foto/e-mail — nunca expõe a tabela `profiles`
  inteira), pedido de amizade, aceitar/recusar/remover, e uma vez aceito,
  compara as estatísticas (flashcards, acertos, tabuada/raízes) lado a
  lado. Se A pede amizade pra B e B já tinha pedido pra A antes, o
  sistema aceita automaticamente em vez de duplicar (`send_friend_request`
  em `schema_friends.sql`). Tudo em tempo real via Realtime — um pedido
  novo aparece sem precisar recarregar a página.
- **Feed de Atividades** (`Feed.jsx`): mostra suas próprias atividades e
  as dos seus amigos aceitos - quiz completado, treino de tabuada,
  sessão de estudo salva, amizade nova - em ordem cronológica, com
  "há Xmin/h/d" e atualização em tempo real. A função
  `get_activity_feed()` (em `schema_activities.sql`) já junta o nome/foto
  de quem fez a atividade; a autorização (só vê próprio + de amigo
  aceito) é checada dentro da própria função seguindo o mesmo padrão de
  segurança da comparação de estatísticas.
- **Calculadora de Nota de Corte** (`NotaCorte.jsx`): duas partes.
  1. Uma calculadora de média ponderada normal (nota × peso por área,
     com perfis de peso ilustrativos e um campo pra você colar a nota de
     corte do curso e comparar) — isso é matemática exata, sem
     pegadinha.
  2. Um estimador aproximado de nota por número de acertos. **Importante:
     esse estimador NÃO é uma tabela oficial do INEP** — não existe
     fórmula pública exata para a TRI, e eu não tinha uma tabela real
     verificada de "acertos → nota" por ano pra te dar sem inventar
     números. O que o componente faz é interpolar entre poucos pontos de
     referência públicos (ordem de grandeza: quem chuta tudo fica perto de
     ~300 pontos; ~800 pontos costuma ficar na faixa de 36 a 43 acertos,
     variando por área/ano segundo fontes de terceiros) — por isso ele
     sempre mostra uma **faixa**, nunca um número único, e deixa o aviso
     de incerteza visível na tela. Se você quiser precisão maior por
     ano/caderno de prova específico, a fonte mais confiável são os
     microdados do Enem publicados pelo INEP (ou ferramentas de
     terceiros que já processaram esses microdados) — não dá pra
     embutir isso aqui sem acesso aos dados reais de cada edição.

## Segurança — pontos que já foram tratados

- A chave `sb_publishable_...` do Supabase **não é secreta** (é assim
  que o Supabase funciona no cliente, igual a `apiKey` do Firebase
  antes); a proteção real está nas políticas de Row Level Security e nas
  Redirect URLs autorizadas.
- Chaves de IA (Groq/Gemini) ficam **só** nas variáveis de ambiente da
  Vercel (`api/chatWithAI.js`), nunca no bundle do frontend.
- A rota `/api/chatWithAI` verifica o token de sessão do Supabase
  (`getUser(token)`, validado contra o servidor de Auth) antes de
  aceitar qualquer chamada, evitando abuso/custo por terceiros não
  autenticados.
- Toda tabela tem RLS habilitado desde a criação (`supabase/schema.sql`)
  — não existe uma janela em que os dados ficam sem proteção.
- O bucket `avatars` é público pra **leitura** (precisa ser, pra foto
  aparecer no app), mas a **escrita** é restrita por política: só o
  dono consegue subir/atualizar um arquivo dentro da própria pasta
  (`{uid}/...`).

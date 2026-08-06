# Guia de transição para um Supabase próprio

Este documento reúne as instruções para você criar um novo projeto no Supabase na sua própria conta, conectar esse banco ao projeto Chefio e testar o fluxo localmente.

## 1. Objetivo

Mover o banco de dados do projeto para um Supabase próprio para ter:
- mais controle sobre o ambiente;
- menos dependência de terceiros;
- liberdade para testar dados fictícios, migrations e integrações;
- facilidade para ajustar configurações do projeto.

## 2. Pré-requisitos

Antes de começar, certifique-se de que você tem:
- uma conta no Supabase;
- acesso à internet;
- o projeto local do Chefio aberto no VS Code;
- o Node.js e as dependências do projeto instaladas.

## 3. Criar um novo projeto no Supabase

1. Acesse https://supabase.com.
2. Faça login com sua conta.
3. Clique em "New project".
4. Escolha uma organização.
5. Defina:
   - nome do projeto;
   - senha do banco;
   - região;
   - plano adequado para o seu uso.
6. Aguarde a criação do projeto.

## 4. Obter as credenciais do projeto

Depois que o projeto for criado, copie estas informações:
- Project URL
- anon key
- service role key

Essas informações serão usadas para conectar o app ao novo banco.

## 5. Configurar o projeto local

No projeto local, crie ou edite o arquivo `.env.local` na raiz do repositório.

Adicione as seguintes variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

> Se você já tiver um `.env.local`, substitua os valores antigos pelos do novo projeto.

## 6. Aplicar as migrations do projeto

O repositório já contém as migrations em [supabase/migrations](supabase/migrations).

No painel do Supabase:
1. Entre no seu projeto.
2. Abra o SQL Editor.
3. Execute as migrations na ordem correta.

A ordem é a numérica dos arquivos em [supabase/migrations](supabase/migrations) — execute todos, em ordem crescente, do `00001` até o último.

## 7. Verificar se o banco foi criado corretamente

Depois de aplicar as migrations, confira se as tabelas foram criadas, como:
- profiles
- teacher_profiles
- courses
- lessons
- enrollments

Você pode validar isso no painel do Supabase em "Table Editor".

## 8. Rodar o projeto localmente

No terminal, na raiz do projeto, execute:

```bash
npm install
npm run dev
```

A aplicação deve subir normalmente e passar a usar o novo Supabase.

## 9. Testar a experiência do catálogo

Para validar o fluxo de cursos:
1. Crie dados fictícios no banco.
2. Garanta que o curso tenha:
   - `title`
   - `slug`
   - `status = 'approved'`
   - `teacher_id` válido
3. Acesse a rota `/cursos`.
4. Confirme se o curso aparece na tela.

## 10. Criar dados fictícios para testar

Você pode inserir cursos manualmente pelo SQL Editor, por exemplo:

```sql
INSERT INTO public.courses (
  teacher_id,
  title,
  slug,
  description,
  thumbnail_url,
  price,
  category,
  status
)
VALUES (
  'SEU_UUID_DE_PROFILE',
  'Curso de Teste de Panificação',
  'curso-de-teste-de-panificacao',
  'Curso fictício apenas para testar a interface.',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  129.90,
  'Panificação',
  'approved'
);
```

## 11. O que pode dar errado

Se algo não funcionar, confira:
- se as variáveis de ambiente foram preenchidas corretamente;
- se a URL do Supabase está correta;
- se a migration foi aplicada por completo;
- se o `status` do curso é `approved`;
- se o `teacher_id` existe na tabela `profiles`.

## 12. Checklist final

Antes de considerar a transição concluída, confirme:
- [ ] um novo projeto foi criado no Supabase;
- [ ] as credenciais foram copiadas;
- [ ] o arquivo `.env.local` foi atualizado;
- [ ] as migrations foram aplicadas;
- [ ] o projeto roda localmente;
- [ ] os cursos aparecem na tela do catálogo;
- [ ] você consegue testar dados fictícios sem depender do banco antigo.

## 13. Recomendação prática

Se o seu objetivo é apenas ganhar controle e testar rapidamente, vale seguir este caminho:
1. criar um projeto novo na sua conta;
2. conectar o projeto local a ele;
3. aplicar as migrations;
4. popular alguns cursos fictícios;
5. usar esse ambiente como base de desenvolvimento.

Se quiser, no próximo passo eu posso te ajudar a criar um arquivo de seed para popular vários cursos fictícios automaticamente no novo banco.

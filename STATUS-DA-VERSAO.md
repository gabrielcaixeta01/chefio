# Chefio — Status da versão

**Ambiente:** Homologação · **Data:** 21 de agosto de 2026
**URL:** https://chefio-seven.vercel.app

Documento para leitura do PO. Descreve o que está implementado e funcionando nesta
versão, o que mudou desde a última revisão, e o que ainda falta para a plataforma
poder vender de verdade.

> **Este é um ambiente de homologação.** Não há clientes reais, e nenhuma cobrança
> aqui é verdadeira. As contas e os dados abaixo são de teste e servem para você
> navegar pelo sistema como cada tipo de usuário.

---

## 1. Acessos para teste

Todas as contas usam a mesma senha: **`senha123`**

### Contas principais

| Papel | E-mail | O que ela representa |
|---|---|---|
| **Dono / financeiro** | `dono@gmail.com` | Você. Controla a plataforma inteira, incluindo comissão. |
| **Professora** | `marina@chefio.test` | Chef aprovada, dona do catálogo de cursos. |

### Contas de apoio (para ver os dois lados de cada fluxo)

| Papel | E-mail | Situação |
|---|---|---|
| Professor | `bruno@chefio.test` | Aprovado, com comissão fora do padrão (20%) |
| Candidato a professor | `rafael@chefio.test` | Candidatura **aguardando sua aprovação** |
| Candidata a professora | `leticia@chefio.test` | Candidatura **aguardando sua aprovação** |
| Aluna | `ana@chefio.test` | Comprou 2 cursos, tem pedidos na loja e um pedido de devolução aberto |
| Aluno | `carlos@chefio.test` | Comprou 1 curso, tem pedido pago aguardando envio |
| Aluna | `dani@chefio.test` | **Pediu reembolso** de um curso — está na sua fila |
| Aluno | `edu@chefio.test` | Teve um reembolso aprovado e outro negado |

> **Pré-requisito:** essas contas e os dados de movimento vêm dos scripts de seed
> (`supabase/SEED_HML_1_CONTAS.sql`, `SEED_DADOS_DEMO.sql`, `SEED_HML_2_MOVIMENTO.sql`).
> Se alguma tela aparecer vazia, é sinal de que um dos scripts ainda não rodou até o fim.

---

## 2. O que o **dono** pode fazer

Entra em `/admin`. A área é um console de trabalho: cada seção é uma fila de decisões
esperando alguém.

| Seção | O que se faz ali |
|---|---|
| **Dashboard** | Visão do que está pendente de decisão |
| **Professores** | Aprovar ou recusar quem se candidatou a dar aula, com justificativa |
| **Cursos** | Revisar curso enviado pelo chef e aprovar ou devolver com motivo — nenhum curso vai ao ar sem passar por aqui |
| **Financeiro** | Receita bruta, comissão da plataforma, repasses aos chefs, gráfico dos últimos 6 meses e **alteração da comissão de cada professor** |
| **Produtos** | Catálogo da loja física, controle de estoque e aprovação dos produtos que os chefs pedem para cadastrar |
| **Pedidos** | Despachar pedidos pagos, lançar código de rastreio, acompanhar entrega |
| **Matrículas** | Quem comprou qual curso |
| **Reembolsos** | Aprovar ou negar pedidos de reembolso de curso, e devoluções de produto |
| **Alterações** | Autorizar troca de vídeo ou remoção de aula em curso que já tem aluno pagante |
| **Cupons** | Criar cupons de desconto, com validade, limite de uso e curso específico |
| **Minha conta** | Nome, foto, e-mail e preferências de comunicação |

**Poder exclusivo do dono:** alterar a comissão cobrada de cada chef. Um administrador
comum não consegue. Toda alteração fica registrada — quem mudou, quando, de quanto para
quanto.

**Regras de negócio que o sistema aplica sozinho:**

- Comissão padrão da plataforma: **15%**
- Curso só vai ao ar depois de aprovação
- Professor só publica depois de candidatura aprovada
- Aula de curso já vendido não pode ser trocada nem removida sem autorização
- Reembolso de curso: **7 dias corridos** a partir da compra (Art. 49 do CDC)
- Reembolso aprovado **corta o acesso ao curso na hora** e estorna o repasse do professor

---

## 3. O que o **professor** pode fazer

Entra em `/professor`.

| Seção | O que se faz ali |
|---|---|
| **Dashboard** | Resumo dos cursos, alunos e faturamento |
| **Meus Cursos** | Criar curso, escrever descrição e preço, montar as aulas, subir vídeo e enviar para revisão |
| **Faturamento** | Quanto vendeu, quanto já recebeu, quanto está por receber |
| **Produtos** | Escolher quais produtos da loja aparecem em cada aula, e pedir o cadastro de um produto que ainda não existe no catálogo |
| **Conta Stripe** | Conectar a conta bancária para receber os repasses |

**Ponto importante de produto:** a conta do chef é **a mesma** conta de aluno. Ele compra
o curso de outro chef, assiste e acompanha os pedidos dele sem trocar de login — há um
atalho na barra lateral para atravessar entre as duas áreas.

**O que o professor não pode fazer sozinho:**

- Publicar curso sem revisão
- Trocar o vídeo ou apagar uma aula de curso que já tem aluno pagante — precisa pedir autorização
- Alterar a própria comissão
- Cadastrar produto direto na loja — ele sugere, a administração cadastra

---

## 4. O que o **aluno** pode fazer

Entra em `/aluno`. Navega pelo catálogo público sem login, mas precisa de conta para comprar.

- Comprar curso (com cupom de desconto, quando houver)
- Assistir às aulas, marcar aula como concluída e acompanhar o progresso
- Fazer anotações por curso (caderno)
- Comprar produtos físicos na loja, com cálculo de frete e acompanhamento de entrega
- Pedir reembolso de curso dentro do prazo, e devolução de produto
- Candidatar-se a professor
- Gerenciar a própria conta: nome, foto, e-mail, comunicação por e-mail e **exclusão da conta**

---

## 5. O que entrou nesta versão

### Correções que destravaram funcionalidade

**Currículo do curso visível para quem ainda não comprou.** Antes, quem chegava na página
de venda não conseguia ver a lista de aulas — a permissão do banco escondia tudo de quem
não era aluno. Isso significa que o visitante decidia a compra sem saber o que ia receber.
Agora o catálogo e a página do curso mostram título, duração e quantidade de aulas, sem
liberar o vídeo.

**Gráfico de receita mensal.** O gráfico do financeiro sumia da tela quando um mês não
tinha venda, e desaparecia por completo quando não havia venda nenhuma — sem dizer o
motivo. Agora o eixo dos 6 meses é fixo e, sem receita, a tela explica o que está
acontecendo.

**Aviso de e-mail já cadastrado.** Quem tentava criar conta com um e-mail que já existia
via a mensagem "Confirme seu e-mail" e ficava esperando para sempre uma mensagem que nunca
chegava. Agora o sistema avisa que a conta já existe e oferece as duas saídas: entrar ou
recuperar a senha.

### Ajustes de navegação

**Troca entre áreas ficou explícita.** O atalho que leva o chef da área de professor para a
área de aluno saiu do meio do menu e ganhou identidade própria, com o aviso "Mesma conta" —
antes ele parecia uma página vizinha, e clicar nele dava a impressão de ter trocado de
usuário.

**Área do dono deixou de fingir que ele é aluno.** O atalho "Área de aluno" foi removido da
barra da administração. Quem administra não tem biblioteca de cursos nem carrinho; o atalho
anunciava uma segunda identidade que não existe. Para conferir a loja como um visitante vê,
existe o link "Ver o site".

**Página de conta para a administração.** Antes, para trocar o próprio nome ou e-mail, quem
administra precisava atravessar para a área de aluno e chegava lá com o menu errado.

### Qualidade visual

Sistema de design consolidado: escala de tamanhos de texto, espaçamentos e cantos
arredondados passaram a sair de um lugar só, em vez de ficarem espalhados por dezenas de
telas com valores ligeiramente diferentes. Cartões de curso agora mostram tamanho do curso
(número de aulas e duração total).

---

## 6. Inventário: o que está construído

| Área | Situação |
|---|---|
| Cadastro, login, recuperação de senha | ✅ Funcionando |
| Papéis e permissões (dono, admin, professor, aluno) | ✅ Funcionando |
| Catálogo público, busca por título e categoria | ✅ Funcionando |
| Página de venda do curso com currículo visível | ✅ Funcionando |
| Player de vídeo com proteção de acesso | ✅ Funcionando |
| Progresso do aluno (marcação manual) | ✅ Funcionando |
| Caderno de anotações | ✅ Funcionando |
| Candidatura e aprovação de professor | ✅ Funcionando |
| Criação de curso e envio para revisão | ✅ Funcionando |
| Revisão e aprovação de curso pela administração | ✅ Funcionando |
| Autorização para alterar aula de curso vendido | ✅ Funcionando |
| Cupons de desconto | ✅ Funcionando |
| Loja de produtos físicos, frete e rastreio | ✅ Funcionando |
| Devolução de produto | ✅ Funcionando |
| Reembolso de curso com prazo de 7 dias | ✅ Funcionando |
| Comissão configurável por professor, com histórico | ✅ Funcionando |
| Painel financeiro da plataforma | ✅ Funcionando |
| Conta do aluno e exclusão de conta (LGPD) | ✅ Funcionando |
| Opt-in de comunicação por e-mail (LGPD) | ✅ Funcionando |
| Checkout com Stripe | ⚠️ Construído, **nunca testado de ponta a ponta** |
| Repasse ao professor via Stripe Connect | ⚠️ Construído, **nunca testado de ponta a ponta** |

---

## 7. O que falta

### Bloqueadores — impedem vender de verdade

**1. Configuração do Stripe no ambiente.** Duas variáveis não estão preenchidas na
hospedagem: a chave que valida os avisos de pagamento do Stripe e o endereço público da
aplicação. Sem a primeira, um pagamento aprovado **não libera o curso para o aluno**. Sem
a segunda, o cliente é devolvido para um endereço inválido depois de pagar.
*Esforço: configuração, não desenvolvimento.*

**2. Nenhum fluxo de pagamento foi exercitado contra este banco.** Compra de curso, compra
na loja e repasse ao chef estão escritos, mas nunca rodaram de verdade aqui. Todo dado
financeiro que você vê hoje na tela foi inserido manualmente para demonstração.
*Precisa de uma rodada de teste com cartão de teste do Stripe.*

**3. Nenhum e-mail transacional.** Não há provedor de e-mail configurado. O professor não
é avisado quando o curso é aprovado, o aluno não recebe confirmação de compra, e ninguém é
avisado quando um pedido é despachado. Os únicos e-mails que saem hoje são os de
confirmação de cadastro e recuperação de senha, enviados pela infraestrutura de login.

### Correções conhecidas, ainda abertas

| Item | Impacto |
|---|---|
| Estoque não é reservado quando o cliente vai para o pagamento | Dois clientes podem comprar a última unidade ao mesmo tempo |
| Receita da plataforma não soma a loja | O número do painel financeiro fica menor do que a realidade |
| "Total de alunos" do professor conta matrículas, não pessoas | Um aluno em 2 cursos aparece como 2 alunos |
| Telas de pedidos e professores sem paginação | Vai ficar lento quando a base crescer |
| Não há testes automatizados no projeto | Toda regressão só aparece em teste manual |

### Funcionalidades não construídas

Itens que nunca entraram no escopo desta versão. **Decisão do PO se entram na próxima.**

| Funcionalidade | Situação hoje |
|---|---|
| Avaliação e nota do curso pelo aluno | Não existe |
| Certificado de conclusão | Não existe |
| Retomar o vídeo de onde parou | O banco guarda o dado, o player não usa |
| Marcar aula como vista automaticamente ao terminar o vídeo | Só o botão manual conta |
| Materiais em PDF anexos à aula | Banco e permissões prontos, falta a tela |
| Perguntas do aluno para o professor | Não existe |
| Assinatura mensal com acesso a tudo | Só venda avulsa |
| Busca por nome do chef | Busca só por título e categoria |
| Lista de alunos no painel do professor | Só a contagem |

---

## 8. Recomendação de prioridade

1. **Configurar as duas variáveis do Stripe** — é o que separa "demonstração" de "loja funcionando"
2. **Rodar uma compra de teste de ponta a ponta** — curso e produto, com cartão de teste
3. **Contratar e ligar um provedor de e-mail** — sem isso, o professor não sabe que foi aprovado e o aluno não tem comprovante
4. **Corrigir a receita da plataforma para incluir a loja** — número errado em tela de decisão é pior que número ausente
5. **Decidir os itens da seção 7.3** — o que entra na próxima versão

---

*Documento gerado a partir do código em produção de homologação, commit da branch `main`.*

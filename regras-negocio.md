# Chefio — Decisões de regra de negócio

*Documento para o Dono do Produto. Cada pergunta é uma decisão que o código precisa tomar de um jeito ou de outro. Onde a decisão ainda não tinha sido tomada, o sistema hoje já estava fazendo alguma coisa — nem sempre a certa, só a que sobrou.*

**Legenda:**
- 🔴 **Bloqueador** — Exigência legal, ou o sistema hoje não tem resposta e vai quebrar na mão de um usuário real.
- 🟡 **Importante** — Funciona hoje, mas está decidido por acidente e não por escolha.
- ⚪ **Confirmação** — Provavelmente já está certo, só precisa de um "sim".

> ✅ = resposta marcada no documento. Itens sem marcação (ainda em aberto) estão sinalizados com **⚠️ PENDENTE**.

---

## Bloqueadores originais (lista rápida)

| # | Pergunta | Por quê |
|---|---|---|
| 2.1 | Existe reembolso? | Arrependimento de 7 dias é lei (CDC art. 49) |
| 2.4 | Quem paga o chargeback? | Plataforma repassa e não tem como reaver |
| 8.1 | Onde o produto físico é entregue? | Não existe campo de endereço no banco |
| 8.2 | Quem paga o frete? | Não existe campo de frete; total = só produtos |
| 7.3 | Como o aluno recupera a senha? | Não há tela de "esqueci minha senha" |
| 9.1 | Quem escreve Termos e Privacidade? | Exigido por lei; rodapé é texto morto |
| 9.3 | Como o usuário apaga a conta? | Direito de exclusão pela LGPD; não existe |
| 11.1 | Os números da home são reais? | Fixos no código; se inventados, é enganoso (CDC art. 37) |
| 5.2 | Prof. sem Stripe publica curso pago? | Hoje pode — vende sem ter como receber |

---

## 1. Comissão e repasse

**⚪ 1.1 — A comissão da plataforma é 20% sobre cada venda de curso?**
*Hoje: 20% é o padrão, gravado por professor; o texto em /para-chefs promete "você fica com 80%".*
✅ **Outro valor: 15%–17,5%**

**🟡 1.2 — Quem pode alterar a comissão de um professor?**
*Hoje: qualquer admin altera pelo painel, na hora, sem registro de quem mudou nem por quê.*
✅ **Só um perfil específico (dono/financeiro)**

**🟡 1.3 — Alterar a comissão afeta vendas que já aconteceram?**
*Hoje: não. A taxa é lida no instante da compra; venda antiga fica com a taxa antiga.*
✅ **Não, só vale para vendas futuras (é o que o sistema faz hoje)**

**🔴 1.4 — Quando o professor recebe o dinheiro?**
*Hoje: há duas respostas contraditórias — o checkout faz split automático via Stripe (recebe no ato), mas existe uma tabela `teacher_payouts` que sugere pagamento em lote e alimenta um "histórico de repasses" na tela. As duas não podem ser verdade.*
✅ **Outro: o valor a ser recebido é refletido na hora, mas ele escolhe um dia fixo para receber (só pode alterar a cada 60 dias)**

**🟡 1.5 — Curso grátis: o professor ganha alguma coisa?**
*Hoje: curso com preço 0 matricula direto, sem passar pelo Stripe. Ninguém recebe; matrícula fica com valor R$ 0,00.*
✅ **Nada mesmo, é isca para o catálogo (é o que o sistema faz hoje)**

**🔴 1.6 — Quem emite a nota fiscal da venda de um curso?**
*Hoje: ninguém. Não existe emissão de NF em lugar nenhum do sistema.*
✅ **Ainda não sei / vou consultar contador** ⚠️ *(resposta provisória — não é uma decisão final)*

**⚪ 1.7 — Só vendemos em real (BRL)?**
✅ **Sim (é o que o sistema faz hoje)**

---

## 2. Compra, reembolso e cancelamento

**🔴 2.1 — O aluno pode pedir reembolso de um curso?**
*Hoje: não existe reembolso. Comprou, é definitivo — conflita com o direito de arrependimento de 7 dias do CDC.*
✅ **Sim, 7 dias corridos (mínimo legal)** — *discutir estratégias para mitigar reembolsos*
> Detalhamento de 19/08/2026: sai automático quando o aluno assistiu até 30% do curso; acima disso vira pedido na fila do admin (/admin/reembolsos).

**🔴 2.2 — Reembolsado o aluno, o que acontece com a parte que o professor já recebeu?**
*Hoje: com split automático, o dinheiro já saiu para a conta do professor. A plataforma teria que devolver do próprio bolso.*
✅ **A plataforma devolve e desconta do próximo repasse do professor**

**🟡 2.3 — O aluno perde o acesso ao curso quando é reembolsado?**
✅ **Na hora** *(decidido em 19/08/2026)*

**🔴 2.4 — Chargeback (aluno contesta no cartão): quem arca?**
*Hoje: não há tratamento nenhum. O acesso continua liberado e o dinheiro do professor já foi.*
✅ **Plataforma**

**🟡 2.5 — O aluno pode comprar o mesmo curso duas vezes?**
*Hoje: não. O banco impede matrícula duplicada.*
✅ **Não, uma matrícula por aluno (é o que o sistema faz hoje)**

**⚪ 2.6 — Existe cupom de desconto ou promoção?**
*Hoje: não existe.*
✅ **Sim, precisa entrar no escopo**
> Detalhamento de 19/08/2026: só admin/dono cria o cupom, e quem absorve o desconto é a plataforma (o professor recebe sobre o preço cheio). Por isso o desconto é limitado à comissão de 15% — acima disso a venda sairia com prejuízo.

---

## 3. Acesso ao curso

**🔴 3.1 — "Acesso vitalício" está na página de venda. É verdade para sempre?**
*Hoje: sim, sem prazo. Mas "vitalício" é uma promessa contratual difícil de desfazer depois.*
✅ **Sim, sem prazo (é o que o sistema faz e a página promete)**

**🔴 3.2 — O professor sai da plataforma. O aluno que pagou continua assistindo?**
*Hoje: sim, continua. O acesso do aluno não olha a situação do professor.*
✅ **Sim, continua para sempre (é o que o sistema faz hoje)**

**🟡 3.3 — O professor pode apagar um curso que já tem alunos matriculados?**
*Hoje: sim, e isso apaga junto as aulas, o progresso e o caderno de todos os alunos, sem aviso.*
✅ **Não pode. Só tirar do catálogo, e quem comprou continua vendo**
> Detalhamento de 19/08/2026: "tirar do catálogo" virou o botão *Tirar do catálogo* na tela do curso (`courses.archived_at`) — some da vitrine e para de vender. A exclusão passou a ser recusada pelo próprio banco quando existe matrícula ativa, inclusive por cascade (apagar a conta do professor também falha).

**🟡 3.4 — O professor pode remover ou trocar uma aula de um curso já vendido?**
*Hoje: sim, livremente. O aluno pode perder uma aula que já tinha assistido.*
✅ **Só com aprovação do admin**
> Detalhamento de 19/08/2026: só o que faz o aluno perder algo depende de aval — apagar a aula e trocar o vídeo que já está no ar. Título, descrição, ordem, anexos e aula nova continuam livres. Os pedidos caem em /admin/alteracoes.

**⚪ 3.5 — O aluno pode baixar os vídeos?**
*Hoje: não. Vídeo é sempre streaming com link assinado. Só o caderno vira PDF.*
✅ **Não (é o que o sistema faz hoje)**

**🟡 3.6 — Vamos limitar quantos dispositivos usam a mesma conta?**
*Hoje: não há limite. Uma conta pode ser usada por quantas pessoas quiserem, ao mesmo tempo.*
✅ **Limitar a 2 sessões simultâneas**
> Detalhamento de 19/08/2026: quando entra uma terceira, cai a sessão parada há mais tempo — quem está assistindo agora não é derrubado. O aparelho derrubado vê o aviso na tela de login.

---

## 4. Professores

**⚪ 4.1 — Todo professor precisa ser aprovado por um admin antes de publicar?**
*Hoje: sim. Quem se cadastra fica "pendente" e mantém acesso de aluno até um admin aprovar.*
✅ **Sim (é o que o sistema faz hoje)**

**🟡 4.2 — O que o admin olha para aprovar um professor?**
*Hoje: nada. A tela mostra só o nome e um botão "Ativar". Sem currículo, documento ou anotação.*
✅ **Precisa pedir: documento, portfólio, CNPJ, entrevista…**
> Detalhamento de 19/08/2026: virou uma candidatura em /aluno/candidatura — CPF ou CNPJ, telefone, portfólio, resumo da experiência e aceite da exclusividade. O painel mostra tudo isso ao lado do botão, e o banco recusa aprovar quem não enviou. Recusar exige motivo, que o candidato lê e pode corrigir para reenviar.

**🔴 4.3 — Uma mesma pessoa pode ser aluna e professora ao mesmo tempo?**
*Hoje: não. Cada conta tem um papel só. Um chef que queira comprar o curso de outro precisa de um segundo e-mail.*
✅ **Sim, precisa ser possível — professor também compra curso**
> Detalhamento de 19/08/2026: a conta é uma só. A área do aluno passou a ser de qualquer pessoa logada, e as duas barras laterais têm o atalho para o outro lado. Comprar o próprio curso é bloqueado no checkout.

**🟡 4.4 — Professor suspenso: o que acontece com os cursos dele à venda?**
*Hoje: nada. Os cursos continuam no catálogo e continuam vendendo normalmente.*
✅ **Saem do catálogo na hora, e quem já comprou continua assistindo**
> Detalhamento de 19/08/2026: o corte é na RLS do catálogo, não numa query — suspender esconde os cursos da vitrine, da busca, da home e do checkout no mesmo instante. A leitura de quem tem matrícula (3.1) não olha o professor, então a biblioteca de quem pagou não muda.

**⚪ 4.5 — O professor pode vender o mesmo curso em outra plataforma?**
*Hoje: nada impede.*
✅ **Exclusividade obrigatória**
> Detalhamento de 19/08/2026: aceite datado na candidatura (`exclusivity_accepted_at`) e declarado nas dúvidas da página /para-chefs. A fiscalização é contratual — nenhum sistema detecta o mesmo curso em outra plataforma.

**⚪ 4.6 — Um curso pode ter mais de um professor?**
*Hoje: não. Um curso pertence a um único professor, e o repasse vai todo para ele.*
✅ **Não (é o que o sistema faz hoje)**

---

## 5. Revisão e publicação de curso

**🔴 5.1 — Ao rejeitar um curso, o admin precisa escrever o motivo?**
*Hoje: o campo existe no banco (`rejection_reason`) mas nenhuma tela escreve ou mostra. O professor recebe "Corrija os problemas indicados" — sem nenhum problema indicado.*
✅ **Sim, motivo obrigatório e visível para o professor**
> Detalhamento de 19/08/2026: rejeitar abre um campo de motivo, e o banco recusa a rejeição sem texto (trigger `guard_course_status_change`). O professor lê o motivo no aviso vermelho da tela do curso, no lugar do antigo "corrija os problemas indicados". Junto foi corrigido um bug: o curso rejeitado não conseguia voltar para a fila — a trigger só aceitava `draft -> pending_review`, então o botão "Enviar para revisão" dava erro.

**🔴 5.2 — Professor sem conta Stripe conectada pode publicar curso pago?**
*Hoje: pode. O sistema avisa que falta configurar, mas não impede o envio nem a aprovação. O curso entra à venda sem ter como receber.*
✅ **Pode, e a plataforma segura o dinheiro até ele conectar**
> Detalhamento de 19/08/2026: já era o comportamento real — sem `stripe_account_id` o checkout não faz split e o valor inteiro entra na plataforma, com o `teacher_payouts` gravado como pendente. O que mudou foi o texto: as telas diziam que sem Stripe não dava para publicar nem vender. Agora o faturamento mostra quanto está retido esperando a conexão.

**🔴 5.3 — Editar um curso já aprovado devolve ele para revisão?**
*Hoje: não. O professor pode aprovar um curso e depois trocar título, preço, descrição e todas as aulas, sem passar por revisão de novo.*
✅ **Não, confiamos no professor após a 1ª aprovação**
> Detalhamento de 19/08/2026: já era assim e continua. A exceção é a decisão 3.4 — em curso já vendido, remover aula ou trocar vídeo passa pelo admin. Editar título, preço e descrição não.

**🟡 5.4 — O professor pode mudar o preço de um curso que já vendeu?**
*Hoje: pode, livremente e a qualquer momento.*
✅ **Pode (é o que o sistema faz hoje)**

**🟡 5.5 — Qual o prazo para revisar um curso enviado?**
*Hoje: não há prazo nem fila priorizada. O professor não vê nenhuma previsão.*
✅ **2 dias úteis (vamos mostrar isso ao professor)**
> Detalhamento de 19/08/2026: `PRAZO_REVISAO_DIAS_UTEIS` em `lib/utils.ts`, com a data de envio gravada em `courses.submitted_at`. O professor vê o prazo no aviso de envio, na tela do curso (com a data exata da resposta), no painel e nas dúvidas de /para-chefs. Na lista do admin, o curso que passou do prazo aparece em vermelho. Feriado não entra na conta de dias úteis.

**⚪ 5.6 — Existe preço mínimo ou máximo para um curso?**
*Hoje: qualquer valor a partir de zero.*
✅ **Sem limites (é o que o sistema faz hoje)**

---

## 6. Conteúdo

**🔴 6.1 — De quem é o conteúdo do curso?**
*Hoje: não há nenhum termo definindo isso.*
✅ **Do professor, com licença permanente aos alunos que já compraram**
> Detalhamento de 19/08/2026: escrito na nova página /politica-de-conteudo — o curso continua do professor, a Chefio recebe licença de hospedagem e exibição, e essa licença é permanente para quem já comprou. É a mesma promessa que o aluno já lia como "acesso vitalício" na página do curso (3.1), agora com o lado do professor por escrito.

**🟡 6.2 — A plataforma pode usar trechos das aulas em anúncio e rede social?**
✅ **Sim, avisando**
> Detalhamento de 19/08/2026: o aviso está na candidatura, ao lado do aceite de exclusividade, e nas dúvidas de /para-chefs — chega antes de existir conteúdo para divulgar. A política diz o que pode ser usado (trecho curto, capa, nome, sempre creditado e só para divulgar o curso ou a plataforma) e promete avisar antes de a peça ir ao ar.

**🟡 6.3 — Existe limite de tamanho ou duração de vídeo por aula?**
*Hoje: nenhum. A hospedagem é paga por armazenamento e banda — um professor pode gerar custo alto sem ninguém perceber.*
✅ **Sem limite (é o que o sistema faz hoje)**
> Detalhamento de 19/08/2026: confirmado — não há limite de tamanho, duração ou quantidade de aulas em nenhum ponto do upload. Declarado na política para o professor não ficar adivinhando. O custo de armazenamento e banda segue sem teto e sem alerta: se virar problema, vira decisão nova.

**🟡 6.4 — Que conteúdo é proibido?**
*Hoje: não há política escrita. O admin decide caso a caso na revisão.*
✅ **Vamos escrever uma política de conteúdo**
> Detalhamento de 19/08/2026: escrita e publicada em /politica-de-conteudo, com sete categorias do que não pode (conteúdo de terceiros, prática ilegal na cozinha, risco à saúde como técnica, ódio, sexual/violência gratuita, curso que não é curso, dado de outra pessoa) e a parte de como aplicamos. Linkada no rodapé, nas dúvidas de /para-chefs e na tela do curso, onde o envio para revisão é a declaração de que o conteúdo segue a política. **Falta revisão jurídica** — o texto é a regra de produto, não parecer de advogado.

**⚪ 6.5 — A plataforma é só em português, para o Brasil?**
✅ **Sim (é o que o sistema faz hoje)**

---

## 7. Conta do aluno

**⚪ 7.1 — É obrigatório confirmar o e-mail antes de entrar?**
*Hoje: sim. Sem clicar no link do e-mail, o login não funciona.*
✅ **Sim (é o que o sistema faz hoje)**

**🟡 7.2 — Existe idade mínima para comprar?**
*Hoje: não perguntamos idade em lugar nenhum.*
✅ **Sem restrição (é o que o sistema faz hoje)**

**🔴 7.3 — Como o aluno recupera a senha?**
*Hoje: não existe. Não há tela de "esqueci minha senha". Quem esquece perde a conta e tudo que comprou.*
✅ **Por e-mail, com link de redefinição (padrão)**
> Detalhamento de 19/08/2026: implementado em /esqueci-senha e /redefinir-senha, com o link colado no campo de senha do login. A tela de envio nunca diz se o e-mail existe — isso a transformaria num verificador de quem tem conta aqui. Corrigido junto um bug do /api/auth/callback, que ignorava o parâmetro `next` e mandava todo mundo pro dashboard do papel: sem isso o link de redefinição caía em /aluno com a senha antiga intacta.

**🟡 7.4 — O aluno pode trocar o e-mail da conta dele?**
*Hoje: não existe tela de perfil. Nem e-mail, nem nome, nem foto.*
✅ **Sim, precisa de tela de perfil**
> Detalhamento de 19/08/2026: criada em /aluno/perfil — nome, foto, e-mail, senha e a preferência de marketing. Trocar o e-mail exige confirmar pelo endereço novo (é o que impede alguém com a sessão aberta de tomar a conta), e até o clique o login continua sendo pelo antigo. O banco já permitia tudo isso: a policy `profiles_self_update` existe desde a 00002 e o guard da 00007 continua barrando mudança de papel.

**⚪ 7.5 — Podemos mandar e-mail de marketing para os alunos?**
*Hoje: só e-mail transacional (confirmação de cadastro).*
✅ **Sim, com opção de descadastro**
> Detalhamento de 19/08/2026: coluna `marketing_opt_in` em profiles (migration 00020), ligada por padrão, com carimbo da data em que a pessoa desmarcou — sem data, um descadastro contestado é palavra contra palavra. O aviso está no cadastro e o botão de sair está em /aluno/perfil. **Ainda não existe disparo de e-mail de marketing**: o que foi implementado é a preferência que qualquer ferramenta futura tem que respeitar.

---

## 8. Loja de produtos físicos

*Esta é a área com mais buracos. A loja vende, cobra e registra o pedido — mas o banco não tem onde guardar para onde o produto vai.*

**🔴 8.1 — Para onde o produto é enviado?**
*Hoje: a tabela de pedidos não tem campo de endereço. O aluno compra, o dinheiro entra, o admin vê o pedido — e não existe endereço nenhum.*
✅ **Endereço coletado pelo próprio Stripe no checkout**
> Detalhamento de 19/08/2026: `shipping_address_collection` ligado no checkout e o endereço gravado em colunas próprias de `orders` (migration 00021), visível pro aluno e pro admin. Mudança estrutural junto: o pedido passa a nascer em 'pending' ANTES do checkout, em vez de ser remontado no webhook a partir de um resumo na metadata do Stripe — aquele resumo estourava o teto de 500 caracteres com ~12 produtos e não tinha onde caber endereço, frete nem a aula de origem. Pedido sem endereço aparece em vermelho na tela do admin com "não despache".

**🔴 8.2 — Quem paga o frete e quanto custa?**
*Hoje: não existe frete. O total cobrado é a soma dos produtos e nada mais.*
✅ **Calculado por CEP (exige integração com Correios/transportadora)**
> Detalhamento de 19/08/2026: o aluno digita o CEP no carrinho e vê valor e prazo antes de ir pro checkout; a cotação é congelada no pedido, porque recotizar depois mudaria o total de uma compra já paga. **A integração com os Correios não existe ainda** — os valores saem de uma tabela por faixa de CEP em lib/frete.ts, no mesmo formato que a API devolve (`{ valor, dias }`), então trocar a fonte é trocar o corpo de uma função. **Limitação conhecida:** o Stripe não recalcula frete pelo endereço digitado lá, então se o CEP da cotação e o da entrega divergirem o valor cobrado não corresponde ao destino — o admin vê um aviso âmbar nesse caso, antes de despachar.

**🔴 8.3 — Quem separa e despacha o pedido?**
*Hoje: um admin muda o status na mão de "pago" para "enviado" e depois "entregue". Não há código de rastreio.*
✅ **Fornecedor terceirizado**
⚠️ **PENDENTE** — "Precisa de campo de código de rastreio?" (Sim/Não) não foi marcado
> Detalhamento de 19/08/2026: implementado como **sim**, e obrigatório. Com despacho terceirizado o código é a única coisa que o aluno tem pra saber onde a encomenda está, então marcar como "Enviado" sem ele seria informar nada. O banco recusa a mudança de status sem o código (mesmo padrão do motivo obrigatório na rejeição de curso, 5.1) e o admin é perguntado antes. Se a decisão for "não", é só remover a exigência no trigger `guard_order_status_change` — mas aí "Enviado" volta a ser uma palavra sem informação.

**🟡 8.4 — O professor ganha comissão sobre os produtos vendidos na aula dele?**
*Hoje: não. Os produtos são cadastrados pelo admin, aparecem dentro da aula do professor, e 100% da venda fica com a plataforma.*
✅ **Ganha uma porcentagem a ser definida se o produto for vendido pela página da aula dele; se comprado na aba "Produtos", a comissão é da plataforma**
> Detalhamento de 19/08/2026: o carrinho passou a guardar de onde cada item foi adicionado — o mesmo produto ocupa duas linhas se veio da aula e da aba Loja, porque a origem é o que decide a comissão. O repasse entra em `teacher_payouts` como `product_sale` e aparece no faturamento do professor em bloco separado (comissão de produto não é receita de curso e não pode inflar a "receita bruta"). **A porcentagem não foi decidida no questionário** — está em 10% provisórios, em `COMISSAO_PRODUTO_PROFESSOR` e na função `comissao_produto_professor()`. O valor é gravado por item no pedido, então mudar o número não reescreve o que já foi vendido.

**🟡 8.5 — O professor pode cadastrar produtos dele?**
*Hoje: não. Só o admin cadastra produtos.*
✅ **O professor pode selecionar produtos já disponíveis ou solicitar que um produto externo seja cadastrado**
> Detalhamento de 19/08/2026: nova tela /professor/produtos com as duas metades — vincular produtos do catálogo a cada aula (a policy do banco já permitia isso desde a 00002; o que não existia era tela, então na prática só o admin montava a prateleira de uma aula) e pedir o cadastro de um produto externo, na tabela `product_requests`. A fila chega em /admin/produtos, onde "Cadastrar" abre o formulário já preenchido e baixa o pedido no mesmo salvamento; recusar exige motivo escrito, que o professor lê.

**🔴 8.6 — Troca e devolução de produto físico?**
*Hoje: não existe. Mesmo problema legal do item 2.1 — o CDC dá 7 dias.*
✅ **7 dias (mínimo legal)**
> Detalhamento de 19/08/2026: o prazo conta **do recebimento**, não da compra — enquanto o pedido não foi marcado como entregue, a janela nem começou e o aluno pode pedir a qualquer momento. Botão em /aluno/pedidos, fila no topo de /admin/pedidos. Diferente do reembolso de curso (2.1), nada é automático: o produto físico precisa voltar antes de o dinheiro sair. Aprovar estorna o valor **com frete** e lança o clawback da comissão do professor; recusar exige motivo escrito. **Falta definir quem paga o frete da devolução** e como a coleta é combinada na prática — hoje é conversa fora do sistema.

**⚪ 8.7 — Entregamos em todo o Brasil?**
✅ **Sim**
> Detalhamento de 19/08/2026: o checkout só aceita endereço no Brasil (`allowed_countries: ['BR']`) e a tabela de frete cobre as nove faixas de CEP — nenhuma combinação devolve "não atendemos aí".

---

## 9. Jurídico e LGPD

**🔴 9.1 — Quem escreve os Termos de Uso e a Política de Privacidade?**
*Hoje: o rodapé lista "Termos de uso", "Privacidade" e "Central de ajuda" como texto morto — nem são links, porque as páginas não existem.*
✅ **Ainda não resolvido** ⚠️ *(sem decisão final)*
> Detalhamento de 19/08/2026: nada foi escrito, de propósito. Publicar um documento legal com o controlador em branco (9.2) seria pior que não ter. O rodapé continua com os três itens como texto morto — é feio e é honesto. **Este é o item que trava mais coisa:** a política de conteúdo (6.4) já publicada precisa de revisão jurídica junto, o banner de cookies não tem para onde apontar e a tela de exclusão de conta explica o tratamento de dados por conta própria, quando isso deveria estar na política de privacidade.

**🔴 9.2 — Quem é o responsável pelos dados (controlador) perante a LGPD?**
✅ CNPJ / razão social: **[em branco — preencher]**
Contato do encarregado (DPO): **[em branco — preencher]**
> Detalhamento de 19/08/2026: continua em branco e nada foi inventado. O nome do controlador e o contato do encarregado são obrigatórios na política de privacidade e no canal de atendimento ao titular — sem eles, o mecanismo de exclusão da 9.3 existe mas a plataforma não tem endereço para responder a quem pergunta o que foi feito com os dados dele.

**🔴 9.3 — Como o usuário apaga a conta e os dados dele?**
*Hoje: não existe. É um direito garantido pela LGPD.*
✅ **Botão de excluir conta, apaga tudo na hora (pede confirmação antes)**
> Detalhamento de 19/08/2026: implementado no fim de /aluno/perfil — sair tem que ser tão fácil de achar quanto entrar. A confirmação é digitada ("EXCLUIR"), não um `confirm()`: é a única ação do sistema sem desfazer. Somem na hora anotações, progresso, sessões, documentos, foto e a candidatura de professor (documento, telefone, portfólio), e o usuário é apagado do Auth. **Duas travas:** reembolso ou devolução em análise bloqueiam a exclusão, porque os dois processos ainda precisam de alguém para receber o dinheiro de volta. **Professor com curso publicado:** o curso sai do catálogo e para de vender, mas quem já comprou continua assistindo — é a promessa de acesso vitalício (3.1) e a licença permanente da 6.1. Repasses já lançados continuam devidos e são acertados fora da plataforma; **isso ainda não tem processo definido.**

**🟡 9.4 — Se o aluno apagar a conta, o que acontece com o histórico de compra?**
*Hoje: dado fiscal costuma ter obrigação de guarda de 5 anos, mesmo com pedido de exclusão.*
✅ **Anonimizar o cadastro e guardar a nota**
> Detalhamento de 19/08/2026: matrícula, pedido, item e repasse ficam; o cadastro vira um toco chamado "Conta removida", sem foto e sem contato. Isso exigiu uma mudança de schema (migration 00022): `profiles` referenciava `auth.users` com ON DELETE CASCADE, então apagar o usuário levaria junto o toco e, em cascata, todo o histórico fiscal — exatamente o oposto desta decisão. A referência foi removida. **Efeito colateral a saber:** apagar um usuário direto pelo painel do Supabase agora deixa o perfil órfão em vez de limpar tudo — a exclusão correta é pela tela, que chama as duas metades na ordem certa.

**🟡 9.5 — Precisamos de banner de consentimento de cookies?**
*Hoje: não existe. Se entrar Google Analytics, Meta Pixel ou similar, passa a ser necessário.*
✅ **Sim, vamos usar ferramenta de análise/anúncio**
> Detalhamento de 19/08/2026: banner implementado, com "Aceitar medição" e "Só o essencial" no mesmo peso visual — destacar o aceite e apagar a recusa é o padrão escuro que a ANPD reclama. A escolha fica em localStorage e não em cookie (guardar recusa de cookie num cookie aparece mal em auditoria) e é retirável pelo item **Cookies** no rodapé. O que a decisão de fato entrega é o portão: `ScriptsDeMedicao` é onde GA, Pixel e afins entram quando existirem, nunca direto no layout. **Nenhuma dessas ferramentas está instalada ainda** — o contador da Vercel fica fora do portão porque não usa cookie nem identifica ninguém. O banner não linka política de privacidade porque ela não existe (9.1).

---

## 10. Operação e suporte

**🔴 10.1 — Qual o canal de suporte, e para qual e-mail?**
*Hoje: não há nenhum contato em lugar nenhum do site.*
⚠️ **PENDENTE** — E-mail/canal: **"ainda não definido"**

**🟡 10.2 — Quem opera o dia a dia (aprovar professor, revisar curso, despachar pedido)?**
*Hoje: tudo cai no mesmo perfil de admin, sem separação.*
✅ **Precisa separar perfis** *(detalhe não preenchido)*

**⚪ 10.3 — Quantos admins vão existir?**
*Hoje: admin é criado direto no banco, na mão. Não há tela para promover alguém.*
✅ **Vários, e precisamos de tela para gerenciar**

---

## 11. Comunicação e marketing

**🔴 11.1 — Os números da página inicial são reais?**
*Hoje: o site anuncia, fixo no código: "500+ aulas", "50+ chefs", "10k+ alunos formados". Se não corresponderem à realidade no lançamento, é publicidade enganosa (CDC art. 37).*
✅ **São reais / serão até o lançamento**

**🟡 11.2 — "Alunos formados" sugere certificado. Existe?**
*Hoje: não há certificado nenhum no sistema.*
✅ **Precisa existir certificado ao concluir o curso**

**⚪ 11.3 — A promessa "receba por matrícula, sem mensalidade e sem taxa para publicar" está correta?**
✅ **Sim (é o que o sistema faz hoje)**

---

## 12. Coisas que não existem hoje

*Nenhum destes está construído. Marcado o que entra agora (✅ Sim) e o que pode esperar (⏳ Depois).*

| Item | Situação hoje | Decisão |
|---|---|---|
| Avaliação/nota do curso pelo aluno | Não existe | ✅ Sim |
| Certificado de conclusão | Não existe | ⏳ Depois |
| Cupom de desconto | Não existe | ✅ Sim |
| Retomar o vídeo de onde parou | Campo existe, o player não usa | ✅ Sim |
| Marcar aula como vista ao terminar | Só o botão manual conta | ✅ Sim |
| Perguntas do aluno para o professor | Não existe | ✅ Sim |
| Assinatura mensal (acesso a tudo) | Só venda avulsa | ⏳ Depois |
| Tela de perfil do aluno | Não existe | ✅ Sim |
| Documentos/materiais em PDF na aula | Banco e permissões prontos, sem tela | ✅ Sim |
| Busca por chef | Só por título e categoria | ✅ Sim |
| E-mail avisando aprovação do curso | Não existe | ✅ Sim |
| Painel do professor com lista de alunos | Só a contagem | ⏳ Depois |

---

## Espaço livre

*(Sem anotações adicionais no documento original.)*

---

## Resumo — itens ainda pendentes de decisão

- **2.3** — O aluno perde o acesso ao curso quando é reembolsado? (nenhuma opção marcada)
- **8.3** (sub-item) — Precisa de campo de código de rastreio? (Sim/Não não marcado)
- **9.2** — CNPJ/razão social e contato do DPO (campos em branco)
- **10.1** — Canal/e-mail de suporte ("ainda não definido")
- **1.6** e **9.1** — respostas marcadas como provisórias ("ainda não sei" / "ainda não resolvido"), recomendável validar com contador/advogado
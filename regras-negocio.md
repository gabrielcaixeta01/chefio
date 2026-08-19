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

**🔴 5.2 — Professor sem conta Stripe conectada pode publicar curso pago?**
*Hoje: pode. O sistema avisa que falta configurar, mas não impede o envio nem a aprovação. O curso entra à venda sem ter como receber.*
✅ **Pode, e a plataforma segura o dinheiro até ele conectar**

**🔴 5.3 — Editar um curso já aprovado devolve ele para revisão?**
*Hoje: não. O professor pode aprovar um curso e depois trocar título, preço, descrição e todas as aulas, sem passar por revisão de novo.*
✅ **Não, confiamos no professor após a 1ª aprovação**

**🟡 5.4 — O professor pode mudar o preço de um curso que já vendeu?**
*Hoje: pode, livremente e a qualquer momento.*
✅ **Pode (é o que o sistema faz hoje)**

**🟡 5.5 — Qual o prazo para revisar um curso enviado?**
*Hoje: não há prazo nem fila priorizada. O professor não vê nenhuma previsão.*
✅ **2 dias úteis (vamos mostrar isso ao professor)**

**⚪ 5.6 — Existe preço mínimo ou máximo para um curso?**
*Hoje: qualquer valor a partir de zero.*
✅ **Sem limites (é o que o sistema faz hoje)**

---

## 6. Conteúdo

**🔴 6.1 — De quem é o conteúdo do curso?**
*Hoje: não há nenhum termo definindo isso.*
✅ **Do professor, com licença permanente aos alunos que já compraram**

**🟡 6.2 — A plataforma pode usar trechos das aulas em anúncio e rede social?**
✅ **Sim, avisando**

**🟡 6.3 — Existe limite de tamanho ou duração de vídeo por aula?**
*Hoje: nenhum. A hospedagem é paga por armazenamento e banda — um professor pode gerar custo alto sem ninguém perceber.*
✅ **Sem limite (é o que o sistema faz hoje)**

**🟡 6.4 — Que conteúdo é proibido?**
*Hoje: não há política escrita. O admin decide caso a caso na revisão.*
✅ **Vamos escrever uma política de conteúdo**

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

**🟡 7.4 — O aluno pode trocar o e-mail da conta dele?**
*Hoje: não existe tela de perfil. Nem e-mail, nem nome, nem foto.*
✅ **Sim, precisa de tela de perfil**

**⚪ 7.5 — Podemos mandar e-mail de marketing para os alunos?**
*Hoje: só e-mail transacional (confirmação de cadastro).*
✅ **Sim, com opção de descadastro**

---

## 8. Loja de produtos físicos

*Esta é a área com mais buracos. A loja vende, cobra e registra o pedido — mas o banco não tem onde guardar para onde o produto vai.*

**🔴 8.1 — Para onde o produto é enviado?**
*Hoje: a tabela de pedidos não tem campo de endereço. O aluno compra, o dinheiro entra, o admin vê o pedido — e não existe endereço nenhum.*
✅ **Endereço coletado pelo próprio Stripe no checkout**

**🔴 8.2 — Quem paga o frete e quanto custa?**
*Hoje: não existe frete. O total cobrado é a soma dos produtos e nada mais.*
✅ **Calculado por CEP (exige integração com Correios/transportadora)**

**🔴 8.3 — Quem separa e despacha o pedido?**
*Hoje: um admin muda o status na mão de "pago" para "enviado" e depois "entregue". Não há código de rastreio.*
✅ **Fornecedor terceirizado**
⚠️ **PENDENTE** — "Precisa de campo de código de rastreio?" (Sim/Não) não foi marcado

**🟡 8.4 — O professor ganha comissão sobre os produtos vendidos na aula dele?**
*Hoje: não. Os produtos são cadastrados pelo admin, aparecem dentro da aula do professor, e 100% da venda fica com a plataforma.*
✅ **Ganha uma porcentagem a ser definida se o produto for vendido pela página da aula dele; se comprado na aba "Produtos", a comissão é da plataforma**

**🟡 8.5 — O professor pode cadastrar produtos dele?**
*Hoje: não. Só o admin cadastra produtos.*
✅ **O professor pode selecionar produtos já disponíveis ou solicitar que um produto externo seja cadastrado**

**🔴 8.6 — Troca e devolução de produto físico?**
*Hoje: não existe. Mesmo problema legal do item 2.1 — o CDC dá 7 dias.*
✅ **7 dias (mínimo legal)**

**⚪ 8.7 — Entregamos em todo o Brasil?**
✅ **Sim**

---

## 9. Jurídico e LGPD

**🔴 9.1 — Quem escreve os Termos de Uso e a Política de Privacidade?**
*Hoje: o rodapé lista "Termos de uso", "Privacidade" e "Central de ajuda" como texto morto — nem são links, porque as páginas não existem.*
✅ **Ainda não resolvido** ⚠️ *(sem decisão final)*

**🔴 9.2 — Quem é o responsável pelos dados (controlador) perante a LGPD?**
✅ CNPJ / razão social: **[em branco — preencher]**
Contato do encarregado (DPO): **[em branco — preencher]**

**🔴 9.3 — Como o usuário apaga a conta e os dados dele?**
*Hoje: não existe. É um direito garantido pela LGPD.*
✅ **Botão de excluir conta, apaga tudo na hora (pede confirmação antes)**

**🟡 9.4 — Se o aluno apagar a conta, o que acontece com o histórico de compra?**
*Hoje: dado fiscal costuma ter obrigação de guarda de 5 anos, mesmo com pedido de exclusão.*
✅ **Anonimizar o cadastro e guardar a nota**

**🟡 9.5 — Precisamos de banner de consentimento de cookies?**
*Hoje: não existe. Se entrar Google Analytics, Meta Pixel ou similar, passa a ser necessário.*
✅ **Sim, vamos usar ferramenta de análise/anúncio**

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
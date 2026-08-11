# Chefio — Perguntas de regra de negócio

Documento para o **dono do produto** responder. Cada pergunta abaixo é uma decisão que o
código precisa tomar de um jeito ou de outro. Onde a decisão ainda não foi tomada, o
sistema hoje está fazendo *alguma coisa* — nem sempre a certa, só a que sobrou.

## Como responder

Marque uma opção por pergunta e use o campo 📝 para o que não couber. Onde houver
**"(é o que o sistema faz hoje)"**, é só confirmar se está certo — se estiver, não dá
trabalho nenhum.

| Marca | Significa |
|---|---|
| 🔴 | **Bloqueador.** Ou é exigência legal, ou o sistema hoje não tem resposta nenhuma e vai quebrar na mão de um usuário real. |
| 🟡 | Importante. Funciona hoje, mas está decidido por acidente e não por escolha. |
| ⚪ | Confirmação. Provavelmente já está certo, só precisa de um "sim". |

---

## Resumo: o que não pode entrar no ar sem resposta

Estes são os 🔴. Se o tempo for curto, responda só esta lista.

| # | Pergunta | Por quê |
|---|---|---|
| 2.1 | Existe reembolso? | Direito de arrependimento de 7 dias é lei (CDC art. 49) |
| 2.4 | Quem paga o chargeback? | Hoje a plataforma repassa o dinheiro e não tem como reaver |
| 8.1 | Onde o produto físico é entregue? | **Não existe campo de endereço no banco.** A loja vende e ninguém sabe pra onde mandar |
| 8.2 | Quem paga o frete? | Não existe campo de frete. O total cobrado é só a soma dos produtos |
| 7.3 | Como o aluno recupera a senha? | **Não existe tela de "esqueci minha senha".** Quem esquece, perde a conta |
| 9.1 | Quem escreve Termos de Uso e Privacidade? | Exigido por lei; hoje o rodapé lista os dois como texto morto |
| 9.3 | Como o usuário apaga a conta dele? | Direito de exclusão pela LGPD; não existe |
| 11.1 | Os números da home são reais? | "500+ aulas, 50+ chefs, 10k+ alunos" está fixo no código. Se for inventado, é publicidade enganosa |
| 5.2 | Professor sem conta Stripe pode publicar curso pago? | Hoje **pode** — e o curso entra à venda sem ter como receber |

---

## 1. Comissão e repasse

**1.1 ⚪ — A comissão da plataforma é 20% sobre cada venda de curso?**
Hoje: 20% é o padrão, gravado por professor, e o texto público em `/para-chefs` promete
"você fica com 80%".
- [ ] Sim, 20% para todo mundo
- [ ] Sim como padrão, mas negociável caso a caso
- [ ] Outro valor: ______
📝

**1.2 🟡 — Quem pode alterar a comissão de um professor?**
Hoje: qualquer admin altera pelo painel, na hora, sem registro de quem mudou nem por quê.
- [ ] Qualquer admin, como é hoje
- [ ] Só um perfil específico (dono/financeiro)
- [ ] Ninguém — a taxa é a mesma para todos e sai da tela
📝

**1.3 🟡 — Alterar a comissão afeta vendas que já aconteceram?**
Hoje: não. A taxa é lida no instante da compra; venda antiga fica com a taxa antiga.
- [ ] Não, só vale para vendas futuras (é o que o sistema faz hoje)
- [ ] Sim, precisa recalcular o que já foi vendido
📝

**1.4 🔴 — Quando o professor recebe o dinheiro?**
Hoje há **duas respostas contraditórias no sistema**: o checkout faz split automático via
Stripe (o professor recebe no ato da compra), mas existe uma tabela de repasses
(`teacher_payouts`) que sugere pagamento em lote, e a tela do professor mostra um
"histórico de repasses" que essa tabela alimentaria. As duas coisas não podem ser verdade.
- [ ] Split no ato da compra — e a tela de repasses vira extrato de vendas
- [ ] Pagamento em lote (quinzenal/mensal) — e o split automático sai
- [ ] Outro: ______
📝

**1.5 🟡 — Curso grátis: o professor ganha alguma coisa?**
Hoje: curso com preço 0 matricula o aluno direto, sem passar pelo Stripe. Ninguém recebe
nada, e a matrícula fica registrada com valor R$ 0,00.
- [ ] Nada mesmo, é isca para o catálogo (é o que o sistema faz hoje)
- [ ] Sim, a plataforma paga um valor fixo por matrícula
📝

**1.6 🔴 — Quem emite a nota fiscal da venda de um curso?**
Hoje: ninguém. Não existe emissão de NF em lugar nenhum do sistema.
- [ ] A plataforma, do valor cheio
- [ ] A plataforma da comissão, e o professor da parte dele
- [ ] O professor, do valor cheio
- [ ] Ainda não sei / vou consultar contador
📝

**1.7 ⚪ — Só vendemos em real (BRL)?**
- [ ] Sim (é o que o sistema faz hoje)
- [ ] Não, precisa de outras moedas
📝

---

## 2. Compra, reembolso e cancelamento

**2.1 🔴 — O aluno pode pedir reembolso de um curso?**
Hoje: **não existe reembolso nenhum** no sistema. Comprou, é definitivo. Isso conflita com
o direito de arrependimento de 7 dias do Código de Defesa do Consumidor para compras online.
- [ ] Sim, 7 dias corridos (mínimo legal)
- [ ] Sim, 7 dias, mas só se assistiu menos de X% do curso — X = ______
- [ ] Sim, prazo maior: ______ dias
- [ ] Não oferecemos (⚠️ risco jurídico — confirmar com advogado)
📝

**2.2 🔴 — Reembolsado o aluno, o que acontece com a parte que o professor já recebeu?**
Hoje: com split automático, o dinheiro já saiu para a conta do professor. A plataforma
teria que devolver do próprio bolso.
- [ ] A plataforma devolve e desconta do próximo repasse do professor
- [ ] A plataforma absorve o prejuízo
- [ ] Segurar o repasse por N dias antes de liberar — N = ______
📝

**2.3 🟡 — O aluno perde o acesso ao curso quando é reembolsado?**
- [ ] Sim, na hora
- [ ] Sim, ao fim do dia
- [ ] Não
📝

**2.4 🔴 — Chargeback (o aluno contesta a compra no cartão): quem arca?**
Hoje: não há tratamento nenhum. O acesso continua liberado e o dinheiro do professor já foi.
- [ ] Plataforma
- [ ] Professor
- [ ] Dividido na mesma proporção da comissão
📝

**2.5 🟡 — O aluno pode comprar o mesmo curso duas vezes?**
Hoje: não. O banco impede matrícula duplicada.
- [ ] Não, uma matrícula por aluno (é o que o sistema faz hoje)
- [ ] Sim, deve ser possível presentear alguém
📝

**2.6 ⚪ — Existe cupom de desconto ou promoção?**
Hoje: não existe.
- [ ] Não, e não vai existir por enquanto
- [ ] Sim, precisa entrar no escopo
📝

---

## 3. Acesso ao curso

**3.1 🔴 — "Acesso vitalício" está escrito na página de venda. Isso é verdade para sempre?**
Hoje: sim, sem prazo. Mas "vitalício" é uma promessa contratual difícil de desfazer depois.
- [ ] Sim, sem prazo (é o que o sistema faz hoje, e o que a página promete)
- [ ] Não, o acesso dura ______ meses — **e o texto da página precisa mudar**
📝

**3.2 🔴 — O professor sai da plataforma. O aluno que pagou continua assistindo?**
Hoje: sim, continua. O acesso do aluno não olha a situação do professor.
- [ ] Sim, continua para sempre (é o que o sistema faz hoje)
- [ ] Sim, por um prazo de carência: ______
- [ ] Não, perde o acesso (⚠️ conflita com "acesso vitalício")
📝

**3.3 🟡 — O professor pode apagar um curso que já tem alunos matriculados?**
Hoje: sim, e isso apaga junto as aulas, o progresso e o caderno de todos os alunos, sem aviso.
- [ ] Não pode. Só pode tirar do catálogo, e quem comprou continua vendo
- [ ] Pode, com aviso e reembolso automático
- [ ] Pode, como é hoje
📝

**3.4 🟡 — O professor pode remover ou trocar uma aula de um curso já vendido?**
Hoje: sim, livremente. O aluno pode perder uma aula que já tinha assistido.
- [ ] Pode adicionar, mas não remover
- [ ] Pode tudo, é conteúdo dele
- [ ] Só com aprovação do admin
📝

**3.5 ⚪ — O aluno pode baixar os vídeos?**
Hoje: não. Vídeo é sempre por streaming com link assinado. Só o caderno de anotações vira PDF.
- [ ] Não (é o que o sistema faz hoje)
- [ ] Sim
📝

**3.6 🟡 — Vamos limitar quantos dispositivos usam a mesma conta?**
Hoje: não há limite. Uma conta pode ser usada por quantas pessoas quiserem, ao mesmo tempo.
- [ ] Sem limite (é o que o sistema faz hoje)
- [ ] Limitar a ______ sessões simultâneas
📝

---

## 4. Professores

**4.1 ⚪ — Todo professor precisa ser aprovado por um admin antes de publicar?**
Hoje: sim. Quem se cadastra como professor fica "pendente" e continua com acesso de aluno
até um admin aprovar.
- [ ] Sim (é o que o sistema faz hoje)
- [ ] Não, entrada é livre
📝

**4.2 🟡 — O que o admin olha para aprovar um professor?**
Hoje: nada. A tela mostra só o nome e um botão "Ativar". Não há currículo, documento, nem
campo de anotação.
- [ ] Nada mesmo, é aprovação de confiança (é o que o sistema faz hoje)
- [ ] Precisa pedir: ______________________ (documento, portfólio, CNPJ, entrevista…)
📝

**4.3 🔴 — Uma mesma pessoa pode ser aluna e professora ao mesmo tempo?**
Hoje: **não.** Cada conta tem um papel só. Um chef que queira comprar o curso de outro chef
precisa de um segundo e-mail.
- [ ] Não, é aceitável (é o que o sistema faz hoje)
- [ ] Sim, precisa ser possível — professor também compra curso
📝

**4.4 🟡 — Professor suspenso: o que acontece com os cursos dele que estão à venda?**
Hoje: nada. Os cursos continuam no catálogo e continuam vendendo normalmente.
- [ ] Saem do catálogo na hora, e quem já comprou continua assistindo
- [ ] Continuam vendendo (é o que o sistema faz hoje)
📝

**4.5 ⚪ — O professor pode vender o mesmo curso em outra plataforma?**
Hoje: nada impede.
- [ ] Pode (é o que o sistema faz hoje)
- [ ] Exclusividade obrigatória
- [ ] Exclusividade por ______ meses
📝

**4.6 ⚪ — Um curso pode ter mais de um professor?**
Hoje: não. Um curso pertence a um único professor, e o repasse vai todo para ele.
- [ ] Não (é o que o sistema faz hoje)
- [ ] Sim, com divisão de receita entre eles
📝

---

## 5. Revisão e publicação de curso

**5.1 🔴 — Ao rejeitar um curso, o admin precisa escrever o motivo?**
Hoje: **o campo existe no banco (`rejection_reason`) mas nenhuma tela escreve nele nem
mostra.** O professor recebe "Corrija os problemas indicados pelo admin" — sem nenhum
problema indicado em lugar nenhum.
- [ ] Sim, motivo obrigatório e visível para o professor
- [ ] Sim, mas opcional
- [ ] Não precisa
📝

**5.2 🔴 — Professor sem conta Stripe conectada pode publicar curso pago?**
Hoje: **pode.** O sistema avisa que falta configurar, mas não impede o envio para revisão
nem a aprovação. O curso entra à venda e o professor não tem como receber.
- [ ] Não pode. Curso pago exige Stripe conectado antes de enviar para revisão
- [ ] Pode, e a plataforma segura o dinheiro até ele conectar
- [ ] Pode, como é hoje
📝

**5.3 🔴 — Editar um curso já aprovado devolve ele para revisão?**
Hoje: **não.** O professor pode aprovar um curso e depois trocar título, preço, descrição e
todas as aulas, sem passar por revisão de novo.
- [ ] Sim, qualquer edição volta para revisão
- [ ] Só edições de conteúdo (aulas/vídeos); título e preço são livres
- [ ] Não, confiamos no professor depois da primeira aprovação
📝

**5.4 🟡 — O professor pode mudar o preço de um curso que já vendeu?**
Hoje: pode, livremente e a qualquer momento.
- [ ] Pode (é o que o sistema faz hoje)
- [ ] Pode, com limite de ______% de aumento por vez
- [ ] Só com aprovação do admin
📝

**5.5 🟡 — Qual o prazo para revisar um curso enviado?**
Hoje: não há prazo nem fila priorizada. O professor não vê nenhuma previsão.
- [ ] ______ dias úteis (vamos mostrar isso para o professor)
- [ ] Sem prazo definido
📝

**5.6 ⚪ — Existe preço mínimo ou máximo para um curso?**
Hoje: qualquer valor a partir de zero.
- [ ] Sem limites (é o que o sistema faz hoje)
- [ ] Mínimo R$ ______ / Máximo R$ ______
📝

---

## 6. Conteúdo

**6.1 🔴 — De quem é o conteúdo do curso?**
Hoje: não há nenhum termo definindo isso.
- [ ] Do professor, e a plataforma tem licença para distribuir enquanto ele estiver conosco
- [ ] Do professor, com licença permanente para os alunos que já compraram
- [ ] Da plataforma
📝

**6.2 🟡 — A plataforma pode usar trechos das aulas em anúncio e rede social?**
- [ ] Sim, sem pedir
- [ ] Sim, avisando
- [ ] Só com autorização por escrito
📝

**6.3 🟡 — Existe limite de tamanho ou duração de vídeo por aula?**
Hoje: nenhum. A hospedagem é paga por armazenamento e banda — um professor sozinho pode
gerar um custo alto sem que ninguém perceba.
- [ ] Sem limite (é o que o sistema faz hoje)
- [ ] Máximo ______ min por aula e ______ aulas por curso
📝

**6.4 🟡 — Que conteúdo é proibido?**
Hoje: não há política escrita. O admin decide caso a caso na revisão.
- [ ] Vamos escrever uma política de conteúdo
- [ ] Critério do revisor, caso a caso (é o que o sistema faz hoje)
📝

**6.5 ⚪ — A plataforma é só em português, para o Brasil?**
- [ ] Sim (é o que o sistema faz hoje)
- [ ] Não: ______
📝

---

## 7. Conta do aluno

**7.1 ⚪ — É obrigatório confirmar o e-mail antes de entrar?**
Hoje: sim. Sem clicar no link do e-mail, o login não funciona.
- [ ] Sim (é o que o sistema faz hoje)
- [ ] Não
📝

**7.2 🟡 — Existe idade mínima para comprar?**
Hoje: não perguntamos idade em lugar nenhum.
- [ ] 18 anos
- [ ] Sem restrição (é o que o sistema faz hoje)
- [ ] Outro: ______
📝

**7.3 🔴 — Como o aluno recupera a senha?**
Hoje: **não existe.** Não há tela de "esqueci minha senha". Quem esquece perde a conta e
tudo que comprou.
- [ ] Por e-mail, com link de redefinição (padrão)
- [ ] Só pelo suporte, manualmente
📝

**7.4 🟡 — O aluno pode trocar o e-mail da conta dele?**
Hoje: não existe tela de perfil. Nem e-mail, nem nome, nem foto.
- [ ] Sim, precisa de tela de perfil
- [ ] Não por enquanto
📝

**7.5 ⚪ — Podemos mandar e-mail de marketing para os alunos?**
Hoje: só e-mail transacional (confirmação de cadastro).
- [ ] Sim, com opção de descadastro
- [ ] Só transacional (é o que o sistema faz hoje)
📝

---

## 8. Loja de produtos físicos

> Esta é a área com mais buracos. A loja vende, cobra e registra o pedido — mas o banco de
> dados não tem onde guardar **para onde** o produto vai.

**8.1 🔴 — Para onde o produto é enviado?**
Hoje: **a tabela de pedidos não tem campo de endereço.** O aluno compra, o dinheiro entra,
o admin vê o pedido — e não existe endereço nenhum.
- [ ] Precisa de cadastro de endereço na conta do aluno
- [ ] Endereço coletado pelo próprio Stripe no checkout
- [ ] Não vamos vender físico por enquanto — **a loja sai do ar**
📝

**8.2 🔴 — Quem paga o frete e quanto custa?**
Hoje: **não existe frete.** O total cobrado é a soma dos produtos e nada mais.
- [ ] Frete grátis, embutido no preço
- [ ] Valor fixo de R$ ______
- [ ] Calculado por CEP (exige integração com Correios/transportadora)
📝

**8.3 🔴 — Quem separa e despacha o pedido?**
Hoje: um admin muda o status na mão de "pago" para "enviado" e depois "entregue". Não há
código de rastreio em lugar nenhum.
- [ ] Nós mesmos, estoque próprio
- [ ] Fornecedor terceirizado
- [ ] Precisa de campo de código de rastreio: [ ] Sim [ ] Não
📝

**8.4 🟡 — O professor ganha comissão sobre os produtos vendidos na aula dele?**
Hoje: não. Os produtos são cadastrados pelo admin, aparecem dentro da aula do professor, e
100% da venda fica com a plataforma.
- [ ] Não ganha (é o que o sistema faz hoje)
- [ ] Ganha ______% dos produtos vendidos a partir das aulas dele
📝

**8.5 🟡 — O professor pode cadastrar produtos dele?**
Hoje: não. Só o admin cadastra produtos.
- [ ] Não (é o que o sistema faz hoje)
- [ ] Sim
📝

**8.6 🔴 — Troca e devolução de produto físico?**
Hoje: não existe. Mesmo problema legal do item 2.1 — o CDC dá 7 dias.
- [ ] 7 dias (mínimo legal)
- [ ] Prazo maior: ______
📝

**8.7 ⚪ — Entregamos em todo o Brasil?**
- [ ] Sim
- [ ] Só em algumas regiões: ______
📝

---

## 9. Jurídico e LGPD

**9.1 🔴 — Quem escreve os Termos de Uso e a Política de Privacidade?**
Hoje: o rodapé lista "Termos de uso", "Privacidade" e "Central de ajuda" como texto morto —
não são nem links, porque as páginas não existem.
- [ ] Advogado contratado
- [ ] Modelo pronto adaptado
- [ ] Ainda não resolvido
📝

**9.2 🔴 — Quem é o responsável pelos dados (controlador) perante a LGPD?**
CNPJ / razão social: ____________________
Contato do encarregado (DPO): ____________________
📝

**9.3 🔴 — Como o usuário apaga a conta e os dados dele?**
Hoje: não existe. É um direito garantido pela LGPD.
- [ ] Botão de excluir conta, apaga tudo na hora
- [ ] Pedido por e-mail, tratado manualmente em até ______ dias
📝

**9.4 🟡 — Se o aluno apagar a conta, o que acontece com o histórico de compra?**
Nota: dado fiscal costuma ter obrigação de guarda de 5 anos, mesmo com pedido de exclusão.
- [ ] Anonimizar o cadastro e guardar a nota
- [ ] Apagar tudo
📝

**9.5 🟡 — Precisamos de banner de consentimento de cookies?**
Hoje: não existe. Se entrar Google Analytics, Meta Pixel ou similar, passa a ser necessário.
- [ ] Sim, vamos usar ferramenta de análise/anúncio
- [ ] Não, sem rastreamento de terceiros
📝

---

## 10. Operação e suporte

**10.1 🔴 — Qual o canal de suporte, e para qual e-mail?**
Hoje: não há nenhum contato em lugar nenhum do site.
E-mail / canal: ____________________
📝

**10.2 🟡 — Quem opera o dia a dia (aprovar professor, revisar curso, despachar pedido)?**
Hoje: tudo cai no mesmo perfil de admin, sem separação.
- [ ] Uma pessoa só faz tudo (é o que o sistema faz hoje)
- [ ] Precisa separar perfis: ______________________
📝

**10.3 ⚪ — Quantos admins vão existir?**
Hoje: admin é criado direto no banco, na mão. Não há tela para promover alguém.
- [ ] Um só
- [ ] Vários, e precisamos de tela para gerenciar
📝

---

## 11. Comunicação e marketing

**11.1 🔴 — Os números da página inicial são reais?**
Hoje o site anuncia, fixo no código: **"500+ aulas disponíveis", "50+ chefs instrutores",
"10k+ alunos formados"**. Se não corresponderem à realidade no lançamento, é publicidade
enganosa (CDC art. 37).
- [ ] São reais / serão até o lançamento
- [ ] São ilustrativos — **precisam sair ou virar números de verdade**
📝

**11.2 🟡 — "Alunos formados" dá a entender que existe certificado. Existe?**
Hoje: não há certificado nenhum no sistema.
- [ ] Não existe, e o texto muda
- [ ] Precisa existir certificado ao concluir o curso
📝

**11.3 ⚪ — A promessa "receba por matrícula, sem mensalidade e sem taxa para publicar" está correta?**
- [ ] Sim (é o que o sistema faz hoje)
- [ ] Não: ______
📝

---

## 12. Coisas que não existem hoje — confirmar se ficam de fora

Nenhum destes itens está construído. Marque o que **precisa** entrar, e o que pode esperar.

| Item | Situação hoje | Precisa agora? |
|---|---|---|
| Avaliação/nota do curso pelo aluno | Não existe | [ ] Sim [ ] Depois |
| Certificado de conclusão | Não existe | [ ] Sim [ ] Depois |
| Cupom de desconto | Não existe | [ ] Sim [ ] Depois |
| Retomar o vídeo do ponto onde parou | O banco tem o campo, o player não usa | [ ] Sim [ ] Depois |
| Marcar aula como vista ao terminar o vídeo | Só o botão manual conta | [ ] Sim [ ] Depois |
| Perguntas do aluno para o professor | Não existe | [ ] Sim [ ] Depois |
| Assinatura mensal (acesso a tudo) | Só venda avulsa | [ ] Sim [ ] Depois |
| Tela de perfil do aluno | Não existe | [ ] Sim [ ] Depois |
| Documentos/materiais em PDF na aula | Banco e permissões prontos, sem tela | [ ] Sim [ ] Depois |
| Busca por chef | Só por título e categoria | [ ] Sim [ ] Depois |
| E-mail avisando o professor que o curso foi aprovado | Não existe | [ ] Sim [ ] Depois |
| Painel do professor com lista de alunos | Só a contagem | [ ] Sim [ ] Depois |

---

## Espaço livre

Qualquer regra que você tenha na cabeça e que não apareceu em nenhuma pergunta acima:

📝

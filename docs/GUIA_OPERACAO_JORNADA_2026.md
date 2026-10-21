# Jornada Diaconal · Guia de operação e aceitação

> Igreja de Deus no Guará 1 · Documento operacional
>
> Sistema: https://gustavolmarquesg4f-dotcom.github.io/jornada_diaconal/

## 1. Objetivo

Manter um cadastro íntegro, acompanhar o vínculo dos diáconos, organizar os responsáveis por grupos pequenos, assegurar escalas compatíveis com disponibilidade e apoiar os atendimentos pastorais com discrição.

A aplicação **não determina** o estado espiritual ou emocional de ninguém. Observações pessoais e confidências não devem ser transformadas em avaliações automatizadas ou enviadas por mensageria.

## Navegação única (sem módulos redundantes)

- **Visão geral** — indicadores resumidos, sem lançamentos ou edição
- **Diáconos** — cadastro, pesquisa, impressão e exportação de listas
- **Grupos e liderança** — estrutura pastoral, indicação de responsáveis, equipes, vínculos e transferências
- **Acompanhamento** — pendências de contato, histórico individual, retornos e disponibilidade operacional
- **Escala de intercessão** — sorteio, dupla por posto, confirmação e publicação
- **Agenda do Pr. Sato** — fila de acolhimento e horários aprovados
- **Relatórios** — indicadores mensais, CSV, prontidão e auditoria
- **Observações reservadas** e **Usuários e acessos** — somente administradores

A disponibilidade dos cultos é editada **apenas** no formulário operacional do perfil individual; o cadastro reservado mantém somente informações familiares e observações originais. As informações reservadas não são enviadas ao painel de acompanhamento.

## 2. Perfis

| Perfil | Uso previsto |
|---|---|
| Administrador | Cadastros, configuração de lideranças, observações originais, relatórios, auditoria, agenda pastoral e escalas |
| Coordenação | Cadastro operacional, grupos, disponibilidade, escalas, agenda e acompanhamento autorizado; sem acesso a observações originais |
| Líder de grupo | Apenas diáconos vinculados aos seus grupos: contatos, disponibilidade operacional, Acompanhamento e relatórios de seu escopo |

Criar **credenciais individuais apenas para quem precisa usar o sistema**. A liderança ministerial pode ser designada antes do login. Não compartilhar senha de administrador. Senhas provisórias devem ser alteradas no primeiro acesso.

## 3. Sequência para começar

1. Confirmar com o Pr. Sato quais pessoas serão líderes e qual será o grupo-piloto. Não atribuir automaticamente lideranças ou grupos.
2. Em **Grupos e liderança**, criar ou abrir o grupo existente (ex.: Cuidado 1), escolher um diácono ativo como responsável e distribuir os integrantes. **Designar líder não exige e-mail nem senha.** Para incluir pessoas, clicar em **+ Associar integrantes** no cartão do grupo, buscar os nomes, marcar as pessoas e confirmar a associação. A operação é conjunta: se houver conflito, nenhum integrante novo é associado naquele lote.
3. Se o responsável precisar acessar o sistema, o administrador usa **Criar acesso para o líder**, informa o e-mail e uma senha provisória de 12+ caracteres, e o sistema vincula a conta ao grupo correspondente. Essa etapa é opcional e distinta da designação pastoral.
4. Em **Acompanhamento**, cada responsável acompanha contatos a realizar, pessoas sem contato recente e encaminhamentos sinalizados.
5. No **Acompanhamento** individual, registrar o contato objetivo, a próxima data e eventual necessidade de atenção pastoral.
6. Registrar disponibilidade dos cultos no perfil de cada diácono; conferir **os dois cônjuges** quando ambos são diáconos.
7. Em **Escala de intercessão**, sortear rascunho, conferir a distribuição de duas pessoas em cada uma das duas portas, confirmar individualmente e somente então publicar.
8. Em **Agenda do Pr. Sato**, validar horários e prioridades com o pastor, convidar de forma voluntária e confirmar os agendamentos.
9. Em **Relatórios e indicadores**, escolher mês e exportar os resultados agregados para a liderança.

## Visão do líder

Após a criação de uma conta individual de líder, a API associa o usuário ao(s) grupo(s) nos quais foi designado. O líder vê somente esses grupos e seus integrantes, pode consultar a lista **Minha equipe**, acessar **Acompanhamento**, registrar contatos e consultar relatórios do seu escopo.

Não tem acesso à criação de grupos, à indicação de outros líderes, aos usuários administrativos ou às observações reservadas. O administrador pode verificar o layout usando **Prévia da visão do líder**, disponível em cada cartão de grupo. Essa prévia não se faz passar por outro usuário nem concede novas permissões.

## 4. Privacidade e comunicação

- A ferramenta de WhatsApp **prepara** uma mensagem genérica para revisão; ninguém é contatado automaticamente.
- As observações originais são exclusivas do administrador. A tela de disponibilidade não as expõe.
- A pesquisa anônima não permite identificar respondentes nem inferir dificuldades individuais.
- Relatórios apresentam métricas operacionais, sem transcrição de atendimentos ou registros íntimos.
- Prioridades da fila de acolhimento exigem confirmação humana; cadastro inativo não equivale automaticamente a afastamento.

## 5. Critérios de aceitação antes de liberar novos responsáveis

- [ ] O acesso sem sessão é rejeitado em painéis, relatórios, auditoria e disponibilidade.
- [ ] Um líder **não** consegue acessar cadastro, disponibilidade ou histórico fora de seus grupos.
- [ ] Administrador consegue criar grupo, vincular e transferir integrante sem perder histórico.
- [ ] Registro de contato gera próximo retorno e aparece no Acompanhamento.
- [ ] A disponibilidade atualizada aparece no sorteio de uma semana futura.
- [ ] Casais vinculados não são separados em um sorteio; nenhuma escala com vagas não confirmadas é publicada.
- [ ] O resultado impresso e o CSV respeitam o grupo selecionado e não contêm observações pessoais.
- [ ] A agenda não permite confirmação sem data, horário, pessoa e aprovação pastoral.
- [ ] Conferir manualmente visual no desktop e celular, inclusive navegação por teclado.
- [ ] Validar integridade dos cadastros após cada implantação.

## 6. Limites desta entrega

As ferramentas foram implementadas para que a liderança possa executar o processo, mas **não** foram realizados nomeações, convites ou sorteios reais na ausência dessas decisões.

Não considerar concluídos até validação específica: testes autenticados com usuários de todos os perfis, teste visual de dispositivos reais, integração oficial de mensageria, rotina externa de backup e processo seguro de importação em lote com prévia e conciliação de duplicidades.

## 7. Indicadores de implantação

Utilizar mensalmente: cadastros, pessoas vinculadas a grupos, proporção com contato registrado, contatos pendentes, escala planejada/publicada, atendimentos propostos/confirmados/concluídos e divergências de disponibilidade.

Antes de ampliar uma turma-piloto, revisar as falhas encontradas e corrigir fluxos por prioridade de segurança e impacto.

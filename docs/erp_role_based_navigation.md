# ERP IMPPEL - Navegacao por funcoes e fluxos

Data: 2026-08-24

## Objetivo

Esta documentacao registra o refinamento final da navegacao operacional do ERP IMPPEL.

A interface deve responder claramente:

- quem faz;
- o que faz;
- em qual ordem;
- qual ferramenta usa;
- para quem entrega depois.

Nenhuma regra de negocio, schema, dado real, rota antiga, API ou permissao de backend foi removida nesta reorganizacao.

## Sidebar final

Nomes curtos usados na barra lateral:

1. Inicio
2. Marketing
3. Atendimento
4. Orcamentos
5. Planejamento
6. Execucao
7. Materiais
8. Financeiro
9. Equipe
10. Pos-venda
11. Gestao
12. Backups

O nome completo aparece nos hubs, na Central Como Trabalhar e nas descricoes internas.

## Comportamento da sidebar

- Cada grupo abre o hub da funcao ao clicar no nome.
- O chevron abre ou fecha os atalhos daquele grupo.
- O primeiro atalho de cada grupo e `Todos`.
- Grupos vazios nao aparecem para o cargo.
- A sidebar pode ser recolhida no desktop.
- No mobile, o menu continua compacto e fecha apos navegacao.
- Rotas antigas continuam preservadas como compatibilidade.

## Hubs

Cada hub mostra:

- titulo completo;
- descricao curta;
- quem utiliza;
- o que fazer em sequencia;
- ferramentas numeradas;
- proxima funcao;
- botao grande `Como trabalhar nesta funcao`.

`Todos` nao e etapa numerada. Ele apenas abre o hub com todas as ferramentas daquela funcao.

## Funcoes, ferramentas e handoff

### Marketing e Captacao

Responsavel: Marketing, responsavel por conteudo ou divulgacao.

Ferramentas:

1. Planejamento de Conteudo
2. Identidade e Conteudo
3. Entregar Contatos

Handoff: Marketing concluido -> enviar contatos captados para Atendimento/CRM.

### Atendimento Comercial

Responsavel: atendente comercial, vendedor ou responsavel pelo CRM.

Ferramentas:

1. Sistema Comercial
2. Novos Leads
3. Clientes
4. CRM e WhatsApp

Handoff: lead qualificado -> encaminhar para Orcamentos.

### Orcamentos

Responsavel: orcamentista ou administrativo comercial.

Ferramentas:

1. Orcamentos
2. Catalogo de Materiais
3. Catalogo de Servicos
4. Calculo de Preco
5. Governanca Comercial
6. Templates

Handoff: orcamento aprovado -> encaminhar para Planejamento de Obras.

### Planejamento de Obras

Responsavel: gestor, encarregado ou responsavel pelo agendamento.

Ferramentas:

1. Ordem de Servico
2. Agenda

Handoff: OS preparada -> liberar para Execucao.

### Execucao de Obras

Responsavel: gestor de obra, encarregado, aplicador e equipe tecnica.

Ferramentas:

1. Registro de Obra
2. Ordem de Servico
3. Configurar Qualidade

Handoff: obra concluida -> enviar relatorio e garantia para Pos-venda.

### Materiais e Equipamentos

Responsavel: estoquista ou responsavel por materiais, ferramentas e equipamentos.

Ferramentas:

1. Controle de Materiais
2. Estoque Atual
3. Ferramentas
4. Venda de Materiais
5. Contagem Rapida

Handoff: materiais atualizados -> Financeiro e Gestao usam dados confiaveis para cobranca, auditoria e tomada de decisao.

### Financeiro e Administrativo

Responsavel: financeiro, administrativo ou gestor autorizado.

Ferramentas:

1. Fluxo de Caixa
2. Pagamentos
3. Relatorios
4. Contratos
5. Configuracoes Financeiras

Handoff: financeiro conferido -> Gestao acompanha indicadores e decide ajustes administrativos.

### Equipe e Treinamento

Responsavel: gestor de pessoas, encarregado, administrador e funcionarios autorizados.

Ferramentas:

1. Funcionarios
2. Produtividade
3. Como Trabalhar

Handoff: equipe treinada -> cada pessoa executa sua parte no fluxo operacional.

### Pos-venda e Relacionamento

Responsavel: pos-venda ou administrativo.

Ferramentas:

1. Garantias
2. Pos-venda e NPS

Handoff: historico do cliente retorna para Atendimento e Gestao em futuras oportunidades.

### Gestao e Configuracoes

Responsavel: administrador e gestores autorizados.

Ferramentas:

1. Usuarios e Cargos
2. Custos e Margens
3. Regras
4. Status
5. Governanca Comercial
6. Configuracoes Gerais
7. Formas de Pagamento
8. Condicoes de Pagamento
9. Contratos

Backups nao aparece em Gestao. Governanca Comercial permanece rota unica e pode ser acessada por Orcamentos como atalho operacional.

### Backups e Restauracao

Responsavel: administrador ou responsavel autorizado pela protecao dos dados.

Ferramentas:

1. Backup Completo
2. Exportar Modulos
3. Restaurar

Handoff: backup concluido -> operacao protegida para continuar, migrar ambiente ou restaurar com seguranca.

## Qualidade integrada

`Qualidade das Obras` nao e destacada como funcao separada da operacao diaria.

Os recursos continuam preservados:

- procedimentos;
- checklists;
- ocorrencias;
- nao conformidades;
- inspecoes;
- bloqueios;
- permissoes;
- backup.

Na Ordem de Servico, a aba de Registro de Obra mostra a secao `Qualidade e conclusao`, com checklist, evidencias, pendencias materiais e aviso de bloqueio. A pagina administrativa de qualidade permanece disponivel como atalho `Configurar Qualidade`.

## Backup separado

Backup fica como funcao propria no fim da sidebar.

Gestao nao lista Backup, Exportacao ou Restauracao.

Detalhes tecnicos permanecem recolhidos em areas avancadas ou na documentacao; a tela principal prioriza Exportar e Restaurar.

## Central Como Trabalhar

Os hubs abrem `/como-trabalhar?funcao=<chave>`.

A Central mostra:

- escolha da funcao;
- quem utiliza;
- objetivo;
- sequencia;
- glossario;
- botao para abrir modulo.

## Regras preservadas

- Nenhum dado real foi alterado.
- Nenhum schema foi alterado.
- Nenhuma migration foi criada.
- Nenhuma regra de estoque foi alterada.
- Nenhuma regra financeira foi alterada.
- Nenhuma permissao de backend foi enfraquecida.
- Nenhuma rota antiga foi removida.
- Nenhuma pagina duplicada foi criada.

## Pendencias

- Homologar nomes e ordem com usuarios reais da IMPPEL no Replit.
- Validar visualmente com celulares reais usados pela equipe.
- Evoluir exportacao/restauracao modular apenas quando tecnicamente suportado, sem criar exportacao falsa.

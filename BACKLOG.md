# Backlog - ERP IMPPEL

Este arquivo concentra tarefas futuras e pendencias planejadas do ERP IMPPEL.
O Prompt Mestre nao deve crescer com backlog funcional; novas demandas devem ser registradas aqui.

## Regras de manutencao

- Toda nova sprint deve consultar este arquivo antes da implementacao.
- Itens concluidos devem migrar para CHANGELOG.md.
- Itens bloqueados ou com risco conhecido devem ser refletidos em KNOWN_ISSUES.md.
- Nao registrar dados reais, senhas, URLs privadas ou informacoes sensiveis.

## Backlog operacional inicial

### Critico

- Formalizar, em cada proxima sprint, se o ambiente analisado e Desenvolvimento ou Producao antes de qualquer operacao de banco.
- Garantir que toda alteracao futura em estoque preserve a regra: quantidade somente por movimentacao.
- Manter verificacao de backup/restauracao para funcionalidades criticas.
- Homologar restore dos cinco PDFs reais em PostgreSQL descartavel, com segunda importacao e comparacao de saldo/idempotencia.
- Confirmar com a IMPPEL/contabilidade a aliquota fiscal real antes de usar `taxPercent` em producao comercial definitiva.
- Definir oficialmente alçadas, limites de desconto, regras de excecao de margem, gatilhos de bloqueio e responsaveis por aprovacao antes de operar a Governanca Comercial em producao.
- Antes da Etapa 7, concluir o push dos commits locais para `origin/main` ou executar a etapa somente em checkout onde `HEAD` e `origin/main` estejam iguais.

### Medio

- Consolidar a documentacao historica de `docs/` nos arquivos oficiais conforme novas sprints forem acontecendo.
- Homologar a nova navegacao por funcoes com usuarios reais da IMPPEL em desktop e celular, validando se os grupos e nomes batem com a rotina interna.
- Revisar, apos a homologacao de uso, se alguma rota antiga deve virar atalho, redirecionamento ou permanecer apenas por compatibilidade.
- Revisar se `docs/gemini.md`, `docs/PASSO A PASSO/protocolo_vlaeg.md` e outros documentos auxiliares ainda devem ser mantidos como referencia tecnica.
- Avaliar criacao de um indice de arquitetura caso a auditoria das proximas sprints identifique necessidade.
- Validar com funcionario novo se a Central Como Trabalhar e suficiente para executar rotina sem apoio externo.
- Homologar no Replit a restauracao controlada da base limpa com os PDFs aprovados, sem duplicar Admin e sem alterar banco real.
- Definir se as rotas antigas de Leads, WhatsApp e Marketing devem permanecer acessiveis por links internos ou virar redirecionamentos documentados para Sistema Comercial.
- Criar migration para tabela dedicada de `import_jobs`/`import_fingerprints`, substituindo fingerprints em observacoes por auditoria estruturada.
- Homologar visualmente em desktop e celular as telas de Custos e Margens, Calculadora, Orçamentos e Financeiro usando usuario real de teste.
- Definir politica real de comissao: base de calculo, porcentagens, liberacao por recebimento, cancelamento e estorno.
- Definir politica real de logistica/regiao: custo por km, minimo, pedagios, refeicoes, hospedagem e aprovacao de ajuste manual.
- Definir textos comerciais padrao para escopo incluido, escopo excluido, premissas e aditivos.
- Preencher e aprovar procedimentos tecnicos reais da IMPPEL para cada servico antes de usar bloqueios de qualidade em producao.
- Homologar a tela Qualidade das Obras em obra piloto com equipe tecnica, admin e responsaveis por aprovacao.
- Definir padrao operacional de fotos, evidencias, criterios de aceite e treinamento "Como Trabalhar" por servico.
- Homologar a Etapa 6 em piloto real: retirada, devolucao, transferencia, dano, perda, manutencao, contagem, treinamento e fechamento de OS.
- Definir prazos reais de devolucao por categoria, obra, funcionario ou tipo de item.
- Definir procedimento administrativo/juridico para qualquer providencia financeira relacionada a perdas e danos.
- Homologar em banco PostgreSQL descartavel a matriz final de permissoes das Etapas 4 a 6, repetindo os testes feitos localmente em memoria.
- Testar visualmente o erro 409 de estoque insuficiente na tela de Movimentacoes com produto selecionado via autocomplete; a API ja esta validada, mas a mensagem final da UI deve ser confirmada em fluxo manual completo.
- Homologar a Etapa 7 em PostgreSQL real com perfis comercial, marketing, financeiro, encarregado, aplicador e estoque.
- Definir status oficiais do funil comercial e politicas de follow-up D+2/D+5/D+10 da IMPPEL.
- Receber credenciais e documentacao oficial da Waseller antes de automatizar envio pelo WhatsApp.
- Definir se a automacao futura sera direta Waseller ou via n8n; a base atual nao depende do n8n.
- Configurar provedor de IA via variavel de ambiente para transformar o mock de geracao de posts em geracao real.
- Configurar Meta/Instagram com conta de teste antes de qualquer publicacao automatica.
- Preencher a Central Como Trabalhar com conteudo operacional real aprovado.
- Aprovar kit visual oficial da IMPPEL: logos, cores, tipografia, tom de voz, slogan e contatos.
- Homologar a Etapa 8 com fotos reais autorizadas em obra piloto antes de usar materiais em marketing.
- Definir regras oficiais de autorizacao de imagem por cliente, canal e finalidade.

### Melhoria

- Manter CHANGELOG.md atualizado a cada sprint com commits, testes e impacto funcional.
- Manter KNOWN_ISSUES.md como fonte viva de riscos, workarounds e pendencias.
- Manter ROADMAP.md alinhado com prioridades reais do ERP em producao.
- Apos congelamento da base 1.0, iniciar novas evolucoes apenas como versoes 1.x em sprints separadas.
- Integrar, em sprint futura, aprovacoes comerciais diretamente ao fluxo operacional de aceite do orcamento quando a politica da IMPPEL estiver definida.
- Evoluir indicadores de Qualidade das Obras com filtros por servico, funcionario, cliente, fase e periodo apos validacao dos dados reais.
- Evoluir relatorios de materiais com filtros por obra, funcionario, periodo, categoria, severidade e tempo medio de resolucao apos coleta de dados reais.
- Avaliar se Governanca Comercial deve permanecer somente Admin ou se cargos comercial/financeiro devem receber consultas especificas sem expor margens, com permissao explicita e teste de regressao.
- Evoluir o Sistema Comercial com filtros por responsavel, periodo, origem, campanha, motivo de perda e SLA.
- Evoluir processamento visual com biblioteca dedicada de imagem e FFmpeg/servico externo para videos, mantendo originais preservados.
- Integrar futuramente publicacao Meta/Instagram e Waseller apenas apos credenciais e conta de teste aprovadas.

## Migrado de docs/task_plan.md

O arquivo antigo `docs/task_plan.md` registrava o plano V.L.A.E.G. com as fases abaixo.
Como o conteudo e util como estrutura historica de planejamento, foi preservado aqui como backlog legado.

### Fase 0 - Inicializacao

- [x] Criar estrutura de pastas (`architecture/`, `tools/`, `.tmp/`)
- [x] Criar arquivos de memoria (`task_plan.md`, `findings.md`, `progress.md`)
- [x] Criar constituicao do projeto (`gemini.md`)
- [ ] Responder Perguntas de Descoberta (Fase 1)

### Fase 1 - Visao (V)

- [ ] Definir Estrela Guia
- [ ] Mapear Integracoes
- [ ] Identificar Fonte da Verdade
- [ ] Definir Payload de Entrega
- [ ] Estabelecer Regras Comportamentais
- [ ] Definir JSON Data Schema em `gemini.md`

### Fase 2 - Link (L)

- [ ] Validar `.env`
- [ ] Testar Handshake de APIs

### Fase 3 - Arquitetura (A)

- [ ] Escrever POPs em `architecture/`
- [ ] Desenvolver Ferramentas em `tools/`

### Fase 4 - Estilo (E)

- [ ] Refinar Payloads
- [ ] Aplicar UI/UX, se aplicavel

### Fase 5 - Gatilho (G)

- [ ] Configurar Automacao/Deploy
- [ ] Finalizar Log de Manutencao

## Observacao sobre backlog legado

Os itens V.L.A.E.G. foram migrados como historico e precisam ser reavaliados antes de execucao, porque nao foram escritos especificamente para o estado atual do ERP IMPPEL em producao.

## Backlog de producao

### Critico

- Vincular/autenticar o projeto no Vercel e validar deploy real com backend Express, banco PostgreSQL, autenticacao e sessoes.
- Confirmar banco de Producao e banco de Desenvolvimento antes de qualquer operacao com `db:push` ou sincronizacao de dados.
- Configurar variaveis obrigatorias no provedor de producao: `DATABASE_URL`, `SESSION_SECRET`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD` e `PORT` quando necessario.

### Melhoria

- Avaliar reducao do bundle frontend com code splitting/dynamic imports.
- Atualizar base Browserslist/caniuse-lite em sprint de manutencao.

## Itens concluidos em 2026-07-20

- Parser PDF do modulo Controle de Materiais (`tipo=materiais`) implementado para preview e merge seguro.
- Restore de materiais passou a separar retiradas, entradas e saidas/consumo.

## Backlog tecnico relacionado a materiais

### Melhoria

- Avaliar uma camada transacional unica para restores complexos que envolvem varias tabelas, usando uma abstracao de storage compativel com PostgreSQL e storage em memoria de testes.
- Evoluir a interface de mapeamento manual de produtos/responsaveis pendentes quando PDFs antigos trouxerem nomes divergentes do catalogo atual.
- Criar fluxo assistido de ordem de importacao para backups PDF reais: Usuarios e Cargos, Produtos, Servicos, Estoque e Controle de Materiais.
- Validar com o PDF de Estoque usado no Replit que deve conter 72 itens e 44 movimentacoes historicas, pois o unico PDF local encontrado em 2026-07-20 continha 96 itens e 0 movimentacoes.

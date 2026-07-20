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

### Medio

- Consolidar a documentacao historica de `docs/` nos arquivos oficiais conforme novas sprints forem acontecendo.
- Revisar se `docs/gemini.md`, `docs/PASSO A PASSO/protocolo_vlaeg.md` e outros documentos auxiliares ainda devem ser mantidos como referencia tecnica.
- Avaliar criacao de um indice de arquitetura caso a auditoria das proximas sprints identifique necessidade.

### Melhoria

- Manter CHANGELOG.md atualizado a cada sprint com commits, testes e impacto funcional.
- Manter KNOWN_ISSUES.md como fonte viva de riscos, workarounds e pendencias.
- Manter ROADMAP.md alinhado com prioridades reais do ERP em producao.

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

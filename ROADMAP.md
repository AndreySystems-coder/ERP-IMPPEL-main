# Roadmap - ERP IMPPEL

Este arquivo orienta a evolucao planejada do ERP IMPPEL.
Ele nao substitui o BACKLOG.md; o roadmap descreve direcao, enquanto o backlog descreve tarefas executaveis.

## Principios permanentes

- Priorizar estabilidade e seguranca antes de novas funcionalidades.
- Preservar integridade dos dados reais.
- Tratar estoque, financeiro, usuarios, permissoes e backup como modulos criticos.
- Evitar solucoes rapidas que corrijam apenas sintomas.
- Documentar toda mudanca relevante em CHANGELOG.md, BACKLOG.md e KNOWN_ISSUES.md.

## Horizonte imediato

1. Manter a documentacao oficial atualizada em todas as proximas sprints.
2. Antes de qualquer implementacao, executar auditoria conforme PROMPT_MESTRE.md.
3. Confirmar ambiente de execucao antes de qualquer operacao de banco: Desenvolvimento ou Producao.
4. Validar riscos de estoque, backup, permissoes e dados reais antes de mudancas funcionais.

## Horizonte de curto prazo

- Consolidar auditoria tecnica completa do ERP atual.
- Mapear rotas, componentes, schemas, permissoes e fluxos criticos.
- Revisar documentacao legada em `docs/` e decidir o que deve continuar como referencia.
- Garantir que toda sprint atualize os documentos oficiais.

## Horizonte de medio prazo

- Fortalecer observabilidade, logs, auditoria e feedback visual nos modulos criticos.
- Revisar performance de consultas e telas operacionais com maior volume de dados.
- Manter backup/restauracao validado para fluxos de producao.
- Evoluir UX sem remover funcionalidades existentes.

## Migrado de docs/task_plan.md - V.L.A.E.G.

O roadmap legado registrava as fases abaixo:

1. Inicializacao
2. Visao
3. Link
4. Arquitetura
5. Estilo
6. Gatilho

Essas fases foram preservadas como referencia historica e podem orientar futuras organizacoes de trabalho, desde que sejam reavaliadas contra o estado real do ERP.

## Fora de escopo deste roadmap

- Dados reais da IMPPEL.
- Senhas, credenciais ou variaveis de ambiente.
- Backups reais, PDFs reais, JSONs reais ou anexos reais.

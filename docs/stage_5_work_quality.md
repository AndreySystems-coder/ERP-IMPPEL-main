# Etapa 5 - Padronizacao tecnica e qualidade das obras

## Objetivo

Registrar a estrutura tecnica para procedimentos, checklists, evidencias, ocorrencias, nao conformidades, inspecoes e bloqueios de fechamento de Ordens de Servico.

Esta etapa cria a base operacional. Conteudos tecnicos reais da IMPPEL, como tempos de cura, consumo, EPIs, metodos e criterios finais, devem ser preenchidos e aprovados pela equipe responsavel antes do uso definitivo.

## Estrutura

- `technical_procedures`: procedimentos tecnicos versionados por servico.
- `checklist_templates`: checklists configuraveis por fase da obra.
- `work_order_quality_runs`: execucoes de checklist ligadas a OS/obra.
- `quality_events`: ocorrencias, evidencias, inspecoes, excecoes e nao conformidades.

## Regras implementadas

- Procedimentos nascem como rascunho.
- Procedimento com marcador `PENDENTE DE VALIDACAO TECNICA DA IMPPEL` nao pode ser aprovado.
- Execucao de checklist pode bloquear fechamento quando houver itens obrigatorios pendentes ou bloqueios abertos.
- Ocorrencia do tipo nao conformidade ou severidade bloqueante impede fechamento enquanto estiver aberta.
- Fechamento de OS consulta os bloqueios de qualidade antes de concluir.

## Backup

O backup completo inclui o modulo `qualidadeObras` com:

- procedimentos tecnicos;
- templates de checklist;
- execucoes de checklist por OS;
- eventos de qualidade e evidencias.

## Pendencias operacionais

- Preencher conteudo tecnico real da IMPPEL.
- Aprovar procedimentos por responsavel tecnico.
- Homologar em obra piloto com usuarios reais.
- Definir padrao oficial de anexos/fotos de evidencia por fase.

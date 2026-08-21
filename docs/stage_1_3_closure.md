# Fechamento Tecnico - Etapas 1, 2 e 3

Data: 2026-08-21

## Etapa 1 - Precificacao

Fonte de verdade: `shared/marginEngine.ts`.

Formula oficial:

```text
Custo Inicial = Material + Custo Operacional
Custos Ocultos = Custo Inicial * Percentual de Custos Ocultos
Custo Base = Custo Inicial + Custos Ocultos
Preco Final = Custo Base / (1 - Percentual de Impostos - Margem Desejada)
```

O motor valida percentuais negativos, margem invalida, imposto invalido, denominador menor ou igual a zero, `NaN` e infinito. O arredondamento monetario padrao e em centavos.

Parametros persistidos em `cost_config`:

- custos fixos mensais
- pro-labore
- faturamento medio
- divida total
- percentual de custos ocultos
- percentual de impostos
- margem minima, ideal, alerta e proibida
- valor minimo de atendimento
- modo de arredondamento
- vigencia, responsavel e historico

Orcamentos novos gravam `pricing_snapshot` para preservar os parametros usados no momento do calculo.

## Etapa 2 - Financeiro Operacional

Fonte de verdade operacional: `transactions`.

Pagamentos continuam existindo como fluxo de parcelas/orcamentos, mas pagamentos concluidos sincronizam entradas em `transactions`.

Campos operacionais adicionados:

- status
- competencia
- vencimento
- data de pagamento/recebimento
- forma de pagamento
- cliente
- fornecedor
- vinculos com orcamento e OS
- parcela, recorrencia, observacoes, anexo e responsavel

A tela Financeiro apresenta:

- saldo realizado
- entradas realizadas
- saidas realizadas
- contas dos proximos 7 dias
- saldo real dos proximos 7 dias
- projecao minima de 30 dias
- resumo financeiro semanal

A reuniao semanal continua sendo processo humano. O ERP fornece os numeros e campos de registro.

## Etapa 3 - Base Operacional

A base operacional existente foi preservada:

- Cliente/Lead -> Orcamento -> OS
- Materiais, estoque e controle de materiais
- Registro de obra
- Finalizacao, garantia e pos-venda
- Backup e restauracao

O backend recalcula valores criticos de orcamento antes de salvar, impedindo divergencia entre frontend e API.

## Backup e Restauracao

Os novos dados entram nos backups existentes porque:

- `financeiro` inclui `payments` e `transactions`
- `configuracoes` inclui `costConfig`
- `orcamentos` inclui `jobs`, agora com `pricing_snapshot`

Backups antigos continuam compativeis porque os novos campos possuem defaults ou sao opcionais.

## Acoes da IMPPEL

- Confirmar aliquota fiscal real para configurar `taxPercent`.
- Validar valores financeiros reais antes de usar a precificacao em venda definitiva.
- Executar rotina semanal de decisao financeira.
- Conferir estoque fisico.
- Treinar funcionarios e padronizar lancamentos.
- Validar visualmente o fluxo em celular durante piloto real.

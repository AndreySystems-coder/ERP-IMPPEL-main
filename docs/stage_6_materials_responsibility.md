# Etapa 6 - Controle de Materiais, Ferramentas e Responsabilidade

## Objetivo

Fechar tecnicamente a rastreabilidade de materiais consumiveis, ferramentas retornaveis, equipamentos, kits, custodia, ocorrencias, manutencao, contagem e treinamento operacional.

Esta etapa nao cria um estoque paralelo. A fonte de saldo continua sendo o modulo Estoque e as movimentacoes oficiais.

## O que ja existia

- Cadastro de estoque com tipos de item.
- Ferramentas e Equipamentos como visualizacao de itens retornaveis.
- Controle de Materiais com retirada, devolucao, foto, assinatura, responsavel e OS.
- Registro Rapido de Materiais.
- Contagem Rapida.
- Movimentacoes de estoque.
- Devolucao em bom estado retornando ao disponivel.
- Devolucao danificada, perdida ou em manutencao sem retorno automatico ao disponivel.
- Backup completo com estoque, movimentacoes, retiradas, devolucoes, fotos e assinaturas.

## O que foi criado

- Transferencia de custodia com responsavel anterior, novo responsavel, quantidade, motivo, aceite e auditoria.
- Casos de responsabilidade administrativa para dano, perda, manutencao, divergencia, atraso, sobra ou outro.
- Kits por funcao, funcionario ou equipe.
- Registros de manutencao de ferramentas/equipamentos.
- Auditoria de contagem e conciliacao antes de qualquer ajuste.
- Guias de treinamento "Como Trabalhar" em rascunho editavel.
- Indicadores simples de pendencias, transferencias, ocorrencias e manutencoes.

## Regras de seguranca

- Nenhum desconto salarial e criado automaticamente.
- Dano, perda e manutencao geram caso administrativo com `financialStatus=sem_providencia_financeira`.
- Qualquer consequencia financeira futura depende de decisao administrativa, base valida e aprovacao humana.
- Consumiveis nao viram pendencia de devolucao.
- Retornaveis pendentes e casos bloqueantes podem impedir finalizacao da OS.
- Estoque continua sendo alterado por movimentacoes.

## Integracao com OS e Qualidade

- A finalizacao da OS consulta pendencias de qualidade e tambem pendencias materiais bloqueantes.
- Retornaveis pendentes ligados a OS bloqueiam fechamento tecnico enquanto estiverem abertos.
- Ocorrencias de material com severidade bloqueante tambem bloqueiam fechamento.
- Ocorrencias administrativas nao bloqueantes preservam a pendencia sem invalidar automaticamente o servico.

## Backup e restauracao

O modulo `controleMateriais` passou a incluir:

- `materialCustodyTransfers`
- `materialResponsibilityCases`
- `materialKits`
- `materialKitItems`
- `toolMaintenanceRecords`
- `materialCountAudits`
- `materialTrainingGuides`

## Pendencias operacionais da IMPPEL

- Classificar itens reais como consumivel, ferramenta, equipamento, EPI reutilizavel ou EPI descartavel.
- Organizar fisicamente estoque, prateleiras e etiquetas.
- Definir responsavel pelo estoque.
- Definir prazos de devolucao.
- Definir regras administrativas e juridicas para qualquer providencia financeira.
- Criar conteudo oficial de treinamento.
- Executar piloto real com funcionarios.

# Release Notes - ERP IMPPEL v1.0

Data da release: 2026-07-22

## Objetivo

Congelar a primeira base estavel do ERP IMPPEL para implantacao no Replit oficial da empresa.

## Novidades consolidadas

- Bootstrap automatico e idempotente do Admin em banco novo.
- Usuarios, cargos e permissoes por perfil.
- Catalogos de produtos e servicos.
- Estoque Atual com ferramentas retornaveis separadas.
- Ferramentas e Equipamentos com total, disponivel, em campo, danificado, perdido e manutencao.
- Controle de Materiais com retiradas, devolucoes, historico, fotos e assinaturas quando existirem.
- Registro Rapido e Contagem Rapida.
- Vendas de materiais com validacao de estoque e permissao.
- Backup completo e importacao por PDF com preview, confirmacao e merge.
- Restore de Controle de Materiais pelo mesmo contrato do backup gerado pelo ERP.

## Correcoes relevantes

- Restore de materiais nao cria usuarios, materiais, fotos ou assinaturas falsas.
- Movimentos historicos restaurados do Controle de Materiais nao reaplicam saldo quando o Estoque ja foi restaurado.
- Fingerprints evitam duplicidade em segunda importacao.
- Alias de funcionario/material e deduplicado por batch.
- Valores monetarios sao interpretados em reais.
- Movimentacoes de saida acima do saldo sao bloqueadas.
- Admin existente nao e sobrescrito nem duplicado.

## Limitacoes conhecidas

- Homologacao final com PostgreSQL descartavel e PDFs reais ainda deve ser executada no ambiente oficial antes de liberar uso amplo.
- PDFs antigos dependem de resolucao manual quando nomes de usuarios ou materiais divergem do cadastro atual.
- Ainda nao existe tabela dedicada de `import_jobs`/`import_fingerprints`; fingerprints ficam registrados em historicos/observacoes.
- Bundle frontend grande permanece como melhoria futura, sem bloquear operacao.
- Aviso visual especifico para servicos com custo de mao de obra zerado fica para evolucao 1.x.

## Pendencias dependentes da empresa

- Definir banco PostgreSQL oficial.
- Configurar secrets reais.
- Importar PDFs reais na ordem recomendada.
- Resolver pendencias de materiais/responsaveis.
- Gerar e guardar backup completo inicial.
- Validar usuarios reais e permissoes.

## Criterio de release

Esta release e considerada finalizada quando:

- GitHub estiver sincronizado.
- Testes automatizados passarem.
- Documentacao de implantacao estiver presente.
- O Replit oficial conseguir subir com PostgreSQL e Admin.
- A empresa validar importacao dos PDFs reais e backup inicial.

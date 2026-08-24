# Changelog - ERP IMPPEL

Todas as alteracoes relevantes do ERP devem ser registradas neste arquivo.
Usar entradas cronologicas, com impacto funcional, arquivos principais e validacoes executadas.

## [2026-08-24] - Refinamento da sequencia operacional e guia por funcao

### Alterado

- Sidebar passou a usar nomes curtos: Inicio, Marketing, Atendimento, Orcamentos, Planejamento, Execucao, Materiais, Financeiro, Equipe, Pos-venda, Gestao e Backups.
- Clique no grupo abre o hub da funcao; o chevron fica como atalho para abrir/recolher subitens.
- Hubs passaram a mostrar `Quem utiliza`, `O que fazer`, ferramentas numeradas, proxima funcao e botao grande para `Como Trabalhar`.
- `Visao da funcao` foi substituido por `Todos` nos atalhos da sidebar.
- `Sistema Comercial` passou a exibir `Todos` como primeira aba e textos de follow-up como `proximo contato`.
- `Identidade e Conteudo` manteve o stepper e passou a usar a ordem Marca, Fotos, Biblioteca, Antes/Depois, Template, Conteudo, Revisao e Exportacao.
- Ordem de Servico recebeu secao `Qualidade e conclusao` dentro do Registro de Obra, preservando bloqueios e a pagina administrativa de qualidade como atalho secundario.
- `Gestao` deixou de listar Backups, mantendo Backups como funcao propria.
- Central `Como Trabalhar` foi alinhada com a nova sidebar e aceita abertura direta por funcao.

### Documentacao

- Atualizado `docs/erp_role_based_navigation.md` com nomes finais, ordem, ferramentas, responsabilidades, handoffs, qualidade integrada e backup separado.

### Observacoes

- Nenhum schema, migration, dado real, regra de negocio, regra financeira, regra de estoque ou permissao de backend foi alterado.

## [2026-08-24] - Reorganizacao final da navegacao por funcoes

### Alterado

- Sidebar reorganizada por fluxo real da IMPPEL: Inicio, Marketing, Atendimento Comercial, Orcamentos, Planejamento, Execucao, Materiais, Financeiro, Equipe, Pos-venda, Gestao e Backups.
- Grupos da sidebar agora sao recolhiveis e respeitam permissoes antes de aparecer.
- Hubs foram alinhados por funcao, com responsavel, primeiro passo, sequencia recomendada e acesso para `Como Trabalhar`.
- `Sistema Comercial` ficou focado em vendas, qualificacao, funil, follow-ups, WhatsApp e fechados/perdidos.
- `Planejamento de Conteudo` virou pagina separada dentro de Marketing & Captacao, reutilizando as APIs existentes.
- `Identidade e Conteudo` passou a ter fluxo em etapas para marca, padroes, autorizacoes, midias, antes/depois, templates, geracao e revisao.
- `Qualidade das Obras` foi simplificada em abas: Visao Geral, Procedimentos, Checklists, Ocorrencias e Inspecoes.
- `Backups` manteve os fluxos existentes, mas recolheu a matriz tecnica em detalhes expandiveis.

### Documentacao

- Criado `docs/erp_role_based_navigation.md` com a navegacao oficial por funcoes, rotas preservadas, regras mantidas e pendencias operacionais.

### Observacoes

- Nenhum schema, migration, dado real, regra de negocio, regra de estoque ou permissao de backend foi alterado.

## [2026-08-24] - Simplificacao de UX, treinamento e preparo operacional

### Alterado

- Menu principal consolidou a area `Comercial`, reduzindo duplicidade visual entre Leads, WhatsApp, Marketing e Sistema Comercial.
- `Sistema Comercial` passou a organizar a experiencia em abas: Visao Geral, Funil, Leads, Follow-ups, WhatsApp, Marketing e Ajuda.
- `Como Trabalhar` foi ampliado para manual interativo com fluxo recomendado, trilhas por modulo, ordem das acoes, orientacao para funcionario novo/admin e glossario.
- `Identidade Visual` passou a usar linguagem operacional: Marca, Biblioteca de midias, Antes e Depois e Templates, mantendo o backend tecnico preservado.
- `Qualidade das Obras` e `Governanca Comercial` receberam blocos explicativos com finalidade, ordem de uso e proximos passos.
- `Backups` recebeu matriz de cobertura das Etapas 1 a 8, distinguindo backup completo, exportacao simples, restauracao e dependencias.

### Documentacao

- Criado `docs/erp_usability_and_training_rework.md` com diagnostico, nova navegacao, treinamento, matriz de backup, Replit, Vercel e pendencias.

### Observacoes

- Nenhuma regra de negocio, schema, migration, seed, dado real, credencial ou restauracao foi alterada.
- Rotas antigas foram preservadas para compatibilidade, mas deixaram de competir como entradas duplicadas no menu principal.

## [2026-08-24] - Implementacao da Etapa 8 identidade visual

### Adicionado

- Nova tela `Identidade Visual` para kit visual, padroes de foto/video, autorizacoes, biblioteca visual, templates e composicoes antes/depois.
- Novas APIs `/api/visual-*` com validacao de upload, autorizacao, checksum, preservacao de original e permissoes explicitas.
- Novo modulo de backup `identidadeVisual` com tabelas de kits, padroes, autorizacoes, assets, templates e composicoes.
- Central Como Trabalhar recebeu guia base para fotos, videos, autorizacoes e uso de identidade visual.
- Testes de backup e operacionais passaram a cobrir dados visuais, permissoes e preservacao de originais.

### Observacoes

- Nenhuma marca oficial, slogan, foto real ou conteudo privado foi inventado.
- Processamento real de video, IA real, Waseller e Meta/Instagram permanecem dependencias externas.

## [2026-08-24] - Implementacao da Etapa 7 comercial e experiencia operacional

### Adicionado

- Nova tela `Sistema Comercial` com funil, indicadores, busca de leads, duplicidades, follow-ups e planejamento de marketing.
- Sequencia de follow-up D+2/D+5/D+10 com tarefas manuais idempotentes.
- Gerador seguro de rascunho de post para revisão humana, em modo mock/copy quando nao ha provedor externo configurado.
- Nova Central `Como Trabalhar` com guias por modulo e procedimentos de obra cadastrados.
- Leads receberam campos de qualificacao, prioridade, proxima acao, historico, motivo de perda e dados B2B.
- Novas tabelas para status de funil, follow-ups, interacoes, marketing, artigos de ajuda e auditoria de politica de retorno.
- Backup completo passou a incluir `sistemaComercial`, `marketingConteudo`, `centralAjuda` e `auditoriaMateriais`.
- Financeiro ganhou graficos de entradas/saidas e resultado por categoria usando Recharts.

### Corrigido

- Alteracao entre consumivel e retornavel agora exige justificativa e bloqueia conversao para consumivel quando ha custodia retornavel aberta.
- Status de lead perdido exige motivo de perda no backend.

### Observacoes

- Nenhuma integracao falsa com Waseller foi criada; o ERP permanece pronto para integracao futura mediante credenciais/API real.
- n8n foi classificado como opcional, nao necessario para operar a Etapa 7 em fluxo assistido.
- Conteudo tecnico real da IMPPEL nao foi inventado.

## [2026-08-24] - Correção final do gate das Etapas 1 a 6

### Corrigido

- APIs de leitura de Qualidade das Obras passaram a exigir permissões explicitas, deixando de depender apenas de usuário autenticado.
- Movimentações de estoque com quantidade zero ou negativa agora retornam erro de domínio `400`.
- Saídas de estoque acima do saldo disponível agora retornam `409` com mensagem operacional clara, sem stack trace ou erro interno.
- Atualização direta de movimentação também passou a validar saldo antes de aplicar a alteração.
- Contrato de Procedimentos Técnicos foi padronizado em `name`; payloads legados com `title` são aceitos apenas como compatibilidade de entrada e salvos no campo canônico.

### Validação

- `npm install`
- `npx tsc --noEmit --incremental false`
- `npm run build`
- `npm run test`
- `npm run test:backup`
- `npm run test:operational`
- `git diff --check`
- Validação local em servidor `NODE_ENV=development` com storage em memória, usuários sintéticos e matriz de permissões por API.
- Validação visual desktop e mobile 390x844 das áreas: Dashboard, Orçamentos, Governança Comercial, Qualidade das Obras, Estoque, Controle de Materiais, OS e Backups.

## [2026-08-21] - Fechamento tecnico da Etapa 6 de materiais e responsabilidade

### Adicionado

- Criada estrutura tecnica para transferencias de custodia, casos de responsabilidade administrativa, kits, manutencao, conciliacao de contagem e treinamento "Como Trabalhar".
- Controle de Materiais ganhou aba `Etapa 6` com acoes mobile-friendly para registrar transferencias, ocorrencias, manutencoes, kits, divergencias e treinamento em rascunho.
- Novas APIs `/api/material-responsibility/*` com autenticacao, autorizacao, auditoria e indicadores.
- Finalizacao de OS passou a bloquear pendencias materiais retornaveis e ocorrencias bloqueantes, sem tratar consumiveis como devolucao pendente.
- Backup completo do modulo `controleMateriais` passou a incluir todos os novos registros da Etapa 6.
- Migration incremental `migrations/0004_stage_6_material_responsibility.sql` adiciona apenas tabelas novas com `CREATE TABLE IF NOT EXISTS`.

### Corrigido

- Devolucao de item danificado, perdido ou em manutencao deixou de criar desconto salarial automaticamente; agora abre caso administrativo sem providencia financeira.

### Observacoes

- Regras disciplinares, juridicas, prazos reais, valores, treinamentos definitivos e responsaveis oficiais nao foram inventados e permanecem como decisao da IMPPEL.

## [2026-08-21] - Implementacao tecnica da Etapa 5 de qualidade das obras

### Adicionado

- Criada a base de Qualidade das Obras para procedimentos tecnicos, checklists configuraveis, execucoes por OS e eventos de qualidade.
- Nova tela administrativa `Qualidade das Obras` dentro do fluxo de Obras.
- Novas APIs `/api/quality/*` com autenticacao, autorizacao, trilha de auditoria e indicadores.
- Fechamento de OS passou a consultar bloqueios de qualidade antes de concluir.
- Backup completo passou a incluir o modulo `qualidadeObras`.
- Migration incremental `migrations/0003_stage_5_work_quality.sql` adiciona apenas tabelas novas com `CREATE TABLE IF NOT EXISTS`.

### Observacoes

- Conteudos tecnicos reais da IMPPEL nao foram inventados; procedimentos podem nascer como rascunho e bloqueiam aprovacao quando ainda contem marcador de pendencia tecnica.
- A estrutura esta pronta para homologacao operacional, mas requer preenchimento e aprovacao dos procedimentos reais pela IMPPEL.

## [2026-08-21] - Implementacao tecnica da Etapa 4 comercial

### Adicionado

- Criada a base de Governanca Comercial para politicas, solicitacoes de desconto, comissoes, logistica, versoes de orcamento e aditivos.
- Nova tela administrativa `Governanca Comercial` em Configuracoes.
- Novas APIs `/api/commercial/*` com autenticacao, autorizacao, decisao administrativa e trilha de auditoria.
- Backup completo passou a incluir o modulo `governancaComercial`.
- Migração incremental `migrations/0002_stage_4_commercial_governance.sql` adiciona apenas tabelas novas com `CREATE TABLE IF NOT EXISTS`.

### Observacoes

- Percentuais e alçadas definitivas nao foram inventados; permanecem configuraveis e pendentes de decisao da IMPPEL.
- A implementacao nao altera automaticamente orcamentos existentes; aprovacoes comerciais ficam registradas para auditoria.

## [2026-08-21] - Fechamento tecnico das Etapas 1, 2 e 3

### Alterado

- Precificacao passou a usar `shared/marginEngine.ts` como motor oficial unico para custo inicial, custos ocultos, impostos, margem e preco final.
- Calculadora de precos passou a consumir o mesmo motor usado por orcamentos.
- Criacao e atualizacao de orcamentos agora recalculam valores criticos no backend antes de salvar e gravam `pricingSnapshot` com os parametros usados.
- Configuracao de Custos e Margens passou a expor custos fixos mensais, pro-labore, faturamento medio, divida total, custos ocultos e impostos como parametros editaveis.
- Financeiro passou a registrar status, competencia, vencimento, pagamento/recebimento, cliente, fornecedor, forma de pagamento e observacoes em `transactions`.
- Tela Financeiro passou a mostrar saldo realizado, saldo real dos proximos 7 dias, projecao minima de 30 dias e resumo financeiro semanal.

### Banco

- Adicionada migration incremental `migrations/0001_stage_1_3_financial_pricing.sql` com `ADD COLUMN IF NOT EXISTS` para preservar bancos existentes.
- Novos campos foram adicionados com defaults ou como opcionais para manter compatibilidade com dados antigos.

### Validacao

- TypeScript validado com `npx tsc --noEmit --incremental false`.
- `npm run build` passou com os avisos ja conhecidos de bundle grande e `import.meta` no build CJS.
- `npm run test:backup` passou.
- `npm run test:operational` passou e cobre formula oficial e projecao financeira simples.

## [2026-07-24] - Melhorias no Registro Rapido

### Alterado

- Registro Rapido passou a usar busca inteligente de materiais no preview, com correspondencia por nome, parte do nome, caixa ignorada e normalizacao de aliases do parser.
- Registro Rapido passou a permitir confirmacao explicita de itens com estoque insuficiente, mantendo o alerta visual antes de aplicar.

### Segurança

- A excecao para saldo insuficiente ficou restrita ao endpoint de Registro Rapido e exige confirmacao; as demais movimentacoes continuam bloqueadas pela regra global de estoque.

### Validacao

- Testes operacionais cobrem bloqueio padrao de estoque, excecao controlada do Registro Rapido e busca por alias normalizado.

## [2026-07-24] - Validacao final de restore operacional e credenciais

### Corrigido

- Login e `/api/auth/me` deixaram de zerar ou ocultar `mustChangePassword` antes da troca real de senha.
- Listagem administrativa de usuarios passou a exibir o estado real de redefinicao obrigatoria, permitindo auditar funcionarios importados com senha nao exportavel.
- Exportacao operacional de usuarios passou a indicar `trocaPendente` com base no estado real do cadastro.

### Validacao

- Fluxo temporario por API oficial confirmou importacao de Usuarios/Cargos, Produtos, Servicos, Estoque e Controle de Materiais.
- Controle de Materiais ficou preenchido com 77 retiradas e 245 itens de retirada em ambiente temporario em memoria.
- Segunda importacao do PDF de Controle de Materiais nao criou novas retiradas nem novos itens.

## [2026-07-23] - Correcao do importador PDF de Usuarios e Cargos

### Corrigido

- Restore de Usuarios/Cargos passou a criar usuarios novos com `Senha Inicial: Nao disponivel` usando senha temporaria aleatoria criptografada, sem credencial previsivel e com redefinicao obrigatoria pelo administrador.
- Usuarios existentes com senha nao exportavel agora preservam o hash atual e atualizam apenas campos seguros.
- Parser de cargos do PDF passou a reconhecer os 9 cargos oficiais e aplicar permissoes padrao equivalentes ao sistema, incluindo nomes quebrados como `Gestao de EPIs,`.
- Restore de cargos passou a preservar permissoes existentes quando o PDF nao trouxer permissoes validas, evitando sobrescrita por `{}`.
- Preview de Usuarios/Cargos passou a listar usuarios sem senha recuperavel, cargos sem permissao, cargos reconhecidos e logins invalidos com motivo visivel.

### Validacao

- Testes operacionais adicionados para usuario novo sem senha exportavel, usuario existente preservando hash, cargo existente sem permissoes no PDF e segunda importacao idempotente.

## [2026-07-22] - Release engineering 1.0

### Adicionado

- Criado `DEPLOY_CHECKLIST.md` com passo a passo de implantacao no Replit oficial, configuracao de PostgreSQL, secrets, schema, importacao dos PDFs e backup inicial.
- Criado `RELEASE_NOTES_v1.0.md` com novidades, correcoes, limitacoes e pendencias dependentes da empresa.

### Corrigido

- Preview de Usuarios/Cargos passou a informar especificamente quando o cargo esta ausente, sem mensagem generica de `cargo/perfil/status`.
- Preview de Controle de Materiais passou a expor ocorrencias avaliadas, materiais unicos, responsaveis, pendencias detalhadas, possiveis correspondencias, score e acao sugerida.
- Resultado de importacao PDF de Controle de Materiais passou a devolver relatorio detalhado e registrar resumo estruturado no log do backend.
- README foi atualizado para refletir arquitetura, instalacao, variaveis, banco, testes, backup, restore, publicacao no Replit e atualizacao do ERP.

### Escopo

- Nenhuma regra de negocio, schema, API publica, fingerprint, alias, score de matching, `applyToStock` ou parser de aplicacao foi alterado para forcar importacoes.

## [2026-07-22] - Correcao final de homologacao de backup e estoque

### Corrigido

- Restore historico por PDF de Controle de Materiais deixou de gravar marcadores artificiais em `withdrawalPhoto` e `withdrawalSignature`; ausencia de midia agora permanece `null`.
- Parser monetario passou a usar normalizacao compartilhada para valores brasileiros e decimais, evitando multiplicacao indevida por 100 em produtos, servicos, estoque e rotas de cadastro.
- Importacao operacional de usuarios passou a aceitar `dataNascimento` ausente ou vazia como `null`, mantendo rejeicao de datas invalidas.
- Storage passou a bloquear criacao de movimentacao de saida acima do saldo quando a movimentacao altera estoque, protegendo qualquer rota contra saldo negativo acidental.

### Validacao

- Testes operacionais adicionados para dinheiro em reais, usuario sem data de nascimento, restore historico sem foto/assinatura falsa e bloqueio de saida manual acima do estoque.

## [2026-07-21] - Importacao PDF de Controle de Materiais pelo fluxo do Registro Rapido

### Corrigido

- Preview do PDF de Controle de Materiais passou a usar os mesmos resolvedores de funcionario/material do Registro Rapido.
- Controle de Materiais foi adicionado ao seletor principal de importacao por PDF.
- Pendencias de funcionario e material agora aparecem em cards de preview com seletores manuais antes da confirmacao.
- Confirmacao do PDF de materiais passou a enviar as linhas resolvidas, revalidar IDs no backend e importar somente registros prontos.
- Importacao historica de materiais continua criando retiradas e movimentacoes com `applyToStock: false`, preservando saldos finais vindos do backup de Estoque.
- Segunda importacao passa a usar fingerprint semantico com unidade, responsavel, data, tipo e itens para evitar duplicidade.
- Pendencias continuam visiveis apos importar registros resolvidos, sem exigir novo upload do PDF.

### Validacao

- Testes operacionais adicionados para preview, pendencia de material, resolucao manual, importacao historica sem alterar saldo e duplicidade semantica.

## [2026-07-21] - Contrato definitivo do backup PDF de Controle de Materiais

### Corrigido

- Controle de Materiais passou a usar um contrato compartilhado em `shared/materialControlBackup.ts` para exportacao, PDF e parser.
- O exportador PDF deixou de montar linhas em formato proprio e passou a imprimir exatamente as linhas operacionais que o parser reconstrói.
- O parser de Controle de Materiais agora devolve `data.rows` e `data.days` no mesmo modelo usado pela exportacao.
- O ciclo automatizado `contrato -> linhas de PDF -> parser -> contrato` foi adicionado aos testes operacionais.
- A estrutura continua compativel com PDFs antigos, mantendo `withdrawals`, `entries` e `consumption`.

### Validacao

- `npx tsc --noEmit --incremental false` passou.
- `npm run test:operational` passou com teste de round-trip do contrato de Controle de Materiais.

## [2026-07-21] - Oficializacao do bootstrap Admin e restore seguro de materiais

### Corrigido

- Bootstrap do Admin foi extraido para servico oficial e idempotente, executado no startup antes de liberar as rotas.
- Banco novo passa a criar `Admin` automaticamente quando `DEFAULT_ADMIN_PASSWORD` estiver configurada, usando bcrypt e sem duplicar usuario.
- Admin legado `admin` e normalizado para `Admin` sem redefinir senha bcrypt existente.
- Resolucao de itens do restore de Controle de Materiais foi centralizada em servico oficial com ID explicito, nome exato e nome normalizado.
- Fingerprint deterministico foi adicionado para registros/movimentos restaurados de Controle de Materiais.
- Movimentos historicos vindos do PDF de Controle de Materiais sao gravados sem reaplicar impacto no saldo, preservando a precedencia do saldo atual restaurado pelo PDF de Estoque.
- Responsavel historico continua sem virar usuario de login e sem gerar `userId=0`.

### Documentacao

- Adicionado `DEPLOYMENT_CHECKLIST.md` com variaveis, migrations, Admin, sessoes, importacao de backups e validacao pos-deploy.

### Validacao

- Testes automatizados foram adicionados para Admin idempotente, resolucao de inventory por nome exato/normalizado, material bloqueado, responsavel historico sem login, fingerprint deterministico e movimento historico sem alterar saldo.

## [2026-07-20] - Restore seguro de Controle de Materiais por PDF

### Corrigido

- O parser de Controle de Materiais agora exige tipo operacional valido para iniciar novo registro, evitando que linhas de continuacao com quantidade sejam tratadas como registros novos.
- Continuidade de itens quebrados na mesma pagina ou entre paginas foi reforcada para casos reais como `Luva de Raspa`, `Impertela 1,05x50`, `Aplicador de PU`, `Suporte de Rolo`, `Viabit Primer (base solvente)` e `Viapol Manta Torodin 4 mm`.
- O preview de Controle de Materiais passou a separar registros completamente aplicaveis, parcialmente aplicaveis, bloqueados e itens nao encontrados.
- A importacao parcial exige confirmacao explicita `IMPORTAR PARCIALMENTE`; o fluxo normal `IMPORTAR` nao aplica registros com itens ausentes.
- A rota de restore passou a registrar `restoredComplete`, `restoredPartial`, `unresolvedItems` e `duplicateRecords`.
- Responsavel historico `Nao trabalha para nos` nao cria conta e nao usa `userId=0`; a retirada usa um usuario de auditoria existente e preserva o nome historico no campo `username`.
- O matching operacional de materiais usa `inventory` como fonte, com nome exato e normalizacao completa segura; `products` permanece apenas como referencia comercial.

### Validacao

- PDFs reais validados em preview local: usuarios/cargos 12 usuarios e 9 cargos; produtos 45; servicos 24; estoque 96; Controle de Materiais 294 declarados, 110 blocos logicos, 78 retiradas, 5 entradas, 27 saidas/consumos e 469 itens.
- Testes operacionais adicionados para continuacao entre paginas e itens reais quebrados.
- Validacoes executadas: `npm install`, `npx tsc --noEmit --incremental false`, `npm run build`, `npm run test`, `npm run test:backup`, `npm run test:operational`, `git diff --check`.

## [2026-07-20] - Preparacao final de producao

### Corrigido

- `server/index.ts` agora configura `trust proxy` em producao para operar corretamente atras de proxy HTTPS como Replit/Vercel/VPS.
- Cookies de sessao passaram a usar `secure=true` automaticamente em `NODE_ENV=production`, mantendo ambiente local sem HTTPS funcional.
- Cookies de sessao agora declaram `sameSite=lax` e preservam `httpOnly`.
- Rotas inexistentes em `/api/*` agora retornam 404 em JSON antes do fallback HTML do frontend.
- A rotina de inicializacao do Admin deixou de redefinir senha bcrypt existente ao normalizar usuario/role; senha so e criada para Admin inexistente ou convertida quando ainda esta em texto legado.

### Validacao

- TypeScript validado com `npx tsc --noEmit --incremental false`.

## [2026-07-20] - Estabilizacao final da importacao PDF operacional

### Corrigido

- A tela de importacao por PDF agora diferencia `Controle de Materiais` de `Movimentacoes de Estoque` nos rotulos de preview, menu e permissoes.
- O preview de PDF agora valida dependencias reais do ERP antes de liberar aplicacao, principalmente usuarios, catalogo de produtos e estoque antes do Controle de Materiais.
- `canApply` passou a representar se o ERP consegue importar com seguranca, e nao apenas se o parser conseguiu ler o PDF.
- Responsaveis historicos marcados como `Nao trabalha para nos` nao geram usuarios automaticamente; ficam registrados como historico no restore de materiais.
- O parser de servicos deixou de descartar duplicidades automaticamente; possiveis duplicados sao avisados para decisao do usuario no preview.

### Interface

- Adicionada secao `Dependencias encontradas` no preview de PDFs, com contagens de encontrados/ausentes e listas copiaveis.
- Pendencias, erros e ignorados passaram a aparecer em painel expansivel por arquivo, sem ocultar registros rejeitados.

### Validacao

- TypeScript validado com `npx tsc --noEmit --incremental false`.
- PDF real de Estoque disponivel localmente validado sem importacao: 96 itens, 0 movimentacoes, 0 pendencias.
- A faixa de quantidade das movimentacoes de estoque ja estava em `540-615`, cobrindo `X~544`.

## [2026-07-20] - Ajuste cirurgico do parser PDF real de materiais

### Corrigido

- `parseMaterials()` agora detecta dinamicamente as colunas do PDF real pelos cabecalhos `Responsavel`, `Itens`, `Tipo`, `Origem/Observacao` e `Status`.
- O parser passou a suportar o layout real com responsavel em `x~46` e itens em `x~142`.
- Linhas quebradas e cabecalhos repetidos entre paginas deixaram de fragmentar registros.
- Medidas como `1,05x50` sao preservadas como parte do nome do produto, sem virar quantidade.
- A regra de confianca passou a comparar os blocos operacionais identificaveis, evitando bloquear quando o total do cabecalho representa outra granularidade do relatorio.

### Validacao

- Preview do PDF real PDF real de Controle de Materiais validado localmente extraiu 110 blocos operacionais: 78 retiradas, 5 entradas e 27 saidas/consumos, sem pendentes.
## [2026-07-20] - Importacao PDF do Controle de Materiais

### Corrigido

- Implementado parser especifico para PDFs `tipo=materiais` gerados pelo ERP.
- A previa agora separa retiradas, entradas e saidas/consumo do Controle de Materiais.
- Linhas quebradas de itens no PDF passam a ser agrupadas no mesmo registro operacional.
- Datas historicas do PDF sao preservadas como data da retirada ou movimentacao.
- Deduplicacao passou a considerar tipo, data, responsavel, itens, quantidades, observacao e hash de origem.
- A rota `/api/backup/restore/materiais` agora aceita `withdrawals`, `entries` e `consumption` e aplica cada grupo pelo fluxo correto.

### Seguranca

- Produtos sem vinculo no estoque nao sao inventados nem gravados com `inventoryId = 0`.
- Responsaveis nao encontrados ficam ignorados no restore com detalhe em `unresolved`.
- Importacao opera em merge seguro e registra origem nas observacoes das movimentacoes.

### Validacao

- Adicionados testes sinteticos para parser de materiais, multiplos itens, quebra de linha, entrada, saida/consumo, status, data historica e duplicidade.
## [2026-07-16] - Criacao da documentacao oficial

### Adicionado

- Criado `PROMPT_MESTRE.md` com as regras permanentes de governanca tecnica do ERP IMPPEL.
- Criado `BACKLOG.md` como fonte oficial de tarefas futuras e pendencias planejadas.
- Criado `CHANGELOG.md` como historico oficial de implementacoes.
- Criado `KNOWN_ISSUES.md` como registro oficial de riscos e problemas conhecidos.
- Criado `ROADMAP.md` como direcao de evolucao do ERP.

### Migrado

- Migradas as fases do plano V.L.A.E.G. de `docs/task_plan.md` para `BACKLOG.md` e `ROADMAP.md`.
- Migrado o log de inicializacao de `docs/progress.md` para este changelog.
- Migrada a informacao de ausencia de descobertas/restricoes de `docs/findings.md` para `KNOWN_ISSUES.md`.

### Preservado

- Os arquivos antigos em `docs/` foram mantidos sem remocao nesta etapa.
- Nenhuma funcionalidade do ERP foi alterada.
- Nenhum schema, dado real, API ou componente foi alterado.

### Validacao

- Projeto sincronizado com `origin/main` antes da criacao da documentacao.
- Esta sprint alterou apenas documentacao.

## [2026-05-13] - Registro historico migrado de docs/progress.md

### Registrado originalmente em docs/progress.md

- Inicializacao: estrutura de pastas e arquivos base criada com sucesso conforme Protocolo 0.
- Status: aguardando respostas da Fase 1 (Visao).

### Observacao

Este registro foi migrado como historico. Ele nao confirma estado funcional atual do ERP em producao.

## [2026-07-16] - Preparacao documental para producao e Vercel

### Adicionado

- Criado `DEPLOYMENT.md` com fluxo de producao, variaveis obrigatorias, banco, Replit, Vercel e checklist pos-deploy.
- Criado `AI_CONTEXT.md` com contexto tecnico e operacional para agentes de IA.

### Documentado

- Registrado que o ERP e full stack: React/Vite no frontend e Express/PostgreSQL no backend.
- Registrado que `npm run build` gera `dist/public` e `dist/index.cjs`.
- Registrado que `npm start` executa `node dist/index.cjs`.
- Registrado que deploy Vercel precisa validar backend Express, APIs, sessoes e banco, nao apenas frontend estatico.
- Registrado que valores reais de variaveis devem ficar apenas em secrets do provedor ou `.env` local ignorado.

### Preservado

- Nenhuma funcionalidade de negocio foi alterada.
- Nenhum schema ou dado real foi alterado.
- Nenhum arquivo antigo de `docs/` foi removido.

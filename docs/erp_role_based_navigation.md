# ERP IMPPEL - Navegacao por funcoes e fluxos

Data: 2026-08-24

## Objetivo

Esta documentacao registra a reorganizacao final da navegacao do ERP IMPPEL por funcoes reais de trabalho, preservando URLs antigas, regras de negocio, banco, APIs e permissoes existentes.

A mudanca e visual e operacional: ajuda cada usuario a entrar pela area que corresponde ao seu papel, sem duplicar dados ou criar modulos paralelos.

## Ordem oficial da sidebar

1. Inicio
2. Marketing & Captacao
3. Atendimento Comercial
4. Orcamentos & Negociacao
5. Planejamento da Obra
6. Execucao & Qualidade
7. Materiais & Equipamentos
8. Financeiro & Administrativo
9. Equipe & Treinamento
10. Pos-venda & Relacionamento
11. Gestao & Configuracoes
12. Backups & Restauracao

Cada grupo pode ser recolhido e so aparece quando ha pelo menos uma permissao visivel para o usuario autenticado.

## Hubs por funcao

Os hubs explicam:

- quem utiliza a area;
- qual e o primeiro passo;
- qual e a sequencia recomendada;
- quais ferramentas compoem a funcao;
- onde consultar a Central Como Trabalhar.

Rotas novas de hub:

- `/marketing`
- `/planejamento-obras`
- `/execucao-qualidade`
- `/materiais-equipamentos`
- `/gestao`
- `/pos-venda-hub`
- `/backups-hub`

Rotas antigas foram preservadas para compatibilidade.

## Sistema Comercial

O Sistema Comercial ficou focado na rotina de venda:

- Visao Geral
- Novos Contatos
- Qualificacao
- Funil
- Follow-ups
- WhatsApp
- Fechados/Perdidos
- Ajuda

Marketing saiu da experiencia principal de vendas e passou para `Marketing & Captacao`.

## Identidade e Conteudo

A tela passou a operar em fluxo por etapas:

1. Marca
2. Padroes
3. Autorizacoes
4. Midias
5. Antes/Depois
6. Templates
7. Gerar material
8. Revisar

O step atual fica salvo localmente no navegador para reduzir repeticao durante a rotina.

## Qualidade das Obras

A tela foi simplificada por abas:

- Visao Geral
- Procedimentos
- Checklists
- Ocorrencias
- Inspecoes

As APIs, validacoes e regras de bloqueio existentes foram preservadas.

## Backup

Backup, Exportacao e Restauracao mantem as mesmas rotas e fluxos, mas a matriz tecnica de cobertura ficou recolhida em `Detalhes tecnicos e cobertura do backup`.

Fluxos principais seguem separados:

- Backup completo tecnico
- Exportacao em PDF
- Restauracao por PDF quando suportada
- Limpeza operacional com confirmacao

## Regras preservadas

- Nenhum schema foi alterado.
- Nenhuma migration foi criada.
- Nenhuma regra de estoque foi alterada.
- Nenhum dado real foi incluido.
- Nenhuma URL antiga foi removida.
- Nenhuma permissao de backend foi relaxada.

## Pendencias operacionais

- Validar a nova navegacao com usuarios reais em desktop e celular.
- Confirmar com a equipe IMPPEL se os nomes dos grupos estao alinhados ao vocabulario interno.
- Manter a Central Como Trabalhar atualizada conforme duvidas reais aparecerem.
- Em sprint futura, avaliar code splitting para reduzir o bundle principal.

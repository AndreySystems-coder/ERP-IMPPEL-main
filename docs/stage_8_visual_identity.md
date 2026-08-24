# Etapa 8 - Padrao Visual da IMPPEL

Data: 2026-08-24

## Objetivo

Criar uma base operacional para capturar, organizar, padronizar, autorizar e reutilizar materiais visuais da IMPPEL sem inventar identidade oficial e sem destruir evidencias tecnicas.

## Implementado

- Tela `Identidade Visual` em `/identidade-visual`.
- Kit visual versionado com status `rascunho`, `em_revisao`, `aprovado` e `arquivado`.
- Padroes configuraveis para fotos e videos por finalidade/fase.
- Registro de autorizacao de imagem por cliente, finalidade, canais, restricoes e status.
- Biblioteca visual para imagens e videos com original preservado, miniatura, derivado, checksum, finalidade, fase e autorizacao.
- Preview simples de composicao antes/depois em SVG, sem alterar imagens tecnicas originais.
- Templates visuais/textuais versionados para WhatsApp, marketing, capa e relatorios.
- Permissoes separadas para visualizar, editar, aprovar, enviar assets, ver originais e gerar materiais.
- Entrada no backup completo pelo modulo tecnico `identidadeVisual`.
- Central Como Trabalhar com guia base de fotos, videos e identidade visual.

## Seguranca

- Upload aceita somente `data URI` base64 com MIME permitido: PNG, JPG, WEBP, GIF, MP4 e WEBM.
- Limite: 5MB para imagens e 25MB para videos.
- Videos ficam com status de processamento externo pendente; o ERP nao simula FFmpeg.
- Original e derivado sao campos separados.
- Uso publico e antes/depois sao bloqueados quando a autorizacao estiver `negado` ou `revogado`.
- Originais nao sao expostos para usuario sem permissao administrativa/visual privada.

## Dependencias externas

- Logo, cores, slogan e conteudo definitivo dependem da aprovacao da IMPPEL.
- Processamento real de video depende de FFmpeg ou servico externo.
- Publicacao Instagram/Meta depende de conta e credenciais oficiais.
- Envio automatico WhatsApp/Waseller continua dependencia externa.
- IA real depende de credencial em variavel de ambiente.

## Limites conhecidos

- O processamento de imagem atual registra e gera preview operacional, mas nao substitui editor profissional.
- Composicao antes/depois usa template simples para validacao operacional.
- A validacao com fotos reais deve ocorrer apenas apos autorizacao dos clientes e backup do ambiente.

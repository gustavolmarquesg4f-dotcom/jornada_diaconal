# Jornada Diaconal — implantação e testes de convite por e-mail

## Estado de entrega (21/10/2026)
- Backend `jornada-convites-api` implantado no Supabase como serviço independente da API `jornada-gestao-api`.
- Migração aditiva `20261021_jornada_user_invites.sql` aplicada, com RLS e RPC acessível apenas a `service_role`.
- Frontend Angular atualizado para mostrar o convite somente quando `/jornada-convites-api/health` sinalizar `email_ready: true`.
- Cadastro manual por senha provisória continua disponível caso falte o serviço de e-mail.
- A função de ativação usa link **de uso único**, com vencimento de 24 h, e permite ao usuário escolher senha própria. Não envia senhas em texto aberto por e-mail.
- A página histórica `ativar-acesso.html` (ativação inicial do administrador) **não foi alterada**. Convites novos usam `convite-acesso.html`.

## Configuração necessária para habilitar disparos automáticos

1. Defina um domínio institucional de envio e verifique-o em um serviço transacional **Resend** (DNS SPF/DKIM conforme orientações do provedor).
2. No projeto Supabase `wscvdtrmplqokceaztrv`, abra Edge Functions → Secrets e cadastre:
   - `RESEND_API_KEY`: chave do serviço Resend, **somente nas secrets**.
   - `JDG_EMAIL_FROM`: remetente permitido do domínio verificado, por exemplo `Jornada Diaconal <acessos@SEU-DOMINIO>`.
3. Nunca armazene esses valores em `frontend/public/config.js`, no repositório GitHub nem no código do navegador.
4. Verifique a URL `https://wscvdtrmplqokceaztrv.supabase.co/functions/v1/jornada-convites-api/health`. A resposta deve apresentar `ok:true` e `email_ready:true`.
5. Faça login como administrador; abra **Usuários e acessos**. Confira indicação de envio automático disponível.
6. Crie um usuário de **teste, autorizado**, com e-mail controlado pela equipe. Marque **Enviar convite por e-mail**, cadastre e confirme o recebimento.
7. Confirme que o link leva a `/jornada_diaconal/convite-acesso.html#token=...`, que a senha é criada e que um segundo uso do mesmo link é recusado.
8. Confirme o login real do novo usuário, suas permissões e a funcionalidade de reenvio, sem compartilhar senhas ou tokens em logs.

## Verificações automatizadas executadas

O workflow `verify-invitations.yml` passou em 21/10/2026, incluindo:
- `deno check` da Edge Function de convites;
- compilação Angular de produção;
- presença dos dois arquivos HTML de ativação;
- API de saúde disponível;
- acesso anônimo ao painel de convites negado com HTTP 401;
- criação de usuário por chamada anônima negada com HTTP 401;
- token malformado negado com HTTP 422;
- verificações estáticas de token expirar em 24h e restrições RPC no SQL.

## Limitações ainda não testadas em produção

- Recebimento de e-mail real: depende da configuração do emissor, ainda não verificada.
- Fluxo completo autenticado: deve ser testado com login autorizado para cada perfil.
- Tempos de carregamento do painel por usuários em Brasília: falta medição comparativa em navegador autenticado antes/depois.
- Confirmação da atualização completa do GitHub Pages: a integração no GitHub não substitui a inspeção do site publicado.

**Segurança:** não usar registros de diáconos reais como dados de teste. Não remover linhas de produção para validar convites.

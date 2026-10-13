# Jornada Diaconal — Gestão e Cuidado

Sistema **Angular 20 + API PHP 8.3 + PostgreSQL 16** para o corpo diaconal da Igreja de Deus no Guará I.

> **Objetivo:** ajudar a construir um corpo diaconal saudável, confiável, conectado e sustentável. Não é um sistema de fiscalização individual. A referência inicial é um responsável para cerca de dez diáconos, ajustável conforme a realidade.

## O que a versão 0.1 oferece

- Login e perfis **admin**, **coordenação** e **responsável por grupo**;
- Cadastro de **diáconos antigos** e **diáconos novos**, status, disponibilidade e contatos;
- Grupos de cuidado com tamanho configurável e responsável designado;
- Vínculo de cada diácono a um grupo (um grupo principal por pessoa);
- Registro objetivo de contatos, retorno previsto e indicação de necessidade de atenção pastoral;
- Painel: cadastrados, sem grupo, contatados nos últimos 30 dias e ativos sem contato registrado;
- Histórico acessível **apenas à equipe autorizada**, respeitando os grupos dos responsáveis.

**Não inclui nesta versão:** importação automática da planilha existente, dados da pesquisa anônima, cobrança, escalas operacionais, WhatsApp automático ou avaliações individuais de espiritualidade. Esses recursos exigem especificação e autorização próprias.

## Estrutura

```
frontend/      # Angular — hospedável no GitHub Pages
api/           # PHP + PDO PostgreSQL — precisa de serviço PHP (ex.: Railway)
api/sql/       # SQL de criação do banco, sem dados reais
.github/       # Publicação Angular via GitHub Actions
```

## Execução local

Requisitos: Node 22+, npm, Docker e Docker Compose.

1. Inicie API + banco: `docker compose up --build -d`.
2. Crie o primeiro administrador (na sua máquina, nunca no GitHub):

   ```bash
   docker compose exec -e ADMIN_EMAIL=admin@seudominio.org -e ADMIN_NAME="Administrador" -e ADMIN_PASSWORD="SENHA-FORTE-12-CARACTERES" api php /var/www/bin/create_admin.php
   ```

3. `cd frontend && npm install && npm start`.
4. Acesse `http://localhost:4200`. API de desenvolvimento: `http://localhost:8080`.

> A senha de exemplo **não** deve ser utilizada de verdade. A configuração local do banco usa credenciais exclusivas do ambiente de desenvolvimento.

## Publicação: GitHub Pages + Railway (produção pendente)

**O GitHub Pages só publica o frontend Angular. PHP e PostgreSQL precisam de hospedagem de servidor.**

1. Crie um repositório dedicado chamado **jornada_diaconal**, preferencialmente público **apenas para o código** (nenhum dado pessoal será incluído).
2. Envie a pasta completa ao repositório; habilite **Settings → Pages → Source: GitHub Actions**.
3. GitHub Actions compila a pasta `frontend/` e publica automaticamente `https://SEU_USUARIO.github.io/jornada_diaconal/`.
4. No Railway, crie um projeto, adicione PostgreSQL e um serviço a partir do **mesmo repositório**. Para o serviço PHP, defina **Root Directory: `/api`**, construtor Dockerfile e porta HTTP **80**.
5. Configure somente no Railway: `DATABASE_URL=${{Postgres.DATABASE_URL}}` (referência da instância PostgreSQL) e `ALLOWED_ORIGINS=https://SEU_USUARIO.github.io`.
6. Execute o SQL `api/sql/001_init.sql` no PostgreSQL do Railway (por console SQL/psql autorizado) e crie o administrador pelo console do container com `ADMIN_EMAIL`, `ADMIN_NAME` e `ADMIN_PASSWORD` definidos **temporariamente**.
7. Gere o domínio HTTPS da API e substitua `apiUrl: ''` em `frontend/public/config.js` por **`https://seu-servico.up.railway.app`**.
8. Faça o commit de `config.js`: o GitHub Actions irá atualizar o site. Teste `GET /health` e login com acesso autorizado.

**Importante:** não armazene credenciais em `config.js`, `.env`, GitHub Actions ou no código versionado. Custos e limites do Railway/PostgreSQL dependem do plano da conta. Revise-os antes de implantar.

## Segurança e proteção de dados

- **A pesquisa anônima de outubro/2026 permanece em outro banco/fluxo e nunca deve ser associada aos nomes do cadastro.**
- Controle de acesso executado no backend; frontend não é barreira de segurança.
- Tokens aleatórios de 256 bits, somente hash armazenado no banco, expiração em 8 h e logout revoga o token.
- Senhas com `password_hash`; cinco erros de login em 15 minutos bloqueiam novas tentativas por identificador e IP.
- CORS somente para origens autorizadas; conexões em produção por HTTPS.
- Os registros de cuidado devem conter **apenas informações necessárias**, sem diagnósticos, detalhes íntimos ou suposições pessoais. Evite registrar dados sensíveis.
- Antes de disponibilizar dados reais: política de acesso, aviso de privacidade, política de retenção e backup, além de validação do modelo de cuidado com a liderança.

## Próximas etapas sugeridas

1. Validar a proposta de responsáveis com o Pr. Sato e definir os primeiros grupos-piloto.
2. Revisar o cadastro original, corrigir duplicidades e confirmar quem está ativo/afastado; só então importar dados autorizados.
3. Testar o acompanhamento com 3 ou 4 grupos e avaliar em 30/60/90 dias.
4. Após validar os processos, estudar módulo de escalas, lembretes e integração com outros sistemas.

Veja `docs/arquitetura.md` e `docs/api.md`.

### Situação de publicação

Este repositório foi criado **privado**. GitHub Pages em repositório privado pode depender do plano e precisa ser ativado nas configurações do repositório. A implantação PHP e PostgreSQL exige hospedagem separada e não deve reutilizar credenciais ou banco da pesquisa anônima. Sem URL HTTPS da API definida em `frontend/public/config.js`, o frontend mostra uma mensagem de configuração pendente, em vez de tentar acessar o computador do visitante.
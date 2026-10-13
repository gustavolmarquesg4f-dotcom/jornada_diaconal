# Arquitetura da versão 0.1

```text
Usuário autorizado (navegador)
   ↓ HTTPS
Angular estático — GitHub Pages
   ↓ HTTPS / Authorization Bearer
API PHP — Railway, Docker PHP-Apache
   ↓ DATABASE_URL privada
PostgreSQL — Railway, banco exclusivo
```

### Papéis

| Recurso | Admin | Coordenação | Responsável |
|---|---|---|---|
| Ver painel e cadastros | Todos | Todos | Só seu(s) grupo(s) |
| Cadastrar diáconos | Sim | Sim | Não |
| Criar grupos e vincular pessoas | Sim | Sim | Não |
| Ver e registrar contatos | Todos | Todos | Só seu(s) grupo(s) |
| Criar usuários | Sim | Não | Não |

**Separação de dados:** nenhum nome, telefone ou registro de cuidado vai para GitHub Pages ou para o repositório de código. O site Angular é público enquanto os dados dependem de autenticação na API.

**Grupo de cuidado:** atribuído por grupo e com limite apenas indicativo. Começar com meta de dez diáconos por responsável; ajustar à realidade. O modelo não pressupõe duplas ou reuniões individuais obrigatórias.

**Indicadores são operacionais, não avaliações de fidelidade ou espiritualidade.** "Sem contato registrado" não significa necessariamente falta de cuidado. Contatos pessoais fora do sistema podem não estar contabilizados.

**Questionário anônimo:** está fora do escopo deste banco e não será identificado ou relacionado a pessoas.

### Itens pendentes para ambiente real

- Autorização da liderança para tratamento dos dados pessoais.
- Lista validada de dirigentes, responsáveis e membros dos grupos.
- Repositório GitHub dedicado e serviço de hospedagem PHP/PostgreSQL.
- Rotina de backups e revisão de retenção dos registros de contato.
- Testes reais de integração e carga após aprovisionar o banco.
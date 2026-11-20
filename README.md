# Integra-Tracker

Aplicação web para acompanhar a execução de um plano de integração numa nova função: registo semanal do trabalho, entregáveis, dashboard de progresso, autoavaliação de competências e lembretes no calendário.

A app é genérica. O conteúdo de cada plano (fases, semanas, blocos de trabalho, recursos, competências e momentos de avaliação) vem de um **ficheiro de modelo** em JSON. Para outra integração ou outro cargo, basta carregar outro modelo.

## O que faz

- **Início:** dia e semana do plano, % concluída, horas feitas vs. previstas, entregáveis, semanas em atraso, gráfico de horas por semana e evolução das competências.
- **Plano:** fases e semanas, com o estado de cada uma.
- **Registo semanal:** objetivo, exercícios, recurso e resumo; para cada bloco, estado, horas e notas; entregável com estado, data e ligação para o ficheiro. Grava automaticamente.
- **Autoavaliação:** grelha de competências (escala do modelo), guardada por momento (por exemplo início, dia 50, dia 100), com comparação.
- **Configuração:** data do dia 1, agenda semanal dos blocos, calendário `.ics` com lembretes, cópia de segurança e exportação do modelo.

Regra usada no progresso: uma semana só conta como concluída quando o entregável está marcado como feito.

## Modos de funcionamento

| Modo | Quando | Onde ficam os dados |
| --- | --- | --- |
| Local | Sem configuração do Supabase | Só no browser onde se usa (bom para experimentar) |
| Supabase | Com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` | Base de dados Supabase da própria pessoa, com login; acessível de qualquer máquina |

## Instalação com Supabase e GitHub Pages

### 1. Supabase (uma vez)

1. Crie um projeto em [supabase.com](https://supabase.com) (de preferência numa região da UE).
2. Em **SQL Editor**, cole e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Cria as tabelas e as regras que garantem que cada utilizador só vê os seus dados.
3. Em **Authentication > Users > Add user**, crie o seu utilizador com email e palavra-passe (marque *Auto Confirm User*).
4. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém mais pode criar conta na sua app.
5. Em **Project Settings > API**, copie o **Project URL** e a chave **anon public**.

A chave *anon* é pública por natureza (vai no código da página); a proteção dos dados é feita pelo login e pelas regras de segurança da base de dados. Nunca use a chave *service_role* na app.

### 2. GitHub Pages

1. No repositório, vá a **Settings > Secrets and variables > Actions > Variables** e crie duas variáveis:
   - `VITE_SUPABASE_URL` com o Project URL;
   - `VITE_SUPABASE_ANON_KEY` com a chave anon public.
2. Em **Settings > Pages**, escolha **Source: GitHub Actions**.
3. Cada `push` para `main` corre os testes e publica a app em `https://<utilizador>.github.io/<repositório>/`.

### 3. Primeiro uso

Abra a app, entre com o seu email e palavra-passe, carregue o ficheiro de modelo do seu plano e escolha a data do dia 1. Depois, em **Configuração**, ajuste a agenda dos blocos e descarregue o calendário `.ics` para o Outlook ou o telemóvel.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # opcional: sem isto, corre em modo local
npm run dev                  # http://localhost:5173
npm test                     # testes
npm run validate-templates -- caminho/para/modelo.json
```

## Criar um modelo de plano

Use [`public/templates/exemplo-integracao.json`](public/templates/exemplo-integracao.json) como ponto de partida. A estrutura está descrita em [`src/lib/types.ts`](src/lib/types.ts) (`PlanTemplate`). Regras principais:

- `weeks` numeradas a partir de 1, sem falhas; cada semana pertence a uma só fase (`weekRange`).
- A soma de `plannedHours` dos blocos é igual a `weeklyHours`.
- `capturePrinciples: true` num bloco faz o registo pedir três princípios úteis.
- `assessmentMoments` indica os dias do plano em que se faz a autoavaliação (dia 1 = data de início).

Valide o ficheiro com `npm run validate-templates -- o-meu-modelo.json` antes de o carregar. A app também o valida e mostra os erros em português.

Os modelos com conteúdo institucional ou pessoal não precisam de estar no repositório: carregam-se a partir de um ficheiro no ecrã inicial.

## Próximas fases

- Resumos de recursos gerados por IA para novos modelos.
- Feedback de IA na revisão de textos e na simulação de reuniões.
- Avaliação dos entregáveis por um agente, em complemento da autoavaliação.

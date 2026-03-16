# Guia de Publicação — Flow

## Pré-requisitos

- Git instalado (`git --version`)
- Conta no GitHub (https://github.com)
- Node 18+ instalado (`node -v`)

---

## PARTE 1 — Criar o repositório no GitHub

1. Acesse https://github.com/new
2. Preencha:
   - **Repository name:** `flow`  ← deve ser exatamente este nome (minúsculo)
   - **Description:** Backlog + GMud manager
   - **Visibility:** Public  ← obrigatório para GitHub Pages gratuito
   - **NÃO** marque "Add a README file"
3. Clique em **Create repository**

---

## PARTE 2 — Enviar o código

No terminal, dentro da pasta do projeto:

```bash
# Inicializar git
git init
git add .
git commit -m "feat: initial Flow setup"

# Conectar ao repositório recém-criado
git remote add origin https://github.com/<SEU_USUARIO>/flow.git

# Enviar para o GitHub
git branch -M main
git push -u origin main
```

> Substitua `<SEU_USUARIO>` pelo seu nome de usuário do GitHub.

---

## PARTE 3 — Ativar GitHub Pages

1. No repositório, clique em **Settings** (aba superior)
2. No menu lateral, clique em **Pages**
3. Em **Source**, selecione **GitHub Actions**
4. Salve

O deploy acontece automaticamente a cada `git push` na branch `main`.

---

## PARTE 4 — Acompanhar o deploy

1. Clique na aba **Actions** do repositório
2. Você verá o workflow **"Deploy Flow → GitHub Pages"** em execução
3. Após ~2 minutos, o status ficará verde ✓
4. A URL do app aparece em **Settings → Pages**

Formato da URL:
```
https://<SEU_USUARIO>.github.io/flow/
```

---

## PARTE 5 — Atualizações futuras

Para publicar uma nova versão:

```bash
git add .
git commit -m "feat: descrição da mudança"
git push
```

O deploy é acionado automaticamente.

---

## ⚠️ Atenção: nome do repositório

O `vite.config.ts` usa `/flow/` como base path em produção.
Se criar o repositório com outro nome (ex: `flow-app`), edite a linha:

```ts
const base = process.env.NODE_ENV === 'production' ? '/flow/' : '/'
```

Troque `/flow/` pelo nome do seu repositório:

```ts
const base = process.env.NODE_ENV === 'production' ? '/flow-app/' : '/'
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Tela em branco após deploy | Verifique se o `base` no `vite.config.ts` bate com o nome do repositório |
| Workflow falhando | Veja os logs em **Actions → deploy.yml** |
| GitHub Pages não aparece | Confirme que **Source = GitHub Actions** em Settings → Pages |
| Push rejeitado | `git pull --rebase origin main` antes de fazer push |

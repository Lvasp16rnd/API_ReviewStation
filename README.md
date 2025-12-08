# API_ReviewStation
Uma API RESTful completa desenvolvida em Node.js para gerenciamento de catálogo de mídias (Filmes, Livros, Jogos) e seu respectivo sistema de avaliações (Reviews).

Esta API é o backend de um aplicativo móvel (Flutter MVVMC), fornecendo endpoints seguros e estruturados para CRUD e agregação de dados.

---

## 🛠️ Tecnologias Utilizadas

* **Linguagem:** JavaScript (Node.js)
* **Framework:** Express.js
* **Banco de Dados:** MongoDB (NoSQL)
* **ORM/Database Toolkit:** Prisma ORM
*  **Autenticação:** JWT (JSON Web Tokens)
*  **Segurança:** Bcryptjs e CORS
* **Versionamento:** Git

---

## ⚙️ Estrutura do Banco de Dados (Modelos Principais)

O projeto é construído em torno de três modelos principais, conectados via Prisma:

| Modelo | Descrição | Relacionamentos |
| :--- | :--- | :--- |
| **`User`** | Armazena dados de usuários e credenciais de acesso. | 1:N com `Review` |
| **`Item`** | O catálogo de mídias (Filmes, Livros, Jogos). Inclui campos flexíveis (`metadata`, `posterUrl`). | 1:N com `Review` |
| **`Review`** | A avaliação em si (nota e texto). É o ponto de intersecção entre `User` e `Item`. | N:1 com `User` e N:1 com `Item` |

---

## 🚀 Como Executar o Projeto Localmente

Siga os passos para configurar e executar a API no seu ambiente de desenvolvimento.

### 1. Pré-Requisitos

* Node.js (versão 16.x ou superior)
* MongoDB instalado localmente ou acesso a um cluster MongoDB Atlas.
* `npm` ou `yarn` instalados.

### 2. Configuração

1.  Clone este repositório:
    ```bash
    git clone [SUA_URL_DO_REPOSITÓRIO]
    cd api_reviewstation
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Crie o arquivo de variáveis de ambiente **`.env`** na raiz do projeto e adicione a URL de conexão do seu MongoDB:
    ```
    # Exemplo de conexão local ou MongoDB Atlas
    DATABASE_URL="mongodb://localhost:27017/reviewstation"
    # OU
    # DATABASE_URL="mongodb+srv://<user>:<password>@<cluster-name>.mongodb.net/<dbname>"
    ```

4.  Gere o Prisma Client e conecte ao DB:
    ```bash
    npx prisma generate
    ```

### 3. Execução

Inicie o servidor em modo de desenvolvimento (usando `nodemon` se estiver configurado): 
    ```
    bash
    npm start
    ```
Ou se estiver usando nodemon
    ```
    npm run dev
    ```
A API estará rodando em http://localhost:3000.

🧭 Endpoints Principais da API
---
Todos os endpoints requerem o header `Content-Type: application/json`.

| Recurso | Método | Endpoint | Status JWT | Descrição da Ação |
| --- | --- | --- | --- | --- |
| **`Autenticação`** | POST | `/auth/login` | Público | 🔑 Login: Autentica o usuário e retorna o JWT. |
| **`Autenticação`** | POST | `/users` | Público | 👤 Cria um novo usuário  |
| **`User`** | PUT | `/users/:id` | **Privado** | ✏️ Atualiza os dados de um usuário existente. Requer Token. |
| **`Item`** | POST | `/item` | Público | ➕ Adiciona uma nova mídia ao catálogo. |
| **`Item`** | GET | `/item` | Público | 📊 Lista o catálogo. Suporta filtros e calcula averageRating. |
| **`Item`** | GET | `/item/:id` | Público | "🔎 Retorna os detalhes de um item, incluindo as reviews recentes." |
| **`Review`** | POST | `/reviews` | **Privado** | ⭐ Cria uma nova avaliação (Review). Requer Token. |
| **`Review`** | PUT | `/reviews/:id` | **Privado** | ✍️ Edita a review. Requer validação de propriedade. |
| **`Review`** | DELETE | `/reviews/:id` | **Privado** | 🗑️ Deleta a review. Requer validação de propriedade. |

---

🔐 Segurança e Autenticação
---

### 1. JSON Web Tokens (JWT)

A rota `/auth/login` emite um JWT válido por 7 dias. Todas as rotas marcadas como Privado implementam o middleware `authenticateToken`, que valida o token no header `Authorization: Bearer <token>`.

### 2. Hash de Senhas

As senhas dos usuários são armazenadas utilizando **Bcryptjs** (salt rounds 10), garantindo que as credenciais nunca sejam armazenadas em texto simples.

### 3. Autorização (Validação de Propriedade)

As rotas de manipulação (`PUT` e `DELETE`) em `/reviews` e `/users/:id` implementam validação de propriedade, garantindo que usuários só possam modificar ou deletar seu próprio conteúdo.

---

👤 ContatoDesenvolvido por: **Lvasp16rnd** - Lucas

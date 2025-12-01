# API_ReviewStation
Uma API RESTful completa desenvolvida em Node.js para gerenciamento de catálogo de mídias (Filmes, Livros, Jogos) e seu respectivo sistema de avaliações (Reviews).

Esta API é o backend de um aplicativo móvel (Flutter MVVMC), fornecendo endpoints seguros e estruturados para CRUD e agregação de dados.

---

## 🛠️ Tecnologias Utilizadas

* **Linguagem:** JavaScript (Node.js)
* **Framework:** Express.js
* **Banco de Dados:** MongoDB (NoSQL)
* **ORM/Database Toolkit:** Prisma ORM
* **Versionamento:** Git

---

## ⚙️ Estrutura do Banco de Dados (Modelos Principais)

O projeto é construído em torno de três modelos principais, conectados via Prisma:

| Modelo | Descrição | Relacionamentos |
| :--- | :--- | :--- |
| **`User`** | Armazena dados de usuários e credenciais de acesso. | 1:N com `Review` |
| **`Item`** | O catálogo de mídias (Filmes, Livros, Jogos). Inclui campos flexíveis (`metadata`). | 1:N com `Review` |
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
Todos os endpoints requerem o header Content-Type: application/json.

| Recurso | Método | Endpoint | Descrição da Ação |
| --- | --- | --- | --- |
| **`User`** | POST | `/users` | 👤 Cria um novo usuário (incluindo reviews aninhadas). |
| **`User`** | GET | `/users` | 🔍 Lista todos ou busca usuários por query parameters. |
| **`User`** | PUT | `/users/:id` | ✏️ Atualiza os dados de um usuário existente. |
| **`User`** | DELETE | `/users/:id` | 🗑️ Deleta um usuário do sistema. |
| **`Item`** | POST | `/item` | ➕ Adiciona uma nova mídia ao catálogo. |
| **`Item`** | GET | `/item` | 📊 Lista o catálogo. Suporta filtros e calcula averageRating. |
| **`Item`** | GET | `/item/:id` | "🔎 Retorna os detalhes de um item, incluindo as reviews recentes." |
| **`Item`** | PUT | `/item/:id` | ⚙️ Atualiza os dados de um item específico.|
| **`Item`** | DELETE | `/item/:id` | 💣 Remove um item e todas as reviews relacionadas. |
| **`Review`** | POST | `/reviews` | ⭐ Cria uma nova avaliação (Review). |
| **`Review`** | GET | `/reviews` | 📑 Busca reviews por itemId ou userId (via query parameters). |
| **`Review`** | PUT | `/reviews/:id` | ✍️ Edita a review. Requer validação de propriedade (userId). |
| **`Review`** | DELETE | `/reviews/:id` | 🗑️ Deleta a review. Requer validação de propriedade (userId). |

---

🔐 Segurança e Autenticação
---
(Nota: Se você planeja adicionar JWT ou Sessions)

Autenticação: (Futuramente, pode ser implementado JWT para gerar um token após o login em /users).
Autorização: As rotas PUT e DELETE em /reviews implementam validação de propriedade `(where: {id: reviewId, userId: userId})` para garantir que usuários não editem o conteúdo de terceiros.

👤 ContatoDesenvolvido por: **Lvasp16rnd** - Lucas

import express from 'express'
import { PrismaClient } from '@prisma/client'
import e from 'express'
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cors from 'cors';

const prisma = new PrismaClient()

// primeira parte da API
// criar, listar, editar e adicionar usuários
const app = express()
app.use(express.json())
app.use(cors());
// informações para a api
// get>listar , post>criar , 
// put>editar varios , patch> editar um
// delete>deletar

// Middleware de Autenticação
function authenticateToken(req, res, next) {
    // Pega o cabeçalho 'Authorization'
    // O Flutter enviará o token no formato: Bearer SEU_TOKEN_AQUI
    const authHeader = req.headers['authorization'];
    // Extrai o token do cabeçalho
    // authHeader é undefined ou 'Bearer token'
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({message: 'Unauthorized access, token not provided'});
    }
    // Verifica se o token é válido
    jwt.verify(token, process.env.JWT_SECRET, (err, userPayload)=> {
    
        if (err) {
            return res.status(403).json({ message: 'invalid token'});
        }
        // Token válido! Adiciona o payload (userId, email) à requisição
        // Isso permite que as rotas subsequentes saibam quem é 
        // o usuário logado
        req.user = userPayload;
        // Continua para a próxima função (o controller da rota)
        next();
    })
}

app.post('/users', async (req, res) => {
    
    const { email, name, age, password, reviews } = req.body;
    
    // Validação de Senha
    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'A senha é obrigatória e deve ter no mínimo 6 caracteres.' });
    }

    try {
        // Cria o hash da senha
        // O '10' é o 'salt rounds', que define a complexidade da criptografia
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Salva o usuário no DB com o HASH
        const newUser = await prisma.user.create({
            data: {
                email: email,
                name: name,
                age: age ? parseInt(age) : undefined,
                password: hashedPassword, // <-- SALVA O HASH
                reviews: {
                    create: reviews || []
                }
            },
            // Não inclua o campo password no retorno, mesmo sendo o hash
            select: {
                id: true,
                email: true,
                name: true,
                age: true,
                reviews: true
            }
        });
        
        res.status(201).json(newUser);
        
    } catch (error) {
        console.log(error);
        // Trata erro de email duplicado (se for o caso) ou outros erros de BD
        res.status(400).json({ message: 'Error creating user. Check if the email is already in use.', error });
    }
});

// Autentica o usuário e emite um JWT
app.post(`/auth/login`, async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password){
        return res.status(400).json({message: 'Email and password are required'});
    }

    try{
        const user = await prisma.user.findUnique({
            where:{ email}
        });
        //Se o usuário não existe
        if (!user){
            return res.status(404).json({message: 'User not found'});
        }

        // Compara a senha fornecida com o hash armazenado
        // bcrypt.compare() retorna true se baterem, false se não
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({message: 'Invalid password'});
        }
        // Gera o JSON Web Token (JWT)
        // O token contém informações essenciais 
        // (payload), como o ID do usuário
        const token = jwt.sign(
            { userId: user.id, email: user.email },// Payload: O que o token carrega
            process.env.JWT_SECRET, // Secret: A chave secreta do .env
            { expiresIn: '7d' } // Expiração: O token é válido por 7 dias
        );
        // Retorna o token e os dados públicos do usuário
        // O Flutter usará o token para todas as requisições autenticadas
        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                age: user.age
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Error authenticating user', error});
    }
});

app.get('/users', async (req, res)=>{
    let usuarios = []
    // a query será uma forma de buscar
    // usuarios com dados especificos
    const { name, email, age, includeReviews } = req.query;

    const searchWhere = {
        name: name,
        email: email,
        age: age ? parseInt(age) : undefined,
    };

    if(req.query){
        usuarios = await prisma.user.findMany({
            where: {
                //aplicando o spread operator para o conteudo
                //ser lido no objeto 'where'
                ...searchWhere,
            },
            include: {
                reviews: includeReviews === 'true',
            }
        })
    }else{
            usuarios = await prisma.user.findMany()
        }

    res.status(200).json(usuarios)
})
// o id representa quem eu irei atualizar,
// pela especificação do id, para puxar
// esse id aleatório será criado uma 
// variavel aqui
app.put('/users/:id', authenticateToken, async (req, res)=>{
    const userIdToUpdate = req.params.id;

    const authenticatedUserId = req.user.userId;
    // O ID da URL DEVE ser igual ao ID do Token
    if (userIdToUpdate !== authenticatedUserId) {
        return res.status(403).json({ message: 'Acesso negado. Você só pode editar seu próprio perfil.' });
    }
    
    const {email, name, age} = req.body;
    dataToUpdate = {};

    if (name) dataToUpdate.name = name;
    if (age) dataToUpdate.age = parseInt(age);
    if (email) dataToUpdate.email = email;
    // Se a senha for enviada, ela deve ser criptografada
    if (password) {
        const salt = await bcrypt.genSalt(10);
        dataToUpdate.password = await bcrypt.hash(password, salt);
    }
    // Evita uso do banco se não houver dados para atualizar
    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ message: 'At least one field to update is required' });
    }

    try{
        const updatedUser = await prisma.user.update({
        // condição para busca da query
        // passa o paramentro indentificador
        // o id, nesse caso referente ao
        //usuário
        where: { id: userIdToUpdate }, // Onde o ID é o mesmo do token
            data: dataToUpdate,
            select: { // Retorna apenas os dados públicos
                id: true,
                email: true,
                name: true,
                age: true,
            }
    });
    res.status(200).json(updatedUser)

    }catch(error){
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Email already in use' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(error)
        res.status(404).json({message: 'Error updating user', error})
    }
    res.status(201).json(req.body)
})

app.delete('/users/:id', authenticateToken, async (req, res)=>{
    const userIdToDelete = req.params.id;
    const authenticatedUserId = req.user.userId;

    if (userIdToDelete !== authenticatedUserId) {
        return res.status(403).json({message: 'Access denied. You can only delete your own profile.'});
    }

    try{
        // Deletar as reviews associadas
        await prisma.review.deleteMany({
        where:{
            userId: userIdToDelete,
        }
    });
        // Deletar o usuário
        await prisma.user.deleteMany({
        where:{
            userId: userIdToDelete,
        }
    });
    res.status(200).json({message:'User deleted successfully'})
    }catch(error){
        if (error.code === 'P2025') {
            return res.status(404).json({message: 'User not found'});
        }
        console.log(error);
        res.status(404).json({message: 'Error deleting user', error});

    }
    
    res.status(200).json({message:'User deleted successfully'})
})

app.post('/reviews', authenticateToken, async (req, res)=>{
    // Obter o ID do usuário de forma segura a partir do token
    const authenticatedUserId = req.user.userId;
    const { itemId, rating, text } = req.body;

    if(rating == undefined ||rating == null || rating < 1 || rating > 5){
        return res.status(400).json({message: 'Rating must be between 1 and 5'})
    }

    try{
        const newReview = await prisma.review.create({
            data:{
                itemId: itemId,
                userId: authenticatedUserId, // USO SEGURO DO ID
                rating: rating,
                text: text
                },
            include:{
                item: {select:{title: true, type: true}},
                user: {select:{name: true, email: true}}
            }
        })
        res.status(201).json(newReview)
    }catch(error){
        console.log(error)
        res.status(500).json({message: 'Error creating review, \nverify if the user and item ID are correct', error})
    }
    res.status(201).json({message:'Review created successfully'});
});

app.get('/reviews', async (req, res)=>{
    const {itemId, userId} = req.query;
    // criando filtro dinamico
    const where = {};
    if(itemId){
        where.itemId = itemId;
    }
    if(userId){
        where.userId = userId;
    }
    if(!itemId && !userId){
        // se nenhum filtro for passado, evitar listar reviews 
        return res.status(404).json({message: 'set an itemId or userId to search for reviews'})
    }
    try{
        //Busca no Prisma, ordenando pela mais recente e incluindo o nome do usuário
        const reviews = await prisma.review.findMany({
            where: where,
            orderBy: {createdAt: 'desc'}, //ordem por recente
            include:{
                //inclui somente o nome do usuario da review
                user: {select:{name: true}}

            }
    });
    res.status(200).json(reviews);
    }catch(error){
        console.log(error)
        res.status(500).json({message: 'Error getting reviews', error})
    }
});

app.put('/reviews/:id', authenticateToken, async (req, res)=>{

    const reviewId = req.params.id;
    const authenticatedUserId = req.user.userId;
    const {rating, text} = req.body;

    if(!userId || (!rating && !text)){
        return res.status(400).json({message:'userId and (rating or text) are required'});
    }

    const dataToUpdate={};
    if(rating!== undefined){

        const parsedRating = parseInt(rating);
        if(parsedRating < 1 || parsedRating >5){
            return res.status(400).json({message: 'Rating must be between 1 and 5'});
        }
        dataToUpdate.rating = parsedRating;
    }
    if(text !== undefined){
        dataToUpdate.text = text;
    }

    try {
        const updatedReview = await prisma.review.update({
            where:{
                id: reviewId,
                userId: authenticatedUserId
            },
            data: dataToUpdate,

            include:{
                item: {select:{title: true}},
                user: {select:{name: true}}
            }
        });
        res.status(200).json(updatedReview);
    } catch (error){

        if (error.code === 'P2025'){
            return res.status(404).json({message: 'Review not found'});
        }
        console.error(error);
        res.status(500).json({message: 'Error updating review', error});
    }

});

app.delete('/reviews/:id', authenticateToken, async (req, res)=>{
    const reviewId = req.params.id;

    const authenticatedUserId = req.user.userId;

    try{
        await prisma.review.delete({
            where:{
                id: reviewId,
                userId: authenticatedUserId
            }
        });
        res.status(200).json({message: 'Review ${reviewId} deleted successfully'});
    } catch (error){
        if (error.code === 'P2025'){
            return res.status(404).json({message: 'Review not found'});
        }
        console.error(error);
        res.status(500).json({message: 'Error deleting review', error});
    }
});

//Adiciona um novo item (filme, livro, etc.) ao catálogo
app.post('/item', async (req, res)=>{

    const {title, description, type, releaseYear, genre, metadata}= req.body;
    //'title' e 'type' são obrigatórios, logo, validamos para 
    // garantir que o título e o tipo foram fornecidos
    if (!title || !type){
        return res.status(400).json({message: 'Title and type are required'});
    }

    try{
        // Criar novo registro na tabela Item
        const newItem = await prisma.item.create({
            data:{
                title: title,
                //Campos opcionais só são incluídos se existirem
                description: description || null,
                type: type.toUpperCase(), // Ex: 'movie', 'book', 'game
                // coverter Int se o ano for fornecido
                releaseYear: releaseYear ? parseInt(releaseYear) : null,
                metadata: metadata || null,
                genre: genre || null,
                // O campo 'averageRating' e 'reviews' são manipulados
                // por outras rotas/default, não aqui.
            },
        });
        res.status(201).json(newItem);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Error creating item', error});
    }
})

app.get('/item', async (req, res)=>{
    //Pega os parâmetros de filtro da URL
    const { type, releaseYear, searchTitle }= req.query;

    const where = {};
    if (type){
        // converte para o ENUM as letras em Maiusculas
        where.type = type.toUpperCase();
    }
    if (releaseYear){
        where.releaseYear = parseInt(releaseYear);
    }
    if (searchTitle){
        //Busca parcial (case-insensitive) no título
        where.title= {contains: searchTitle, mode: 'insensitive'};
    }

    try{
        //Busca no Prisma: Retorna os Itens e INCLUI 
        //todas as reviews (apenas o campo rating)
        const items = await prisma.item.findMany({
            where: where, 
            orderBy: {releaseYear: 'desc'}, //Ordena por ano de lançamento
            include:{
                //Inclui a lista de reviews de cada item
                reviews: {
                    select:{
                        rating: true,                           
                }
            }
        }
    });
    //Mapeia a resposta para calcular a média e formatar o JSON
    const formattedItems= items.map(item =>{
        // Lógica de Cálculo da Média
        const totalRatings = item.reviews.length;
        const sumRatings = item.reviews.reduce((sum, review)=> sum + review.rating, 0);
        // Média (ou 0 se não houver reviews)
        const averageRating= totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : 0;
        //Remove o array 'reviews' do objeto final antes de enviar (limpeza do payload)
        const {reviews, ...itemData} = item;

        return {
            ...itemData,
            averageRating: parseFloat(averageRating),
            totalReviews: totalRatings,
        };
    });
    res.status(200).json(formattedItems);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Error getting items', error});
    }
});
// Busca um item específico pelo ID.
// Exemplo: http://localhost:3000/item/65b4c4f0d3a5e8f4c0a1b2c3
app.get('/item/:id', async (req, res)=>{
    const itemId = req.params.id;

    try{
        // Busca no Prisma, incluindo todas as reviews 
        // e dados do usuário que as fez
        const item = await prisma.item.findUnique({
            where: {
                id: itemId,
            },
            include:{
                // Inclui todas as reviews do item. Podemos 
                // limitar a quantidade (e.g., take: 5) 
                reviews:{
                    orderBy:{ createdAt: 'desc'},
                    include:{
                        //Inclui o nome do usuário que fez a review
                        user:{
                            select:{id: true, name: true, email: true}
                        }
                    }
                }
            }    
        });
        // Verifica se o item foi encontrado
        if(!item){
            return res.status(404).json({message: 'Item ${itemId} not found'});
        }
        // Cálculo da Média e Formatação da Resposta (similar ao GET /item)
        const totalRatings = item.reviews.length;
        const sumRatings = item.reviews.reduce((sum, review)=> sum + review.rating, 0);
        const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : 0;
        // Separa as reviews para incluí-las separadamente na resposta formatada
        const reviews = item.reviews;
        const {reviews: _, ...itemData} = item; //// Usa destructuring para remover o array 'reviews' original
        
        const formattedItem = {
            ...itemData,
            averageRating: parseFloat(averageRating),
            totalReviews: totalRatings,
            // Adiciona as reviews formatadas
            reviews: reviews.map(review => ({
                id: review.id,
                rating: review.rating,
                text: review.text,
                createdAt: review.createdAt,
                author: {
                  id: review.user.id, // Garante que o ID do usuário está presente
                  fullName: review.user.name, // Mapeia para o nome do Prisma
                  email: review.user.email, // Mapeia para o email do Prisma
                }
            }))
        };
        // Retorna os detalhes do item formatado
        res.status(200).json(formattedItem);
    } catch (error){
        console.error(error);
        res.status(500).json({message: 'Error getting item', error});
    }
});
// Permite atualizar os dados de um item específico (Restrita a Admins na prática).
app.put('/item/:id', authenticateToken, async (req, res)=>{
    const itemId = req.params.id;
    // Desestruturar os campos do corpo da requisição
    const {title, description, type, releaseYear, genre, metadata} = req.body;
    // Constrói o objeto 'data' com apenas os campos fornecidos
    const dataToUpdate = {};

    if (title !== undefined){
        dataToUpdate.title = title;
    }
    if (description !== undefined){
        // Se a descrição for uma string vazia, 
        // pode-se tratar como null no DB
        dataToUpdate.description = description || null;
    }
    if (type !== undefined){
        dataToUpdate.type = type.toUpperCase();
    }
    if (releaseYear !== undefined){
        dataToUpdate.releaseYear = parseInt(releaseYear);
    }
    if (genre !== undefined){
        dataToUpdate.genre = genre;
    }
    if (metadata !== undefined){
        // Passa o objeto JSON completo para o campo metadata
        dataToUpdate.metadata = metadata;
    }
    // Se o objeto de atualização estiver vazio, não há nada para fazer
    if (Object.keys(dataToUpdate).length === 0){
        return res.status(400).json({message: 'At least one field to update is required'});
    }
    try{
        // Atualiza o item no banco de dados
        const updateItem = await prisma.item.update({
            where:{
                id: itemId,
            },
            data: dataToUpdate,
        });
        // Retorna o item atualizado
        res.status(200).json(updateItem);
    } catch (error) {
        // O erro P2025 é lançado se o ID do item não for encontrado
        if (error.code === 'P2025'){
            return res.status(404).json({message: 'Item ${itemId} not found'});
        }
        console.error(error);
        res.status(500).json({message: 'Error updating item', error});
    }
});
//Permite remover um item do catálogo (Restrita a Admins na prática).
app.delete('/item/:id', authenticateToken, async (req, res)=>{
    const itemId = req.params.id;

    try{
        await prisma.review.deleteMany({
            where:{
                itemId: itemId,
            }
            });
        
            await prisma.item.delete({
                where:{
                    id: itemId,
                }
            });
            res.status(200).json({message: 'Item ${itemId} deleted successfully'});
    } catch (error){
        // Erro P2025 caso o ID do item não for encontrado
        if (error.code === 'P2025'){
            return res.status(404).json({message: 'Item ${itemId} not found'});
        }
        console.error(error);
        res.status(500).json({message: 'Error deleting item', error});
    }
});

// Seguindo a issue de Health Care Center
// para atualizações de saúde na api
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(3000)

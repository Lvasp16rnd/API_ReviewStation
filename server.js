import express from 'express'
import { PrismaClient } from '@prisma/client'
import e from 'express'

const prisma = new PrismaClient()

// primeira parte da API
// criar, listar, editar e adicionar usuários
const app = express()
app.use(express.json())
// informações para a api
// get>listar , post>criar , 
// put>editar varios , patch> editar um
// delete>deletar

app.post('/users', async (req, res)=>{
    
    try{
        const newUser = await prisma.user.create({
            data:{
                email: req.body.email,
                name: req.body.name,
                age: req.body.age,
                reviews: {
                    create: req.body.reviews || []
                }
            },
            include:{
                reviews: true
            }
        })
        res.status(201).json(newUser)
    }catch(error){
        console.log(error)
        res.status(400).json({message: 'Error creating user', error})
    }
})

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
app.put('/users/:id', async (req, res)=>{
    
    const {email, name, age, reviews} = req.body;

    try{
        const updatedUser = await prisma.user.update({
        // condição para busca da query
        // passa o paramentro indentificador
        // o id, nesse caso referente ao
        //usuário
        where:{
            id: req.params.id
        },
        data:{
            email: email,
            name: name,
            age: age
        }
    })
    res.status(200).json(updatedUser)

    }catch(error){
        console.log(error)
        res.status(404).json({message: 'Error updating user', error})
    }
    

    res.status(201).json(req.body)
})

app.delete('/users/:id', async (req, res)=>{
    try{
        await prisma.user.delete({
        where:{
            id: req.params.id
        }
    })
    res.status(200).json({message:'User deleted successfully'})
    }catch(error){
        console.log(error)
        res.status(404).json({message: 'Error deleting user', error})

    }
    
    res.status(200).json({message:'User deleted successfully'})
})

app.post('/reviews', async (req, res)=>{

    const {itemId,userId, rating,text,} = req.body;

    if(rating == undefined ||rating == null || rating < 1 || rating > 5){
        return res.status(400).json({message: 'Rating must be between 1 and 5'})
    }

    try{
        const newReview = await prisma.review.create({
            data:{
                itemId: itemId,
                userId: userId,
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

app.put('/reviews/:id', async (req, res)=>{
    const reviewId = req.params.id;
    const {userId, rating, text} = req.body;

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
                userId: userId
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

app.delete('/reviews/:id', async (req, res)=>{
    const reviewId = req.params.id;

    const {userId}= req.body;

    if (!userId){
        return res.status(400).json({message: 'userId is required'});
    }

    try{
        await prisma.review.delete({
            where:{
                id: reviewId,
                userId: userId
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
                            select:{name: true}
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
                userName: review.user.name, // Pega o nome do usuário aninhado
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
app.put('/item/:id', async (req, res)=>{
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
app.delete('/item/:id', async (req, res)=>{
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

app.listen(3000)

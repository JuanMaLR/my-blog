//Entry point for our app
//Create really simple express server that just sends us a response when we send it a request
//Import express server
import express from 'express';
//Import body parser
import bodyParser from 'body-parser';
//Install mongodb npm package "npm install --save mongodb"
//This allow us to connect to and modify (make queries) our DB from our Express server
//Import it
import MongoClient from 'mongodb';
//Import path so we can tell our server where to serve static files from
import path from 'path';

//Fake data to be used instead of a database. It is a JSON object. 
//The names are the same as our articles in our frontend
//Add a new property that will keep track of the comments a user does to an article
//Once DB is running, comment this fake data
/*const articlesInfo = {
    'learn-react': {
        upvotes: 0,
        comments: [],
    },
    'learn-node': {
        upvotes: 0,
        comments: [],
    },
    'my-thoughts-on-resumes': {
        upvotes: 0,
        comments: [],
    },
}*/

//Create backend app
const app = express();

//Required when passing into production mode (uploading to AWS)
//Tell server how to serve static files (like images)
app.use(express.static(path.join(__dirname, '/build')));

//It MUST be added above our routes
//This will parse the json object we've included in the request body and 
//it adds a body property to the request param of the matching route so that we can extract it from it
app.use(bodyParser.json());

//Function to enhance code reusability and prevent repetition
//It will create the connection with the DB and terminate it once the changes (queries) are made
//The particular changes (getting or updating info) will be passed as a parameter to the function
//This means we will pass a function (which we'll call operation) as an argument to our function
//We should also pass the res variable so that we can send a response back to the user
const withDB = async (operations, res) => {
    try {
        //Connect
        const client = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
        const db = client.db('my-blog');

        //After establishing a connection with our DB we call our function
        //and pass the recently created db object, so that it can be used internally
        //Await is used because the operations function (code inside my withDB call in my endpoint) is async
        await operations(db);

        //Disconnect
        client.close();        
    } catch(error){
        res.status(500).json({ message: 'Error connecting to db', error });
    }
}

//After we have our app, we now define different endpoints and what task will be executed when an endpoint is hit
//1.- When our app recieves a GET request in our /hello endpoint it responds with a message saying hello
//Second parameter is a callback that recieves two parameters.
//One is a request object (req) which contains details of the request we just receive 
//The other is a response object (res) which we use to send a response back to whoever send the request
//res.send sends a request back to whoever hit the endpoint 
//app.get('/hello', (req, res) => res.send('Hello!'));

//Using URL parameters
//app.get('/hello/:name', (req, res) => res.send(`Hello ${req.params.name}!`));

//Test post request
//Install new module called body parser. This allows our server to extract the JSON data send along with our request
//In terminal type "npm install --save body-parser"
//app.post('/hello', (req, res) => res.send(`Hello ${req.body.name}!`));

//Route to get the associated information from an article 
//Add async keyword to callback because we used await inside it. It is required for everything to work properly
app.get('/api/articles/:name', async (req, res) => {
    //Without reusability (function that connects and disconnects from DB)
    //Protect everything in a try-catch blog in case something goes wrong with a DB operation
    /*try {
        //Get article name from URL parameters 
        const articleName = req.params.name;

        //Connect to our DB
        //Second argument is an options object (it allows us to change some connection configuration)
        //It is mandatory that we pass the useNewUrlParser attribute (deprecated), now use useUnifiedTopology
        //This connection is async and it returns a promise (a client object from which we can query the db)
        //So we can use JS ES6 async - await which simplifies handling this functions 
        const client = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
        //To query mongodb DB create a db object
        //First argument is database name
        const db = client.db('my-blog');

        //Now, we query the DB for the required article
        //We must use await because reading from DB is always async
        //First argument is collection name 
        //Find one returns one element that matches the criteria specified inside the {}
        const articlesInfo = await db.collection('articles').findOne({ name: articleName });
        //Once we have it, we send it in a response
        //json is the same as send, but it handles JSON data better
        res.status(200).json(articlesInfo);

        //Close the DB connection
        client.close();        
    } catch(error){
        //Send response to the client saying something went wrong
        //500 -> Internal server error
        //Send a custom message and the error itself
        res.status(500).json({ message: 'Error connecting to db', error });
    }*/

    //With reusability (function that connects and disconnects from DB)
    //Wrap up our code inside a call (using arrow functions) to our withDB function
    //WithDB is a function that receives a function as a parameter
    //Here we pass a function to withDB using arrow functions
    //The function performs a specific query to the DB
    //In order to perfom the query, the instructions need db object 
    //This db object is defined before the arrow here and it corresponds to the 
    //argument being passed to the operations function call inside my withDB function
    withDB(async db => {
        const articleName = req.params.name;

        const articlesInfo = await db.collection('articles').findOne({ name: articleName });
        res.status(200).json(articlesInfo);
    }, res);
    //We pass the res variable as another parameter. So, in total, we have 1 function and 
    //1 variable as function parameters 
});

//Endpoint to update the number of upvotes (likes) in our articles
app.post('/api/articles/:name/upvote', async (req, res) => {
    //Without reusability (function that connects and disconnects from DB)
    //Wrap everything in a try-catch blog
    /*try{
        //Get the name of the article we want to upvote
        const articleName = req.params.name;

        //Without DB 
        //Search in our fake DB for the corresponding article and update the number of votes
        //articlesInfo[articleName].upvotes += 1;
        //Just for development purposes tell the user the current number of upvotes
        //Status -> to tell everything went okay. Send -> to send a message to the user
        //res.status(200).send(`${articleName} now has ${articlesInfo[articleName].upvotes} upvotes!`);

        //With DB
        //Connect
        const client = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
        const db = client.db('my-blog');
        //Queries
        //First we find in the DB the corresponding article
        const articleInfo = await db.collection('articles').findOne({ name: articleName });
        //Now, we make a query to update the number of upvotes 
        //Second argument are the actual updates that we want to apply to the object
        //Mongodb syntax is as follows:
        await db.collection('articles').updateOne({ name: articleName }, {'$set': {
            upvotes: articleInfo.upvotes + 1
            },
        });

        //Finally, we return the updated version of the recently modified article
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });
        //Send update information to the client
        res.status(200).json(updatedArticleInfo);

        //Close DB
        client.close();
    } catch(error) {
        res.status(500).json({ message: 'Error connecting to db', error });
    }*/

    //With reusability (function that connects and disconnects from DB)
    withDB(async db => {
        const articleName = req.params.name;
        const articleInfo = await db.collection('articles').findOne({ name: articleName });
        await db.collection('articles').updateOne({ name: articleName }, {'$set': {
            upvotes: articleInfo.upvotes + 1
            },
        });
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });
        res.status(200).json(updatedArticleInfo);
    }, res);
});

//Route that will be in charge of updating the comments to an article
//We define the JSON body structure first, then implement how to make the request
app.post('/api/articles/:name/add-comment', (req, res) => {
    //Without reusability (function that connects and disconnects from DB) and DB 
    //Extract information from the body
    /*const { username, text } = req.body;
    //Get the article name from our URL 
    const articleName = req.params.name;
    //Add the information to our fake DB
    articlesInfo[articleName].comments.push({username, text}); 
    //Just for development purposes we send back a response (the updated article info)
    res.status(200).send(articlesInfo[articleName]);*/

    //With reusability (function that connects and disconnects from DB) and DB 
    withDB(async db => {
        const { username, text } = req.body;
        const articleName = req.params.name;
        //Get the matching article
        const articleInfo = await db.collection('articles').findOne({ name: articleName });
        //Update DB
        await db.collection('articles').updateOne({ name: articleName }, {'$set': {
            //Concat appends to the end of an array
            comments: articleInfo.comments.concat({ username, text })
        }, });
        //Return updated article to the user 
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName });
        res.status(200).json(updatedArticleInfo);
    }, res);
});

//Also required when passing into production mode (uploading to AWS)
//This tells our app that any other endpoints (URLs) that get typed and that are not above
//will reroute them to my frontend (because it most likely will match with an endpoint there)
app.get('*', (req, res) => {
    //Dirname has the current directory path 
    res.sendFile(path.join(__dirname + '/build/index.html'));
});

//Just start our server
//As a first argument it takes the port in which it should be listening
//As a second argument it takes a callback that is called once the server is actually listening (we'll just log a message to the console)
app.listen(8000, () => console.log('Listening on port 8000'));

//Finally, on the console we type "npx babel-node src/server.js" to tell node js to run our express server 
//ROUTER

const express = require("express");
const router = express.Router();
const bodyParser = require('body-parser');

const ressourceName = "router";

router.use(function  (req, res, next) {
	console.log("Admins Route Time Log", Date.now());
	next();
});

app.get('/resetDb', function (req, res) {
	console.log('Setting up initial Data');
	db.del([OBJEKTLIST, USERLIST, OBJEKT_INDEX, USER_INDEX], function (err, reply) {
    	console.log("DB Clean! " + reply);




    	var objekt0 = {
        	"id": 001
        	, "title": "World of Warcraft INSTALLATIONSCD1"
        	, "description": "World of Warcraft is a massively multiplayer online role-playing game released in 2004 by Blizzard Entertainment."
        	, "tags": ["WOW", "Horde", "Allianz", "Arthas"]
        	, "comments": [{
            	"userId": 0
            	, "text": "Tolles Spiel"
            	, "timestamp": 1500298801
        	}, {
            	"userId": 1
            	, "text": "Finde ich nicht so gut"
            	, "timestamp": 1500298801
        	}]
        	, "uploaded": 1500298801
        	, "uploader": 0
    	};

    	var objekt1 = {
        	"id": 002
        	, "title": "Das Beispielbuch"
        	, "description": "Ein Autor bietet zum Beispiel ein Buch als Druck- und als Download-Format an.."
        	, "tags": ["Buch", "Autor", "Papier"]
        	, "comments": [{
            	"userId": 0
            	, "text": "Das andere Video hat mir besser gefallen!"
            	, "timestamp": 1500298801
        	}, {
            	"userId": 1
            	, "text": "Glaube ich nicht"
            	, "timestamp": 1500298801
        	}, {
            	"userId": 0
            	, "text": "Doch, ganz sicher!"
            	, "timestamp": 1500298801
        	}]
        	, "uploaded": 1500298801
        	, "uploader": 1
    	};

    	var objekt2 = {
        	"id": 003
        	, "title": "Systemprogrammierung in Unix/ Linux"
        	, "description": "Grundlegende Betriebssystemkonzepte und praxisorientierte Anwendungen"
        	, "tags": ["Buch", "Autor", "Papier"]
        	
    	};

    	var objekt2 = {
        	"id": 004
        	, "title": "Programmierung in C und Java"
        	, "description": "Erste Schritte in der Programmierung"
        	, "tags": ["Buch", "Autor", "Papier"]
        
    	};

    	var paramsVideo = [OBJEKTLIST, JSON.stringify(objekt0), JSON.stringify(objekt1)];
    	db.rpush(paramsVideo, function (err, reply) {
        	console.log("Added Objekts! Reply: " + reply);
    	});

    	var user0 = {
        	"id": 0
        	, "username": "Mark"
        	, "email": "mschwott@fh-koeln.de"
        	, "password": "mark1"
    	};
   	 
    	var user1 = {
        	"id": 1
        	, "username": "Gerald"
        	, "email": "Gerald@localhost.de"
        	, "password": "gerald1"
        };


// Implementierung POST auf "/users"
router.post('/', bodyParser.json(), function (req, res) {
	console.log(req.body);
	res.status(200).json( { uri: req.protocol+ "://" + req.headers.host +"/" + ressourceName+ "/" + req.body.id } );
});

router.put("/", function (req, res) {
	res.send("PUT /users")
})


// DELETE Request auf Pfad "/users"
router.delete('/', function (req, res) {
	res.send("DELETE /users")
})

// Definition GET auf "/users/:userID"
router.get("/:userId", function (req, res) {
	res.send("Auflistung eines Adims mit der ID: " +req.params.userId);
});


module.exports = router;


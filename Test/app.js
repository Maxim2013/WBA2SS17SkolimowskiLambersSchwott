var express = require('express');  //Express importieren
var bodyParser = require('body-parser');
var redis = require('redis');
var http = require('http');
var fs = require('fs');

var client = redis.createClient();


var app = express();  //express wird hier an diesem Programm gebunden
var jsonParser = bodyParser.json();

const settings = {
	port: 6379,
	
};

// Hier wird der Port aufgerufen
app.listen(settings.port, function() {
	console.log("Der Dienstgeber ist nun auf Port " +settings.port+ " verfügbar. ");
});


//ROUTING

//binden des Pfades an eine Konstante
const users = require('./users.js');

//express sagen er soll diese Route an die App binden
app.use("/users", users)


// GET Request auf Pfad "/"
app.get("/", function (reg, res) {
	res.send('Server läuft');
});

// POST Request auf Pfad "/"
app.post("/", function (req, res) {
	res.send("POST");
});

app.get("/", function (req, res) {
	res.send("Test");
});

app.delete("/", function(res, res) {
	res.send("Gelöscht");
});


//möglicher Fehlermeldung
app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.end(err.status + ' ' + err.messages);

});



// log mit Pfad und Zeitangabe für jeden Request-Pfad
app.use(function ( req, res, next) {
	console.log('Time: %d ' + ' Request-Pfad: ' + req.path, Date.now());
	next();
}); 











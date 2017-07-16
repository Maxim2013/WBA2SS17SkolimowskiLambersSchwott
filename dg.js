var express = require('express');
var bodyParser = require('body-parser');
var redis = require('redis');
var http = require('http');
var faye = require('faye');

var client = new faye.Client('http://localhost:7000/faye');

var app = express();
var jsonParser = bodyParser.json();

const settings = {
	port: 8000,
};

//möglicher Errorhandler
app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.end(err.status + '' + err.message);
});

// log mit Pfad und Zeitangabe für jeden Request-Pfad
app.use(function ( req, res, next) {
	console.log('Time: %d' + ' Request-Pfad: ' + req.path, Date.now());
	next();
});

// Hier wird der Port aufgerufen
/*app.listen(settings.port, function() {
	console.log("Der Dienstgeber ist nun auf Port" + settings.port+ "verfügbar.");
});
*/

//ROUTING

//binden des Pfades an eine Konstante
const index = require('./index.js');

//express sagen er soll diese Route an die App binden
app.use("/index.js", index)



// GET Request auf Pfad "/"
app.get("/", function (reg, res) {
	res.send('Server läuft');
});

// POST Request auf Pfad "/"
app.post("/", function (req, res) {
	res.send("POST")
})

app.put("/admins", function (req, res) {
	res.send("PUT /admins")
})

app.delete("/admins", function (res, res) {
	res.send("DELETE /admins");
})

app.listen(settings.port, function() {
	console.log("Express App läuft auf Port " + settings.port);
});






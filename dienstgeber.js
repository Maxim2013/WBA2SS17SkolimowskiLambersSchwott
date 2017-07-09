// Module werden eingebunden
var express = require('express');
var bodyParser = require('body-parser');
var redis = require('redis');
var http = require('http');

//var client = redis.createClient();
var connect = require('connect');
var server = connect().


//jsonParser anlegen (ist ein Teil der bodyParser und deswegen nicht mit require) und gibt einen Parser zurück, der mit Json-Daten arbeitet
var jsonParser = bodyParser.json();

// In App werden die Methoden von Express eingebunden
var app = express();

// App benutzt JSON-Parser
app.use(bodyParser.json());

// Ressource: Kameras

app.get("/admins", function AlleAdministratorenAusgeben(req, res){
    client.keys('admins:*', function(err, rep){
        var admins = [];

        if(rep.length == 0) {
            res.json(admins);
            return;
        }

        client.mget(rep, function(err, rep){
           rep.forEach(function(val){
               admins.push(JSON.parse(val));
           });

            admins = admins.map(function(kameras){
        
                return {ID: admins.id, Name: admins.name, Studiengang: admins.studiengang, Semester: admins.semester, Funktion: admins.funktion}; //Ein String
            });
            res.json(admins);
        });
    });
});


app.post('/admins', jsonParser, function (req, res){
      var newAdmin = req.body;

        client.incr('id:admins', function(err, rep){
            newAdmin.id = rep;                                // eine id wird zugewiesen
            client.set('admins:' + newAdmin.id, JSON.stringify(newAdmin), function(err, rep){
                res.json(newAdmin);
            });
        });
    });



app.put('/admins/:id', jsonParser, function KameraInfoBearbeiten (req, res) {
  client.del('admins:'+req.params.id, function(err, rep){

        if (rep == 1) {
            var newAdmin = req.body;
            updatedAdm.id = req.params.id;
            client.set('admins:'+req.params.id, JSON.stringify(updatedAdm), function(err, rep) {
                res.json(updatedAdm);
            });

        }
        else {
            res.status(404).type('text').send('Der Administrator wurde nicht gefunden');
        }
    });
});


app.get('/admins/:id', function kameraAusgeben(req, res){
     client.get('admins:' + req.params.id, function(err, rep){
        if(rep) {
            res.type('json').send(rep);
        }
        else {
            res.status(404).type('text').send("Die Administrator mit der ID " + req.params.id +  " ist nicht in der Datenbank");
        }
    });
});


app.delete('/admins/:id', function (req, res) {
client.del('admins:'+req.params.id, function(err, rep){
        if(rep == 1){
            res.status(200).type('text').send('OK'+ req.params.id + 'gelöscht');
        }
        else{
            res.status(404).type('text').send('Das Administrator mit der ID ' + req.params.id + ' wurde nicht gefunden');
        }
    });
});



// Re

// App läuft über Port 3000
app.listen(3000);
console.log('Listening on http://localhost:3000');










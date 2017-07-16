var http = require('http');
var faye = require('faye');

var server = http.createServer();

var bayeux = new faye.NodeAdapter( {
	mount: '/faye',
});

bayeux.attach(server);

var client = new faye.Client('http://localhost: 8000/faye');

var subscription = client.subscription('/news', function(message) {
	console.log("Neue Nachricht von: " + message.autor + " " +message.content);
});

//POST
app.post('/news', function(req, res) {
	//Nachricht an Topic 'news' publishen
	var publication = client.publish('/news', {
		"autor": req.body.author,
		"content": req.body.content,
	});

	publication.then(
					//Promise-Handler wenn Publischen erfolgreich
					function() {
						console.log("Nachricht wurde gesendet");
						res.writeHead(200, "OK");
						res.write("Nachricht wurde gesendet");
						res.ent();
					},

					//Promise_Handler wenn Publishen fehlgeschlagen ist
					function (error) {
						console.log("Nichticht wurde nicht verschickt");
						res.write("Nachricht wurde nicht verschickt");
					});
});

server.listen(8000, function() {
	console.log("Server läuft auf Port 8000.");
});
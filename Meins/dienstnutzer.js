var express = require('express');
var bodyParser = require('body-Parser');
var fs = require('fs');
var jsonParser = bodyParser.json();
var ejs = require('ejs');
var request = require('request');

var app = express();

app.use(express.static(__dirname + "/public"));


app.get('/users', jsonParser, function(req, res){

	fs.readFile('./users.ejs', {encoding: 'utf-8'}, function(err, filestring){

		if (err) {
			throw err;
			console.log("Fehler");
		} else 
{

			var options = {
				host: 'http://localhost/users',
				port: 8000,
				path: '/users',
				method: 'GET',
				headers: {
					accept: 'application/json'
				}
			}


		var externalRequest = request("http://localhost:3000/users", function(err, httpResponse, body) {
			console.log('Verbunden');
						
				console.log(body);
				var userdata = JSON.parse(body);
				console.log(userdata);
				var html = ejs.render(filestring,{users:userdata});
				res.setHeader('content-type', 'text/html');
				res.writeHead(200);
				res.write(html);
				res.end();
				});

		externalRequest.end();
}

	});
});

app.listen(3001, function(){
	console.log("Sever listens on Port http://localhost:3001");
})







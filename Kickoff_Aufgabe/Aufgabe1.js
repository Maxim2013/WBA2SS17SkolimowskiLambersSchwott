var fs = require('fs');
fs.readFile("staedte.json", function(err, data) {
	var obj = JSON.parse(data);
	for (var i=0;i<20;i++){
	console.log("name:"+obj.cities[i].name);
	console.log("country: "+obj.cities[i].country);
	console.log("population: "+obj.cities[i].population);
	console.log("--------------------");	
	}
});
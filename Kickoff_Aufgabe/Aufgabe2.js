var fs = require('fs');
var chalk=require('chalk');

fs.readFile("staedte.json", function(err, data) {
	var obj = JSON.parse(data);
	for(var i=0;i<20;i++){
	console.log(chalk.grey.bgWhite("name:"+obj.cities[i].name));
	console.log(chalk.red("country: "+obj.cities[i].country));
	console.log(chalk.yellow("population: "+obj.cities[i].population));
	console.log("--------------------");	
	}
});
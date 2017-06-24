const express = require("express");
const router = express.Router();
const bodyParser = require('bodyParser');

const ressourceName = "users";

router.use(function timeLog (req, res, next) {
	console.log("Admins Route Time Log", Date.now());
	next();
});

//Definition GET auf "/users"
router.get('/', function (req, res) {
	res.send("Representation aller Admins");
});

// Implementierung POST auf "/users"
router.post('/', bodyParser.json(), function (req, res) {
	console.log(req.body);
	res.status(200).json( { uri: req.protocol+ "://" + req.headers.host +"/" + ressourceName+ "/" + req.body.id} );
})

// Definition GET auf "/users/:userID"
router.get("/:userId", function (req, res) {
	res.send("Auflistung eines Adims mit der ID: " +req.params.userId);
});


module.exports = router;

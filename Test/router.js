//ROUTER

const express = require("express");
const router = express.Router();
const bodyParser = require('body-parser');

const ressourceName = "router";



router.use(function  (req, res, next) {
	console.log("Admins Route Time Log", Date.now());
	next();
});

//Definition GET auf "/users"
router.get('/users', function (req, res) {
	res.send("Representation aller Admins");
});

// Implementierung POST auf "/users"
router.post('/users', bodyParser.json(), function (req, res) {
	console.log(req.body);
	res.status(200).json( { uri: req.protocol+ "://" + req.headers.host +"/" + ressourceName+ "/" + req.body.id} );
});

router.put("/users", function (req, res) {
	res.send("PUT /users")
})

// DELETE Request auf Pfad "/users"
router.delete('/users', function (req, res) {
	res.send("DELETE /users")
})

// Definition GET auf "/users/:userID"
router.get("/:userId", function (req, res) {
	res.send("Auflistung eines Adims mit der ID: " +req.params.userId);
});


module.exports = router;


var express = require('express');
var fs = require('fs');
var redis = require('redis');
var db = redis.createClient();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var app = express();

var USERLIST = 'USERLIST';
var OBJEKTLIST = 'OBJEKTLIST';

var OBJEKT_INDEX = 'OBJEKT_INDEX';
var USER_INDEX = 'USER_INDEX';

var VALUE_OK = 'OK';

function cleanDb() {
    db.del([OBJEKTLIST, USERLIST], function (err, reply) {
        console.log("DB Clean! " + reply);
    });
}

//Fehlermeldungen

function stringContainsTerm(string, term) {
    if (string.indexOf(term) === -1) {
        return false;
    } else {
        return true;
    }
}

function arrayContainsTerm(array, term) {
    var found = false;
    array.forEach(function (element, index) {
        if (element === term) {
            found = true;
        }
    });
    return found;
}

function errorInDatabase(res, err) {
    if (err != null) {
        res.status(500).send("INTERNAL SERVER ERROR \n" + err);
        return true
    } else {
        return false;
    }
}

function isValidObjekt(objekt) {
	if (objekt === undefined) {
        return false;
    }
    if (objekt.title === undefined) {
        return false;
    }

    if (objekt.description === undefined) {
        return false;
    }
    if (objekt.tags === undefined) {
        return false;
    }
    if (objekt.uploader === undefined) {
        return false;
    } 
	
    return true;
}

function getObjektById(OBJEKTLIST, id) {
    var result;
    OBJEKTLIST.forEach(function (entry) {
        _json = JSON.parse(entry);
        if (parseInt(_json.id) == id) {
            result = _json;
        }
    });
    return result;
}

function isValidUser(user) {
 /*  if (user === undefined) {
        return false;
    }
    if (user.username === undefined) {
        return false;
    }
    if (user.email === undefined) {
        return false;
    }
    if (user.password === undefined) {
        return false;
    }*/
    return true;
}

function getUserById(userList, id) {
    var result;
    userList.forEach(function (entry) {
        _json = JSON.parse(entry);
        if (parseInt(_json.id) == id) {
            result = _json;
        }
    });
    return result;
}

function handleInternalError(req, res, message) {
    var _data = {
        errorMessage: message
    };

    res.status(500);
    // respond with html page
    if (req.accepts('html')) {
        res.render('errors/internalerror', _data);
        return;
    }
    // respond with json
    if (req.accepts('json')) {
        res.json(_data);
        return;
    }

    // default to plain-text. send()
    res.type('txt').send(message);

}

//configuration des BodyParsers
app.use(bodyParser.json());


//Configuration von ErrorHandler
app.use(function (err, req, res, next) {
        console.error(err.stack);
        res.end(err.status + ' ' + err.message);
    })
    //Configuration eines Loggers für den gesamten server
app.use('/', function (req, res, next) {
    console.log('%d - Method: ' + req.method + ":" + req.path, Date.now());
    next();
})

//Festlegen aller Routen

//**********************************************************************
//			Laden aller vorhandenen Objekts
// GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.get('/objekts/', function (req, res) {
    //Sollen die Liste eingegrenz werden?
    var _searchTerm = req.query.searchterm;
    //Laden aller Objekts
    db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            if (reply === null || reply == undefined) {
                handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Objekt List')
            } else {
                var _result = [];
                reply.forEach(function (element) {
                    //Überprüfen ob das Ergebniss den Suchparametern entspricht
                    var _objekt = JSON.parse(element)
                    if (_searchTerm == undefined) {
                        _result.push(_objekt);
                    } else {
                        //Überprüfen ob der Suchbegriff enthalten ist:
                        var termInTags = arrayContainsTerm(_objekt.tags, _searchTerm);
                        var termInDescription = stringContainsTerm(_objekt.description, _searchTerm);
                        if (termInDescription || termInTags) {
                            _result.push(JSON.parse(element));
                        }

                    }

                });
                res.status(200).json(_result);
            }
        }
    });
});

//**********************************************************************
//			Anlegen eines neuen Objekts  
//**********************************************************************
app.post('/objekts', jsonParser, function (req, res) {
    //Abfragen wieviele Objekts aktuell in der Liste sind um eine ID zu generieren
    db.get(OBJEKT_INDEX, function (err, reply) {
        var _id = parseInt(reply);
        //Es wird per JSON ein komplettes objektobjekt gesendet -> kann direkt aus dem body entnommenwerden
        var newObjekt = req.body;
        //Überprüfen ob passende parameter gesendet wurden
        if (!isValidObjekt(newObjekt)) {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Error in given Objektdata')
        } else {
            //Objekt vervollständigen und in die DB speichern
            newObjekt.id = _id;
            db.rpush(OBJEKTLIST, JSON.stringify(newObjekt), function (err, reply) {
                if (!errorInDatabase(res, err)) {
                    if (reply !== _id) {
                        //TODO INCREMENT ID
                        db.incr(OBJEKT_INDEX, function (err, reply) {
                            if (!errorInDatabase(res, err)) {
                                res.status(201).json(newObjekt);
                                  } else {
                                handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot increment OBJEKT_INDEX')
                            }
                        });
                    }
                }
            });
        }
    });
});


//**********************************************************************
//			Laden der Informationen (ohne Kommentare) zum Leihobjekt mit der angegebenen Objektid
//		GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.get('/objekts/:objektId', function (req, res) {
    var _objektId = parseInt(req.params.objektId);
    //Laden aller Objekts
    db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _objekt = getObjektById(reply, _objektId);
            //entfernen der Kommentardaten aus dem objekt Objekt!
            delete _objekt.comments;
            if (_objekt === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                res.status(200).json(_objekt);
            }
        } else {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Objekt with id ' + _objektId);
        }
    });

});


//**********************************************************************
//			Aktualisieren der änderbaren Informationen eines Objekts mit der übergebenen ID 
//			GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.patch('/objekts/:objektId', function (req, res) {
    var _objektId = parseInt(req.params.objektId);
    var _objektData = req.body;
    db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _objekt = getObjektById(reply, _objektId);
            var _objektDataToDelet = JSON.parse(JSON.stringify(_objekt));
            if (_objekt === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                //Update whatever is possible
                if (_objektData.title !== undefined && _objektData.title !== '') {
                    _objekt.title = _objektData.title;
                }
                if (_objektData.description !== undefined && _objektData.description !== '') {
                    _objekt.description = _objektData.description;
                }
                if (_objektData.tags !== undefined && _objektData.tags !== '') {
                    _objekt.tags = _objektData.tags;
                }
                //Update Database
                db.lrem(OBJEKTLIST, 0, JSON.stringify(_objektDataToDelet), function (err, reply) {
                    if (reply === 1) {
                        db.rpush(OBJEKTLIST, JSON.stringify(_objekt), function (err, reply) {
                            res.status(200).json(_objekt)
                        });
                    } else {
                        handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot update objekt with ID ' + _objektId);
                    }
                });

            }
        }
    });
});

//**********************************************************************
//			Löschen des Objekts mit der angegebenen ID  getestet 17.7.17 gl
//GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.delete('/objekts/:objektId', function (req, res) {
    var _objektId = parseInt(req.params.objektId);
    //Laden aller Objekts
    db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _objekt = getObjektById(reply, _objektId);
            if (_objekt === null || _objekt == undefined) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                //Löschen des gefundenen Objekts
                db.lrem(OBJEKTLIST, 0, JSON.stringify(_objekt), function (err, reply) {
                    if (reply === 1) {
                        res.status(200).send(VALUE_OK);
                    } else {
                        handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot delete objekt with id ' + _objektId);
                    }
                });
            }
        }
    });
});

//**********************************************************************
//			Laden aller Kommentare zu einem Objekt mit der angegebenen ID 
//GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.get('/objekts/:objektId/comments', function (req, res) {
    var _objektId = parseInt(req.params.objektId);
    //Laden aller Objekts
    db.lrange(USERLIST, 0, -1, function (usrErr, usrReply) {
        var _userList = usrReply;
        if (!errorInDatabase(res, usrErr)) {
            db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
                if (!errorInDatabase(res, err)) {
                    var _objekt = getObjektById(reply, _objektId);
                    if (_objekt === null && _objekt != undefined) {
                        res.status(404).send("RESOURCE NOT FOUND");
                    } else {
                        //Match comments with usernames
                        var _result = [];
                        _objekt.comments.forEach(function (e, index) {
                            var _element = e;
                            var _user = getUserById(_userList, _element.userId)
                            if (_user == undefined) {
                                _element.uploaderName = 'UNBEKANNTER NUTZER';
                            } else {
                                _element.uploaderName = _user.username;
                            }
                            _result.push(_element);
                        });
                        res.status(200).json(_result);
                    }
                } else {
                    handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot loading commentdata for objekt with id ' + _objektId);
                }
            });
        } else {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Userlist');
        }
    });

});

//**********************************************************************
//			Hinzufügen eines Kommentars zum Objekt mit der angegebenen ID
//**********************************************************************
app.post('/objekts/:objektId/comments', jsonParser, function (req, res) {
    var _objektId = parseInt(req.params.objektId);
    var _commentData = req.body;
    //Abfragen der aktuellen Objektdaten
    db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _objekt = getObjektById(reply, _objektId);
            if (_objekt === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                db.lrem(OBJEKTLIST, 0, JSON.stringify(_objekt), function (err, reply) {
                    if (!errorInDatabase(res, err)) {
                        _objekt.comments.push(_commentData);
                        db.rpush(OBJEKTLIST, JSON.stringify(_objekt), function (err, reply) {
                            if (!errorInDatabase(res, err)) {
                                res.status(200).send(VALUE_OK);
                            } else {
                                handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot create updated Objektdata');
                            }
                        });
                    } else {
                        handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot remove objekt with id ' + _objektId);
                    }
                });
            }
        } else {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Objekt List');
        }
    });
});


//**********************************************************************
//			Abfragen aller vorhandenen Tags --- 
//GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.get('/tags/', function (req, res) {
    //Laden aller Tags
    db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            if (reply === null || reply == undefined) {
                res.status(500).send("INTERNAL SERVER ERROR - Cannot load Tag List");
            } else {
                var _result = {};
                //Iterriere über alle Objekts
                reply.forEach(function (objekt) {

                    _objekt = JSON.parse(objekt);
                    //Iterriere über alle Tags im objekt
                    _objekt.tags.forEach(function (tag) {
                        var _tagValue = _result[tag];
                        if (_tagValue == undefined) {
                            _result[tag] = 1;
                        } else {
                            _result[tag] = _tagValue + 1;
                        }
                    });
                });
                res.status(200).json(_result);
            }
        }
    });
});





////USER CRUD
//**********************************************************************
//			Anlegen eines neunen Users 
//**********************************************************************
app.post('/users', jsonParser, function (req, res) {
    db.get(USER_INDEX, function (err, reply) {
        var _id = parseInt(reply);
        var newUser = req.body;
        if (!isValidUser(newUser)) {
            res.status(400).send("Das Userobjekt war Fehlerhaft");
        } else {
            newUser.id = _id;
            newUser.username = _username;
            db.rpush(USERLIST, JSON.stringify(newUser), function (err, reply) {
                if (!errorInDatabase(res, err)) {
                    db.incr(USER_INDEX, function (err, reply) {
                        if (!errorInDatabase(res, err)) {
                            res.status(201).json(newUser);
                        }
                    });
                }
            });
        }
    });
});

//**********************************************************************
//			Laden aller User ---
//GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.get('/users', function (req, res) {
    //Laden aller Objekts
    db.lrange(USERLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            if (reply === null || reply == undefined) {
                res.status(500).send("INTERNAL SERVER ERROR - Cannot load USER List");
            } else {
                var _result = [];
                reply.forEach(function (element) {
                    _result.push(JSON.parse(element));
                });
                res.status(200).json(_result);
            }
        }
    });
});

//**********************************************************************
//			Laden des Nutzers mit der übergebenen ID --- 
//GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.get('/users/:userId', function (req, res) {
    var _userId = parseInt(req.params.userId);
    //Laden aller Objekts
    db.lrange(USERLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _user = getUserById(reply, _userId);
            if (_user === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                res.status(200).json(_user);
            }
        }
    });
});


//**********************************************************************
//			Updaten der änderbaren Daten eines Nutzers ---
//GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.patch('/users/:userId', jsonParser, function (req, res) {
    var _userId = parseInt(req.params.userId);
    var _userData = req.body;
    //Laden aller Objekts
    db.lrange(USERLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _user = getUserById(reply, _userId);
            var _userToDelete = JSON.parse(JSON.stringify(_user));
            if (_user === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                //Update whatever is possible
                if (_userData.username !== undefined && _userData.username !== '') {
                    _user.username = _userData.username;
                }
                if (_userData.email !== undefined && _userData.email !== '') {
                    _user.email = _userData.email;
                }
                if (_userData.password !== undefined && _userData.password !== '') {
                    _user.password = _userData.password;
                }
                //Update Database
                db.lrem(USERLIST, 0, JSON.stringify(_userToDelete), function (err, reply) {
                    if (reply === 1) {
                        db.rpush(USERLIST, JSON.stringify(_user), function (err, reply) {
                            res.status(200).json(_user);
                        });
                    } else {
                        res.status(500).send("INTERNAL SERVER ERROR - Cannot Update User");
                    }
                });
            }
        }
    });
    db.lindex(USERLIST, _userId, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _user = JSON.parse(reply);
        }
    });
});


//**********************************************************************
//			löschen eines Benutzers --- 
//GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  g
//**********************************************************************
app.delete('/users/:userId', function (req, res) {
    var _userId = parseInt(req.params.userId);
    //Laden aller Objekts
    db.lrange(USERLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _user = getUserById(reply, _userId);
            if (_user === null || _user == undefined) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                //Löschen des gefundenen Users
                db.lrem(USERLIST, 0, JSON.stringify(_user), function (err, reply) {
                    if (reply === 1) {
                        res.status(200).send(VALUE_OK);
                    } else {
                        res.status(500).send("INTERNAL SERVER ERROR - Cannot delete user: " + err);
                    }
                });
            }
        }
    });
});



//**********************************************************************
//			Laden aller Objekts eines Nutzers --- 
// GETESTET mit Defaultdaten ... Funktioniert  17/17/2017  gl
//**********************************************************************
app.get('/users/:userId/objekts', function (req, res) {
    var _userId = parseInt(req.params.userId);
    //Laden aller Objekts
    db.lrange(OBJEKTLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _result = [];
            if (reply === null || reply == undefined) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                var result = [];
                reply.forEach(function (pElement) {
                    var _objekt = JSON.parse(pElement);
                    if (_objekt.uploader === _userId) {
                        result.push(_objekt);
                    }
                });
                res.status(200).json(result);
            }
        }
    });

});


//**********************************************************************
//		 Stellt einen Defaultdatensatz in der DB her, und füllt ihn.
//**********************************************************************
app.get('/resetDb', function (req, res) {
    console.log('Setting up initial Data');
    db.del([OBJEKTLIST, USERLIST, OBJEKT_INDEX, USER_INDEX], function (err, reply) {
        console.log("DB Clean! " + reply);
        var objekt0 = {
            "id": 0
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
            "id": 1
            , "title": "Das Beispielbuch"
            , "description": "Ein Autor bietet zum Beispiel ein Buch als Druck- und als Download-Format an.."
            , "tags": ["Buch", "Autor", "Papier"]
            , "comments": [{
                "userId": 0
                , "text": "Das andere Buch hat mir besser gefallen!"
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
        var paramsObjekt = [OBJEKTLIST, JSON.stringify(objekt0), JSON.stringify(objekt1)];
        db.rpush(paramsObjekt, function (err, reply) {
            console.log("Added Objekts! Reply: " + reply);
        });
        var user0 = {
            "id": 0
            , "username": "Mark"
            , "email": "Mark@localhost.de"
            , "password": "mark1"
        };
        
        var user1 = {
            "id": 1
            , "username": "Gerald"
            , "email": "Gerald@localhost.de"
            , "password": "gerald1"
        };
        db.lpush(USERLIST, JSON.stringify(user0), function (err, reply) {
            console.log("Added User! Reply: " + reply);
        });
        
        db.lpush(USERLIST, JSON.stringify(user1), function (err, reply) {
            console.log("Added User! Reply: " + reply);
        });
        
        db.set(OBJEKT_INDEX, 2, function (err, reply) {
            console.log("Set OBJEKT_INDEX to 2");
        });
        db.set(USER_INDEX, 2, function (err, reply) {
            console.log("Set USER_INDEX to 2");
        });
        res.status(200).send('DB CLEANED AND FILLED');
    });
});

app.listen(1337, function () {
    console.log('Dienstgeber läuft auf port 1337! ---  Erstelle Defaultdaten in der DB mit > get resetDb < !! ');
});
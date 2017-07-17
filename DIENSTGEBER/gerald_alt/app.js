var express = require('express');
var fs = require('fs');
var redis = require('redis');
var db = redis.createClient();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var app = express();

var USERLIST = 'USERLIST';
var AUSLEIHOBJEKTELIST = 'AUSLEIHOBJEKTELIST';

var AUSLEIHOBJEKTELIST_INDEX = 'AUSLEIHOBJEKTLIST_INDEX';
var USER_INDEX = 'USER_INDEX';

var VALUE_OK = 'OK';

function cleanDb() {
    db.del([AUSLEIHOBJEKTELIST, USERLIST], function (err, reply) {
        console.log("DB Clean! " + reply);
    });
}

//HELPER FUNCTIONS

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

function isValidAusleihobjekte(ausleihobjekte) {
    if (ausleihobjekte === undefined) {
        return false;
    }
        if (ausleihobjekte.id === undefined) {
        return false;
    }
      if (ausleihobjekte.art === undefined) {
        return false;
    }
    if (ausleihobjekte.title === undefined) {
        return false;
    }
    if (ausleihobjekte.autor=== undefined) {
        return false;
    }
    if (ausleihobjekte.isbn === undefined) {
        return false;
    }
    if (ausleihobjekte.ausleihstatus === undefined) {
        return false;
    }
    return true;
}

function getAusleihobjeketById(ausleihobjekteList, id) {
    var result;
    ausleihobjektList.forEach(function (entry) {
        _json = JSON.parse(entry);
        if (parseInt(_json.id) == id) {
            result = _json;
        }
    });
    return result;
}

function isValidUser(user) {
    if (user === undefined) {
        return false;
    }
    if (user.username === undefined) {
        return false;
    }
    if (user.id === undefined) {
        return false;
    }
    if (user.password === undefined) {
        return false;
    }
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
//			Laden aller vorhandenen Ausleihobjekte
//**********************************************************************
app.get('/res/ausleihobjekte', function (req, res) {
    //Sollen die Liste eingegrenz werden?
    var _searchTerm = req.query.searchterm;
    //Laden aller Videos
    db.lrange(AUSLEIHOBJEKTELIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            if (reply === null || reply == undefined) {
                handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Video List')
            } else {
                var _result = [];
                reply.forEach(function (element) {
                    //Überprüfen ob das Ergebniss den Suchparametern entspricht
                    var _ausleihobjekte = JSON.parse(element)
                    if (_searchTerm == undefined) {
                        _result.push(_video);
                    } else {
                        //Überprüfen ob der Suchbegriff enthalten ist:
                        var termInTags = arrayContainsTerm(_ausleihobjekete.tags, _searchTerm);
                        var termInDescription = stringContainsTerm(_ausleihobjekte.description, _searchTerm);
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
//			Anlegen eines neuen Ausleihobjektes
//**********************************************************************
app.post('/res/ausleihobjekte', jsonParser, function (req, res) {
    //Abfragen wieviele Ausleihobjekte aktuell in der Liste sind um eine ID zu generieren
    db.get(AUSLEIHOBJEKTE_INDEX, function (err, reply) {
        var _id = parseInt(reply);
        //Es wird per JSON ein komplettes ausleihobjekt gesendet -> kann direkt aus dem body entnommenwerden
        var newAusleihobjekte = req.body;
        //Überprüfen ob passende parameter gesendet wurden
        if (!isValidVideo(newAusleihobjekte)) {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Error in given Videodata')
        } else {
            //Objekt vervollständigen und in die DB speichern
            newAusleihobjekte.id = _id;
            db.rpush(AUSLEIHOBJEKTELIST, JSON.stringify(newAusleihobjekte), function (err, reply) {
                if (!errorInDatabase(res, err)) {
                    if (reply !== _id) {
                        //TODO INCREMENT ID
                        db.incr(AUSLEIHOBJEKTE_INDEX, function (err, reply) {
                            if (!errorInDatabase(res, err)) {
                                res.status(201).json(newAusleihobjekte);
                            } else {
                                handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot increment VIDEO_INDEX')
                            }
                        });
                    }
                }
            });
        }
    });
});


//******************************************************************************
//			Laden der Informationen der Ausleihobjekte mit der angegebenen Isbn
//******************************************************************************
app.get('/res/ausleihobjekte/:id', function (req, res) {
    var _ausleihobjekteId = parseInt(req.params.ausleihobjekteId);
    //Laden aller ausleihobjekte
    db.lrange(AUSLEIHOBJEKTELIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _ausleihobjekte = getAusleihobjekteById(reply, _ausleihobjekteId);
            
            if (_ausleihobjekte === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                res.status(200).json(_video);
            }
        } else {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Ausleihobjekt with id ' + _ausleihobjekteId);
        }
    });

});



//**********************************************************************
//			Löschen des Ausleihobjektes mit der angegebenen id
//**********************************************************************
app.delete('/res/ausleihobjekte/:id', function (req, res) {
    var _id = parseInt(req.params.id);
    //Laden aller Videos
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _ausleihobjekte = getausleihobjekteById(reply, _videoId);
            if (_ausleihobjekte === null || _ausleihobjekte == undefined) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                //Löschen des gefundenen Videos
                db.lrem(AUSLEIHOBJEKTELIST, 0, JSON.stringify(_ausleihobjekte), function (err, reply) {
                    if (reply === 1) {
                        res.status(200).send(VALUE_OK);
                    } else {
                        handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot delete ausleihobjekte with id ' + _ausleihobjekteId);
                    }
                });
            }
        }
    });
});



//**********************************************************************
//			Abfragen aller vorhandenen Tags
//**********************************************************************
app.get('/res/tags/', function (req, res) {
    //Laden aller Tags
    db.lrange(AUSLEIHOBJEKTELIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            if (reply === null || reply == undefined) {
                res.status(500).send("INTERNAL SERVER ERROR - Cannot load Tag List");
            } else {
                var _result = {};
                //Iterriere über alle Videos
                reply.forEach(function (video) {

                    _ausleihobjekte = JSON.parse(ausleihobjekte);
                    //Iterriere über alle Tags im video
                    _ausleihobjekte.tags.forEach(function (tag) {
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
//			Laden aller User
//**********************************************************************
app.get('/users', function (req, res) {
    //Laden aller Videos
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
//			Laden des Nutzers mit der übergebenen ID
//**********************************************************************
app.get('/users/:userId', function (req, res) {
    var _userId = parseInt(req.params.userId);
    //Laden aller Videos
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
//			Updaten der änderbaren Daten eines Nutzers
//**********************************************************************
app.patch('/users/:id', jsonParser, function (req, res) {
    var _userId = parseInt(req.params.userId);
    var _userData = req.body;
    //Laden aller Videos
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
                if (_userData.id !== undefined && _userData.id !== '') {
                    _user.id = _userData.id;
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
//			löschen eines Benutzers
//**********************************************************************
app.delete('/users/:id', function (req, res) {
    var _userId = parseInt(req.params.userId);
    //Laden aller Videos
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

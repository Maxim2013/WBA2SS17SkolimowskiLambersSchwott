var express = require('express');
var fs = require('fs');
var redis = require('redis');
var db = redis.createClient();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var app = express();

var USERLIST = 'USERLIST';
var VIDEOLIST = 'VIDEOLIST';

var VIDEO_INDEX = 'VIDEO_INDEX';
var USER_INDEX = 'USER_INDEX';

var VALUE_OK = 'OK';

function cleanDb() {
    db.del([VIDEOLIST, USERLIST], function (err, reply) {
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

function isValidVideo(video) {
    if (video === undefined) {
        return false;
    }
    if (video.title === undefined) {
        return false;
    }
    if (video.youtubeId === undefined) {
        return false;
    }
    if (video.description === undefined) {
        return false;
    }
    if (video.tags === undefined) {
        return false;
    }
    if (video.uploader === undefined) {
        return false;
    }
    return true;
}

function getVideoById(videoList, id) {
    var result;
    videoList.forEach(function (entry) {
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
    if (user.email === undefined) {
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
//			Laden aller vorhandenen Videos
//**********************************************************************
app.get('/videos/', function (req, res) {
    //Sollen die Liste eingegrenz werden?
    var _searchTerm = req.query.searchterm;
    //Laden aller Videos
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            if (reply === null || reply == undefined) {
                handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Video List')
            } else {
                var _result = [];
                reply.forEach(function (element) {
                    //Überprüfen ob das Ergebniss den Suchparametern entspricht
                    var _video = JSON.parse(element)
                    if (_searchTerm == undefined) {
                        _result.push(_video);
                    } else {
                        //Überprüfen ob der Suchbegriff enthalten ist:
                        var termInTags = arrayContainsTerm(_video.tags, _searchTerm);
                        var termInDescription = stringContainsTerm(_video.description, _searchTerm);
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
//			Anlegen eines neuen Videos
//**********************************************************************
app.post('/videos', jsonParser, function (req, res) {
    //Abfragen wieviele Viedos aktuell in der Liste sind um eine ID zu generieren
    db.get(VIDEO_INDEX, function (err, reply) {
        var _id = parseInt(reply);
        //Es wird per JSON ein komplettes videoobjekt gesendet -> kann direkt aus dem body entnommenwerden
        var newVideo = req.body;
        //Überprüfen ob passende parameter gesendet wurden
        if (!isValidVideo(newVideo)) {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Error in given Videodata')
        } else {
            //Objekt vervollständigen und in die DB speichern
            newVideo.id = _id;
            db.rpush(VIDEOLIST, JSON.stringify(newVideo), function (err, reply) {
                if (!errorInDatabase(res, err)) {
                    if (reply !== _id) {
                        //TODO INCREMENT ID
                        db.incr(VIDEO_INDEX, function (err, reply) {
                            if (!errorInDatabase(res, err)) {
                                res.status(201).json(newVideo);
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


//**********************************************************************
//			Laden der Informationen zum Video mit der angegebenen Videoid
//**********************************************************************
app.get('/videos/:videoId', function (req, res) {
    var _videoId = parseInt(req.params.videoId);
    //Laden aller Videos
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _video = getVideoById(reply, _videoId);
            //entfernen der Kommentardaten aus dem video Objekt!
            delete _video.comments;
            if (_video === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                res.status(200).json(_video);
            }
        } else {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Video with id ' + _videoId);
        }
    });

});


//**********************************************************************
//			Aktualisieren der änderbaren Informationen eines Videos mit der übergebenen ID
//**********************************************************************
app.patch('/videos/:videoId', function (req, res) {
    var _videoId = parseInt(req.params.videoId);
    var _videoData = req.body;
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _video = getVideoById(reply, _videoId);
            var _videoDataToDelet = JSON.parse(JSON.stringify(_video));
            if (_video === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                //Update whatever is possible
                if (_videoData.title !== undefined && _videoData.title !== '') {
                    _video.title = _videoData.title;
                }
                if (_videoData.description !== undefined && _videoData.description !== '') {
                    _video.description = _videoData.description;
                }
                if (_videoData.tags !== undefined && _videoData.tags !== '') {
                    _video.tags = _videoData.tags;
                }
                //Update Database
                db.lrem(VIDEOLIST, 0, JSON.stringify(_videoDataToDelet), function (err, reply) {
                    if (reply === 1) {
                        db.rpush(VIDEOLIST, JSON.stringify(_video), function (err, reply) {
                            res.status(200).json(_video)
                        });
                    } else {
                        handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot update video with ID ' + _videoId);
                    }
                });

            }
        }
    });
});

//**********************************************************************
//			Löschen des Videos mit der angegebenen ID
//**********************************************************************
app.delete('/videos/:videoId', function (req, res) {
    var _videoId = parseInt(req.params.videoId);
    //Laden aller Videos
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _video = getVideoById(reply, _videoId);
            if (_video === null || _video == undefined) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                //Löschen des gefundenen Videos
                db.lrem(VIDEOLIST, 0, JSON.stringify(_video), function (err, reply) {
                    if (reply === 1) {
                        res.status(200).send(VALUE_OK);
                    } else {
                        handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot delete video with id ' + _videoId);
                    }
                });
            }
        }
    });
});

//**********************************************************************
//			Laden aller Kommentare zu einem Video mit der angegebenen ID
//**********************************************************************
app.get('/videos/:videoId/comments', function (req, res) {
    var _videoId = parseInt(req.params.videoId);
    //Laden aller Videos
    db.lrange(USERLIST, 0, -1, function (usrErr, usrReply) {
        var _userList = usrReply;
        if (!errorInDatabase(res, usrErr)) {
            db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
                if (!errorInDatabase(res, err)) {
                    var _video = getVideoById(reply, _videoId);
                    if (_video === null && _video != undefined) {
                        res.status(404).send("RESOURCE NOT FOUND");
                    } else {
                        //Match comments with usernames
                        var _result = [];
                        _video.comments.forEach(function (e, index) {
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
                    handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot loading commentdata for video with id ' + _videoId);
                }
            });
        } else {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Userlist');
        }
    });

});

//**********************************************************************
//			Hinzufügen eines Kommentars zum Video mit der angegebenen ID
//**********************************************************************
app.post('/videos/:videoId/comments', jsonParser, function (req, res) {
    var _videoId = parseInt(req.params.videoId);
    var _commentData = req.body;
    //Abfragen der aktuellen Videodaten
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _video = getVideoById(reply, _videoId);
            if (_video === null) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                db.lrem(VIDEOLIST, 0, JSON.stringify(_video), function (err, reply) {
                    if (!errorInDatabase(res, err)) {
                        _video.comments.push(_commentData);
                        db.rpush(VIDEOLIST, JSON.stringify(_video), function (err, reply) {
                            if (!errorInDatabase(res, err)) {
                                res.status(200).send(VALUE_OK);
                            } else {
                                handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot create updated Videodata');
                            }
                        });
                    } else {
                        handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot remove video with id ' + _videoId);
                    }
                });
            }
        } else {
            handleInternalError(req, res, 'INTERNAL SERVER ERROR - Cannot load Video List');
        }
    });
});


//**********************************************************************
//			Abfragen aller vorhandenen Tags
//**********************************************************************
app.get('/tags/', function (req, res) {
    //Laden aller Tags
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            if (reply === null || reply == undefined) {
                res.status(500).send("INTERNAL SERVER ERROR - Cannot load Tag List");
            } else {
                var _result = {};
                //Iterriere über alle Videos
                reply.forEach(function (video) {

                    _video = JSON.parse(video);
                    //Iterriere über alle Tags im video
                    _video.tags.forEach(function (tag) {
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
app.patch('/users/:userId', jsonParser, function (req, res) {
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
//			löschen eines Benutzers
//**********************************************************************
app.delete('/users/:userId', function (req, res) {
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



//**********************************************************************
//			Laden aller Videos eines Nutzers
//**********************************************************************
app.get('/users/:userId/videos', function (req, res) {
    var _userId = parseInt(req.params.userId);
    //Laden aller Videos
    db.lrange(VIDEOLIST, 0, -1, function (err, reply) {
        if (!errorInDatabase(res, err)) {
            var _result = [];
            if (reply === null || reply == undefined) {
                res.status(404).send("RESOURCE NOT FOUND");
            } else {
                var result = [];
                reply.forEach(function (pElement) {
                    var _video = JSON.parse(pElement);
                    if (_video.uploader === _userId) {
                        result.push(_video);
                    }
                });
                res.status(200).json(result);
            }
        }
    });

});


//**********************************************************************
//			Helper only // Stellt einen Defaultdatensatz in der DB her
//**********************************************************************
app.get('/resetDb', function (req, res) {
    console.log('Setting up initial Data');
    db.del([VIDEOLIST, USERLIST, VIDEO_INDEX, USER_INDEX], function (err, reply) {
        console.log("DB Clean! " + reply);
        var video0 = {
            "id": 0
            , "title": "NodeJs Tutorial"
            , "youtubeId": "pU9Q6oiQNd0"
            , "description": "What exactly is node.js? Is it a command-line tool, a language, the same thing as Ruby on Rails, a cure for cancer?"
            , "tags": ["NodeJS", "Beginner", "Tutorial", "Basics"]
            , "comments": [{
                "userId": 0
                , "text": "Tolle erklärung"
                , "timestamp": 1466605397896
            }, {
                "userId": 0
                , "text": "Finde ich nicht so gut"
                , "timestamp": 1466605397896
            }]
            , "uploaded": 1466602203753
            , "uploader": 0
        };
        var video1 = {
            "id": 1
            , "title": "Another NodeJs Tutorial"
            , "youtubeId": "X3C2peMLW34"
            , "description": "If you're new to web development, it can be a bit confusing as to what exactly node.js is and to what you should do with it, and there's a lot of information out there...most of which seems to be tailored towards genius-level developers."
            , "tags": ["NodeJS", "Tutorial", "Advanced"]
            , "comments": [{
                "userId": 0
                , "text": "Das andere Video hat mir besser gefallen!"
                , "timestamp": 1466605397896
            }, {
                "userId": 1
                , "text": "Glaube ich nicht"
                , "timestamp": 1466605397896
            }, {
                "userId": 0
                , "text": "Doch, ganz sicher!"
                , "timestamp": 1466605397896
            }]
            , "uploaded": 1466602903753
            , "uploader": 0
        };
        var paramsVideo = [VIDEOLIST, JSON.stringify(video0), JSON.stringify(video1)];
        db.rpush(paramsVideo, function (err, reply) {
            console.log("Added Videos! Reply: " + reply);
        });
        var user0 = {
            "id": 0
            , "username": "Franz"
            , "email": "user1@localhost.de"
            , "password": "user1"
        };
        
        var user1 = {
            "id": 1
            , "username": "Torsten"
            , "email": "user2@localhost.de"
            , "password": "user2"
        };
        db.lpush(USERLIST, JSON.stringify(user0), function (err, reply) {
            console.log("Added User! Reply: " + reply);
        });
        
        db.lpush(USERLIST, JSON.stringify(user1), function (err, reply) {
            console.log("Added User! Reply: " + reply);
        });
        
        db.set(VIDEO_INDEX, 2, function (err, reply) {
            console.log("Set VIDEO_INDEX to 2");
        });
        db.set(USER_INDEX, 2, function (err, reply) {
            console.log("Set USER_INDEX to 2");
        });
        res.status(200).send('DB CLEANED');
    });
});

app.listen(1337, function () {
    console.log('Example app listening on port 1337!');
});
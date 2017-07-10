// server.js
// load the things we need
var express = require('express');
var session = require('express-session');
var request = require('request');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var app = express();

var DIENSTGEBER_BASE_URL = "http://localhost:1337"

var HTTP_SUCCESSFULL = 200;
var HTTP_CREATED = 201;
var HTTP_NOT_FOUND = 404;
var HTTP_INTERNAL_ERROR = 500;

//*****************HELPER FUNCTIONS**************************//


function buildBasicDataSet(req, logedIn) {
    var session = req.session;
    var result = {};
    result.isLogedIn = logedIn;
    result.userName = session.username;
    result.userId = session.userid;
    return result;
}


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


function handleInternalError(req, res, message) {
    console.error('INTERNAL ERRROR - ' + message);
    var _data = {
        errorMessage: message
    };

    res.status(HTTP_INTERNAL_ERROR);
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
//*****************HELPER FUNCTIONS END**************************//



// set the view engine to ejs
app.set('view engine', 'ejs');
//
app.use(express.static('res'));

app.use('/', function (req, res, next) {
    console.log('%d - Method: ' + req.method + ":" + req.path, Date.now());
    next();
})
app.use(session({
    secret: 'Much_secret_so_wow'
    , resave: true
    , saveUninitialized: true
    , cookie: {
        'expires': new Date(Date.now() + 30 * 60 * 1000)
        , 'maxAge': 30 * 60 * 1000
    }
}));

//configuration des BodyParsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//*************************************************************************************
//          Security Middleware
//*************************************************************************************
app.use(function (req, res, next) {
    var uncheckedPathes = ['/login', '/register'];
    //Wenn die aktuelle route in den unchecked pathes ist -> nichts tun
    var contained = false;
    uncheckedPathes.forEach(function (element, number) {
        if (element === req.path) {
            contained = true;
        }
    });
    if (contained) {
        next();
    } else {
        var session = req.session;
        //Überprüfen ob es eine Session gibt und ein user in der Session gespeichert ist
        if (session && session.email && session.username) {
            next();
        } else {
            //Wenn es keine Session gab dann redirect to /login
            session.redirectedToLogin = true;
            res.redirect('/login');
        }
    }
});

// use res.render to load up an ejs view file

//*************************************************************************************
//          Unleiden der Route '/' auf /dashboard
//*************************************************************************************
app.get('/', function (req, res) {
    res.redirect('/dashboard');
});

//*************************************************************************************
//          Laden der Dashboard Seite
//*************************************************************************************
app.get('/dashboard', function (req, res) {
    console.log('Showing Dashboard');
    var _data = buildBasicDataSet(req, true);
    //videoliste laden,
    request.get(DIENSTGEBER_BASE_URL + '/videos/', function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _videoList = JSON.parse(body);
            //videoliste sortieren
            _videoList.sort(function (a, b) {
                return b.uploaded - a.uploaded;
            });
            _data.videoList = _videoList;
            //Laden der Tagcloud
            request.get(DIENSTGEBER_BASE_URL + '/tags/', function (error, response, body) {
                if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                    var _tagData = JSON.parse(body);
                    //Work the Data
                    _data.tagData = _tagData;
                    res.render('pages/dashboard', _data);
                }
            });
        } else {
            handleInternalError(req, res);
        }
    });
});




//*************************************************************************************
//          Laden der Suchseite
//*************************************************************************************
app.get('/search', function (req, res) {
    console.log('Showing Searchpage');
    var data = buildBasicDataSet(req, true);
    data.searchTerm = ""
    data.videoList = [];
    res.render('pages/search', data);
});

//*************************************************************************************
//          Laden der Suchseite mit eingegebenem Suchbegriff
//*************************************************************************************
app.get('/search/:term', function (req, res) {
    console.log('Showing Searchresults');
    var _searchTerm = req.params.term;
    var data = buildBasicDataSet(req, true);
    //build query String
    var _queryString = '';
    if (_searchTerm != undefined) {
        _queryString = '?searchterm=' + _searchTerm;
    }
    request.get(DIENSTGEBER_BASE_URL + '/videos' +
        _queryString
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                var result = [];
                var _videoList = JSON.parse(body);
                _videoList.forEach(function (video, index) {
                    var termInTags = arrayContainsTerm(video.tags, _searchTerm);
                    var termInDescription = stringContainsTerm(video.description, _searchTerm);
                    if (termInTags || termInDescription) {
                        result.push(video);
                    }
                });
                data.videoList = result;
                data.searchTerm = _searchTerm;
                res.render('pages/search', data);
            } else {
                handleInternalError(req, res);
            }
        });
});

//*************************************************************************************
//          Laden der Detailseite eines Videos
//*************************************************************************************
app.get('/video/:id', function (req, res) {
    console.log('Showing Videopage');
    var _videoId = parseInt(req.params.id);
    request.get(DIENSTGEBER_BASE_URL + '/videos/' + _videoId, function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _video = JSON.parse(body);
            var data = buildBasicDataSet(req, true);
            data.video = _video;
            data.currentUserId = req.session.userid;
            res.render('pages/video', data);
        } else {
            handleInternalError(req, res);
        }
    });
});


//*************************************************************************************
//          Seite zur Bearbeitung eines Videos Laden
//*************************************************************************************
app.get('/video/:id/edit', function (req, res) {
    console.log('Showing Videoeditpage');
    var _videoId = parseInt(req.params.id);
    request.get(DIENSTGEBER_BASE_URL + '/videos/' + _videoId, function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _video = JSON.parse(body);
            if (_video.uploader === req.session.userid) {
                var data = buildBasicDataSet(req, true);
                data.video = _video;
                data.currentUserId = req.session.userid;
                data.isEdit = true;
                res.render('pages/videoNew', data);
            } else {
                //Wenn es nicht der Uploader des video ist ist die bearbeitung nicht verfügbar
                res.redirect('/video/' + _videoId);
            }

        } else {
            handleInternalError(req, res);
        }
    });
});

//*************************************************************************************
//          Bearbeiten eines Videos durchführen
//*************************************************************************************
app.patch('/video/:id/edit', function (req, res) {
    console.log('Editing Video');
    var _videoId = parseInt(req.params.id);
    var _videoData = req.body;
    request.patch(
        DIENSTGEBER_BASE_URL + '/videos/' + _videoId, {
            json: _videoData
        , }
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                var result = {};
                result.videoEdited = true;
                result.redirect = '/video/' + _videoId;
                res.status(HTTP_SUCCESSFULL).json(result);
            } else {
                handleInternalError(req, res);
            };
        });
});

//*************************************************************************************
//          Laden der Kommentare zu einem Video
//*************************************************************************************
app.get('/video/:id/comments', function (req, res) {
    console.log('Showing Dashboard');
    var _videoId = parseInt(req.params.id);
    request.get(DIENSTGEBER_BASE_URL + '/videos/' + _videoId + '/comments', function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _data = {};
            _data.commentData = JSON.parse(body);
            res.render('partials/comments', _data);
        } else {
            handleInternalError(req, res);
        }
    });
});


//*************************************************************************************
//          Löschen eines videos
//*************************************************************************************
app.get('/video/:id/delete', function (req, res) {
    console.log('Deleting Video');
    var _videoId = parseInt(req.params.id);
    request.delete(DIENSTGEBER_BASE_URL + '/videos/' + _videoId, function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            res.redirect('/dashboard');
        } else {
            handleInternalError(req, res);
        }
    });
});

//*************************************************************************************
//          Laden der Seite zum anlegen eines neuen Videos
//*************************************************************************************
app.get('/new/video', function (req, res) {
    console.log('Showing New Video Page');
    var data = buildBasicDataSet(req, true);
    data.video = {};
    data.currentUserId = req.session.userid;
    data.isEdit = false;
    res.render('pages/videoNew', data);
})

//*************************************************************************************
//          Anlegen eines neuen Videos
//*************************************************************************************
app.post('/new/video', function (req, res) {
    console.log('Adding new Video');
    var _video = {};
    _video.title = req.body.title;
    _video.youtubeId = req.body.youtubeId;
    _video.description = req.body.description;
    _video.tags = req.body.tags;
    _video.comments = [];
    _video.uploader = req.session.userid;
    _video.uploaded = Date.now();
    request.post(
        DIENSTGEBER_BASE_URL + '/videos', {
            json: _video
        , }
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_CREATED) {
                var _videoData = body;
                var _result = {};
                _result.videoAdded = true;
                _result.redirect = '/video/' + _videoData.id;
                res.status(HTTP_CREATED).json(_result);
            } else {
                handleInternalError(req, res);
            };
        });
});

//*************************************************************************************
//          Anlegen eines neuen Kommentars
//*************************************************************************************
app.post('/new/comment', function (req, res) {
    console.log('Adding new Comment');
    var data = buildBasicDataSet(req, true);
    var _commentData = req.body;
    var _videoId = _commentData.videoId;
    delete _commentData.videoId;
    //anreichern mit übrigen Daten
    _commentData.userId = req.session.userid;
    _commentData.timestamp = Date.now();
    request.post(
        DIENSTGEBER_BASE_URL + '/videos/' + _videoId + '/comments', {
            json: _commentData
        , }
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                res.status(HTTP_CREATED).send('OK');
            } else {
                handleInternalError(req, res);
            };
        });
})

//*************************************************************************************
//          Anzeigen der Profilseite dse Nutzers
//*************************************************************************************
app.get('/profile', function (req, res) {
    console.log('Showing Profilepage');
    var _profileId = parseInt(req.session.userid);
    //Laden der Benutzerinformationen
    request.get(DIENSTGEBER_BASE_URL + '/users/' + _profileId, function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _user = JSON.parse(body);
            var data = buildBasicDataSet(req, true);
            data.user = _user;
            //Laden der Videos eines Nutzers
            request.get(DIENSTGEBER_BASE_URL + '/users/' + _profileId + '/videos', function (error, response, body) {
                if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                    var _videoList = JSON.parse(body);
                    data.videoList = _videoList;
                    res.render('pages/profile', data);
                } else {
                    handleInternalError(req, res);
                }
            });
        } else {
            handleInternalError(req, res);
        };

    });

});

//*************************************************************************************
//          Aktualisieren der Nutzerdaten
//*************************************************************************************
app.patch('/profile', function (req, res) {
    console.log('Updating Dashboard');
    var _profileId = parseInt(req.session.userid);
    var data = req.body;
    //Laden der Benutzerinformationen
    request.patch(
        DIENSTGEBER_BASE_URL + '/users/' + _profileId, {
            json: data
        , }
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                var session = req.session;
                session.username = data.username;
                res.status(HTTP_SUCCESSFULL).send("OK");
            } else {
                handleInternalError(req, res);
            };
        });

});


//*************************************************************************************
//          Laden der Login Seite
//*************************************************************************************
app.get('/login', function (req, res) {
    console.log('Showing Loginpage');
    var data = buildBasicDataSet(req, false);
    res.render('pages/login', data);
});

//*************************************************************************************
//          Durchführen des Logins
//*************************************************************************************
app.post('/login', function (req, res) {
    console.log('Doing Login');
    //get user by username or email!
    var session = req.session;
    var givenMail = req.body.email;
    var givenPassword = req.body.password;
    var user;

    // LADEN DER USER LISTE
    var newUser;
    request.get(DIENSTGEBER_BASE_URL + '/users', function (error, response, body) {
        //Auswerten des Requests
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            //Liste nach User mit EMAIL durchsuchen
            JSON.parse(body).forEach(function (element, i) {
                if (element.email === givenMail) {
                    user = element;
                }
            });
            //Kein Nutzer gefunden -> Login Invalid    
            if (user == undefined) {
                res.status(HTTP_NOT_FOUND).json({
                    'loginSuccessfull': false
                    , 'reason': 'Kein Nutzer zur Emailadresse'
                });
            } else {
                //Passwörter Stimmen überein -> Login valid
                if (givenPassword === user.password) {
                    session.email = user.email;
                    session.username = user.username;
                    session.userid = user.id
                    res.status(HTTP_SUCCESSFULL).json({
                        'loginSuccessfull': true
                        , 'redirect': '/dashboard'
                    });
                } else {
                    //Passwörter stimmen nicht überein -> Login invalid!
                    res.status(HTTP_NOT_FOUND).json({
                        'loginSuccessfull': false
                        , 'reason': 'Falsches Passwort'
                    });
                }

            }
        } else {
            res.status(HTTP_INTERNAL_ERROR).json({
                'loginSuccessfull': false
                , 'reason': 'Interneral Servererror'
            });
        }

    });
});

//*************************************************************************************
//          Anzeigen der Registrierungsseite
//************************************************************************************* 
app.get('/register', function (req, res) {
    console.log('Showing Registrationpage');
    var data = buildBasicDataSet(req, false);
    res.render('pages/register', data);
});

//*************************************************************************************
//          Registrierung des neuen Nutzers
//*************************************************************************************
app.post('/register', jsonParser, function (req, res) {
    console.log('Do Registration');
    var data = req.body;
    var _desiredEmail = data.email;
    var _emailTaken = false;
    //Überprüfen ob es bereits einen nuter mit der emailadresse gibt
    request.get(DIENSTGEBER_BASE_URL + '/users', function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            JSON.parse(body).forEach(function (element, i) {
                if (element.email === _desiredEmail) {
                    _emailTaken = true;
                }
            });
            if (!_emailTaken) {
                //Registrierung durchführen
                request.post(
                    DIENSTGEBER_BASE_URL + '/users', {
                        json: data
                    , }
                    , function (error, response, body) {
                        if (!error && response.statusCode == HTTP_CREATED) {
                            res.status(HTTP_CREATED).json({
                                'registrationSuccessfull': true
                                , 'redirect': '/login'
                            });
                        } else {
                            handleInternalError(req, res);
                        }
                    });
            } else {
                res.status(HTTP_NOT_FOUND).json({
                    'registrationSuccessfull': false
                });
            }

        } else {
            handleInternalError(req, res, 'INTERNAL ERROR - Cannot load user List');
        }
    });

});
//*************************************************************************************
//         Ausloggen des aktuellen Nutzers
//*************************************************************************************
app.post('/logout', function (req, res) {
    console.log('Doing Logout');
    req.session.destroy();
    res.status(HTTP_SUCCESSFULL).json({
        'logoutSuccessfull': true
    });
});


//*************************************************************************************
//         Handle 404
//*************************************************************************************
app.use(function (req, res, next) {
    console.log('ERROR 404');
    res.status(HTTP_NOT_FOUND);
    // respond with html page
    if (req.accepts('html')) {
        res.render('errors/notfound', {
            url: req.url
        });
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({
            error: 'Not found'
        });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});

app.listen(1338);
console.log('Dienstnuter lauft auf port 1338');
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



//Key 79ZQP4VR   für ISBNDB.com API  

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
    //objektliste laden,
    request.get(DIENSTGEBER_BASE_URL + '/objekts/', function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _objektList = JSON.parse(body);
            //objektliste sortieren
            _objektList.sort(function (a, b) {
                return b.uploaded - a.uploaded;
            });
            _data.objektList = _objektList;
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
    data.objektList = [];
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
    request.get(DIENSTGEBER_BASE_URL + '/objekts' +
        _queryString
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                var result = [];
                var _objektList = JSON.parse(body);
                _objektList.forEach(function (objekt, index) {
                    var termInTags = arrayContainsTerm(objekt.tags, _searchTerm);
                    var termInDescription = stringContainsTerm(objekt.description, _searchTerm);
                    if (termInTags || termInDescription) {
                        result.push(objekt);
                    }
                });
                data.objektList = result;
                data.searchTerm = _searchTerm;
                res.render('pages/search', data);
            } else {
                handleInternalError(req, res);
            }
        });
});

//*************************************************************************************
//          Laden der Detailseite eines Objekts
//*************************************************************************************
app.get('/objekt/:id', function (req, res) {
    console.log('Showing Objektpage');
    var _objektId = parseInt(req.params.id);
    request.get(DIENSTGEBER_BASE_URL + '/objekts/' + _objektId, function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _objekt = JSON.parse(body);
            var data = buildBasicDataSet(req, true);
            data.objekt = _objekt;
            data.currentUserId = req.session.userid;
            res.render('pages/objekt', data);
        } else {
            handleInternalError(req, res);
        }
    });
});


//*************************************************************************************
//          Seite zur Bearbeitung eines Objekts Laden
//*************************************************************************************
app.get('/objekt/:id/edit', function (req, res) {
    console.log('Showing Objekteditpage');
    var _objektId = parseInt(req.params.id);
    request.get(DIENSTGEBER_BASE_URL + '/objekts/' + _objektId, function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            var _objekt = JSON.parse(body);
            if (_objekt.uploader === req.session.userid) {
                var data = buildBasicDataSet(req, true);
                data.objekt = _objekt;
                data.currentUserId = req.session.userid;
                data.isEdit = true;
                res.render('pages/objektNew', data);
            } else {
                //Wenn es nicht der Uploader des objekt ist ist die bearbeitung nicht verfügbar
                res.redirect('/objekt/' + _objektId);
            }

        } else {
            handleInternalError(req, res);
        }
    });
});

//*************************************************************************************
//          Bearbeiten eines Objekts durchführen
//*************************************************************************************
app.patch('/objekt/:id/edit', function (req, res) {
    console.log('Editing Objekt');
    var _objektId = parseInt(req.params.id);
    var _objektData = req.body;
    request.patch(
        DIENSTGEBER_BASE_URL + '/objekts/' + _objektId, {
            json: _objektData
        , }
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                var result = {};
                result.objektEdited = true;
                result.redirect = '/objekt/' + _objektId;
                res.status(HTTP_SUCCESSFULL).json(result);
            } else {
                handleInternalError(req, res);
            };
        });
});

//*************************************************************************************
//          Laden der Kommentare zu einem Objekt
//*************************************************************************************
app.get('/objekt/:id/comments', function (req, res) {
    console.log('Showing Dashboard');
    var _objektId = parseInt(req.params.id);
    request.get(DIENSTGEBER_BASE_URL + '/objekts/' + _objektId + '/comments', function (error, response, body) {
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
//          Löschen eines objekts
//*************************************************************************************
app.get('/objekt/:id/delete', function (req, res) {
    console.log('Deleting Objekt');
    var _objektId = parseInt(req.params.id);
    request.delete(DIENSTGEBER_BASE_URL + '/objekts/' + _objektId, function (error, response, body) {
        if (!error && response.statusCode == HTTP_SUCCESSFULL) {
            res.redirect('/dashboard');
        } else {
            handleInternalError(req, res);
        }
    });
});

//*************************************************************************************
//          Laden der Seite zum anlegen eines neuen Objekts
//*************************************************************************************
app.get('/new/objekt', function (req, res) {
    console.log('Showing New Objekt Page');
    var data = buildBasicDataSet(req, true);
    data.objekt = {};
    data.currentUserId = req.session.userid;
    data.isEdit = false;
    res.render('pages/objektNew', data);
})

//*************************************************************************************
//          Anlegen eines neuen Objekts
//*************************************************************************************
app.post('/new/objekt', function (req, res) {
    console.log('Adding new Objekt');
    var _objekt = {};
    _objekt.title = req.body.title;   
    _objekt.description = req.body.description;
    _objekt.tags = req.body.tags;
    _objekt.comments = [];
    _objekt.uploader = req.session.userid;
    _objekt.uploaded = Date.now();
    request.post(
        DIENSTGEBER_BASE_URL + '/objekts', {
            json: _objekt
        , }
        , function (error, response, body) {
            if (!error && response.statusCode == HTTP_CREATED) {
                var _objektData = body;
                var _result = {};
                _result.objektAdded = true;
                _result.redirect = '/objekt/' + _objektData.id;
                res.status(HTTP_CREATED).json(_result);
                
       //************************************************************************
       //			BUCHSUCHE NACH NAMEN MIT http://isbndb.com api
       //************************************************************************       

      //          http://isbndb.com/api/v2/json/79ZQP4VR/book/... ;
       //		
                
                
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
    var _objektId = _commentData.objektId;
    delete _commentData.objektId;
    
    //anreichern mit übrigen Daten
    _commentData.userId = req.session.userid;
    _commentData.timestamp = Date.now();
    request.post(
        DIENSTGEBER_BASE_URL + '/objekts/' + _objektId + '/comments', {
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
            //Laden der Objekts eines Nutzers
            request.get(DIENSTGEBER_BASE_URL + '/users/' + _profileId + '/objekts', function (error, response, body) {
                if (!error && response.statusCode == HTTP_SUCCESSFULL) {
                    var _objektList = JSON.parse(body);
                    data.objektList = _objektList;
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

app.listen(1339);
console.log('Dienstnutzer lauft auf port 1339');
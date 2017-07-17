function getLoginData() {
    var email = $("#email").val();
    var password = $("#pwd").val();
    return {
        'email': email
        , 'password': password
    };
}


function requestLogin() {
    $.ajax({
        type: "POST"
        , url: '/login'
        , data: getLoginData()
        , complete: function (data) {
            var _data = JSON.parse(data.responseText);
            if (_data.loginSuccessfull) {
                window.location = _data.redirect;
            } else {
                $('.errorMessage').removeClass('hidden');
            }
        }
        , dataType: 'JSON'
    });
}


function requestLogout() {
    $.ajax({
        type: "POST"
        , url: '/logout'
        , complete: function (data) {
            var _data = JSON.parse(data.responseText);
            if (_data.logoutSuccessfull) {
                window.location = '/login';
            } else {
                //DO ERROR STUFF
            }
        }
        , dataType: 'JSON'
    });
}

function getUserNewData() {
    var email = $("#email").val();
    var username = $("#username").val();
    var password = $("#pwd").val();
    var password_confirm = $("#pwd_confirm").val();
    return {
        'email': email
        , 'username': username
        , 'password': password
        , 'password_confirm': password_confirm
    };
}

function registerUser() {
    var userData = getUserNewData();
    if (userData.password === userData.password_confirm) {
        delete userData.password_confirm;
        $.ajax({
            type: "POST"
            , url: '/register'
            , data: userData
            , complete: function (data) {
                var _data = JSON.parse(data.responseText);
                if (_data.registrationSuccessfull) {
                    window.location = _data.redirect;
                } else {
                    $('.errorMessageUserExists').removeClass('hidden');
                }
            }
            , dataType: 'JSON'
        });
    } else {
        $('.errorMessagePasswordsDontMatch').removeClass('hidden');
    }

}

function loadCommentData() {
    var _videoId = $('#videoId').val();
    $.ajax({
        type: "GET"
        , url: '/video/' + _videoId + '/comments'
        , cache: false
        , complete: function (data) {
            $('#comment-container').html(data.responseText);
        }
        , dataType: 'JSON'
    });
}

function addComment() {
    var _data = {};
    _data.text = $('#new-comment-text').val();
    _data.videoId = $('#videoId').val();
    $.ajax({
        type: "POST"
        , url: '/new/comment'
        , cache: false
        , data: _data
        , complete: function (data) {
            console.log('Kommentar hinzugefügt');
            loadCommentData();
            //Text aus Textarea löschen
            $('#new-comment-text').val('');
        }
        , dataType: 'JSON'
    });
}

function getUserData() {
    var result = {}
    result.username = $("#username").val();
    return result;
}


function updateUser() {
    $.ajax({
        type: "PATCH"
        , url: '/profile'
        , data: getUserData()
        , complete: function (data) {
            location.reload(true);
        }



        
        , dataType: 'JSON'
    });
}

function initTagFieldsOnPage() {
    $('.video-tags').tagsinput({
        maxTags: 10
        , maxChars: 15
    });
}


function loadTagCloud() {
    $("#tag-cloud").awesomeCloud({
        "size": {
            "grid": 9
            , "factor": 1
        }
        , "options": {
            "color": "random-dark"
            , "rotationRatio": 0.35
        }
        , "font": "'Helvetica Neue',Helvetica,Arial,sans-serif"
        , "shape": "circle"
    });
}
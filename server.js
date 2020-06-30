//libraries used
var express = require('express');
const path = require('path');
var request = require('request');
var ejs = require('ejs');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
//local library for client secrets
var clientSecrets = require('./client-info.js');

//app object
const app = new express();

//use libraries through app
app.use(express.static(path.join(__dirname, 'views/public'))) //allow access to everything in public file
.use(cors())
.use(cookieParser());

//set app to use ejs engine
app.set('view engine', 'ejs');


//global vars
const PORT = 8888;
const MAX_TRACKS = 50;
var stateKey = 'spotify_auth_state';
var redirect_uri = 'http://localhost:8888/callback';
var redirect_top_songs = 'http://localhost:8888/top-songs-redirect';
var redirect_top_artists = 'http://localhost:8888/top-artists-redirect';
var redirect_home = 'http://localhost:8888';

//TODO: better system for these global vars
var loggedin = false;
var access_token;
var refresh_token;
//login
var display_name;
var login_image;
//top songs
var top_songs_artists;
var top_songs_name;
var top_songs_albums;
var top_songs_albums_images;
var top_tracks_limit = 25;
var top_tracks_time = 'short_term';
//top artists
var top_artists_names;
var top_artists_images;

//connect to home page (index.ejs)
app.get('/', function(request, response) {
  response.render('public/index', {
    display_name: display_name,
    login_image: login_image
  });
});

//make the server actually listen to site
app.listen(PORT, () => console.log('App Listening at http://localhost: ' + PORT));


/**
* Login redirect.
*/
app.get('/login', function(req, res) {
  //set cookie
  state = generateRandomString(16);
  res.cookie(stateKey, state);

  //call API
  var scope = 'user-read-private user-read-email user-top-read';
  apiInitCall(scope, redirect_uri, res);
});


/**
* Get request from html page for top songs.
*/
app.get('/get-top-songs', function(req, res) {
  //set cookie
  state = generateRandomString(16);
  res.cookie(stateKey, state);

  //call API
  var scope = 'user-read-private user-read-email user-top-read';
  apiInitCall(scope, redirect_top_songs, res);
});


/**
* Page for seeing users top songs.
* Contains all data sent to page.
*/
app.get('/top-songs', function(req, res) {
  res.render('public/index', {
    display_name: display_name,
    login_image: login_image,
    top_artists: top_songs_artists,
    top_songs: top_songs_name,
    top_albums: top_songs_albums,
    time_length: timeLimitDisplay(top_tracks_time),
    top_albums_images: top_songs_albums_images
  });
});


/**
* Page for seeing users top songs.
* Contains all data sent to page.
*/
app.get('/top-artists', function(req, res) {
  res.render('public/index', {
    display_name: display_name,
    login_image: login_image,
    top_artists_names: top_artists_names,
    top_artists_images: top_artists_images,
    time_length: timeLimitDisplay(top_tracks_time)
  });
});



app.get('/get-top-artists', function(req, res) {
  //set cookie
  state = generateRandomString(16);
  res.cookie(stateKey, state);

  //call API
  var scope = 'user-read-private user-read-email user-top-read';
  apiInitCall(scope, redirect_top_artists, res);
});

/**
* Page for seeing users top songs.
* Contains all data sent to page.
*/
app.get('/top-artists', function(req, res) {
  console.log("we out here");
  // res.render('public/index', {
  //     display_name: display_name,
  //     login_image: login_image,
  //     top_artists: top_artists,
  //     top_songs: top_songs,
  //     top_albums: top_albums,
  //     time_length: timeLimitDisplay(top_tracks_time),
  //     top_albums_images: top_albums_images
  // });
});




/**
* Render home page with user logged in.
*/
app.get('/render-login', function(req, res){
  res.render('public/index', {
    display_name: display_name,
    login_image: login_image
  });
});


/**
* Request users top tracks.
* NOTE: this link needs to be whitelisted.
*/
app.get('/top-songs-redirect', function(req, res) {
  var url = 'https://api.spotify.com/v1/me/top/tracks'
  + '?limit=' + top_tracks_limit + '&time_range=' + top_tracks_time;
  var redirect_auth = redirect_top_songs;
  apiReqData(url, redirect_auth, req, res);
});


/**
* Request users top artists.
* NOTE: this link needs to be whitelisted.
*/
app.get('/top-artists-redirect', function(req, res) {
  var url = 'https://api.spotify.com/v1/me/top/artists'
  + '?limit=' + top_tracks_limit + '&time_range=' + top_tracks_time; //TODO: seperate the params from songs?
  var redirect_auth = redirect_top_artists;
  apiReqData(url, redirect_auth, req, res);
});



/**
* Call back from login "page".
*/
app.get('/callback', function(req, res) {
  var url = 'https://api.spotify.com/v1/me';
  var redirect_auth = redirect_uri;
  apiReqData(url, redirect_auth, req, res);
});


/**
* Update the current tracks being displayed in the top songs page.
*/
app.get('/new-tracks-form', function(req, res) {
  console.log("User requested \"" + req.query.track_amount + "\" top tracks, on \"" + req.query.time_length +"\" length.");

  top_tracks_time = req.query.time_length; //TODO: verify?
  if (req.query.track_amount > 0 && req.query.track_amount <= MAX_TRACKS){
    top_tracks_limit = req.query.track_amount;
    res.redirect('/get-top-songs');
  } else {
    //invalid track amount redirect
    res.redirect('/top-songs#' +
    querystring.stringify({
      error: 'invalid_track_amount'
    })
  );
}
});


/**
* Get new access token via refresh token.
* Taken from spotify web tutorial.
* NOTE: Not currently in use.
*/
app.get('/refresh_token', function(req, res) {
  console.log('refreshing token');

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer.from(clientSecrets.client_id + ':' + clientSecrets.client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  if (!error && response.statusCode === 200) {
    request.post(authOptions, function(error, response, body) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    });
  }
});



/**
* Start a call to spotify API from start of the suthorization flow.
* @param {scope} - string represeting the scope of this call - see: https://developer.spotify.com/documentation/general/guides/scopes/
* @param {redirect_link} - redirect to server call which POST's request to API
* @param {res} - response var from server
*/
function apiInitCall(scope, redirect_link, res){
  res.redirect('https://accounts.spotify.com/authorize?' +
  querystring.stringify({
    response_type: 'code',
    client_id: clientSecrets.client_id,
    scope: scope,
    redirect_uri: redirect_link,
    state: state
  })
);
};


/**
* Method for querying the spotify API.
* @param {url} - get request to be made to the api.
* @param {redirect_auth} - url to redirect to upon authorization.
* @param {req} - Http request.
* @param {res}- Http response.
*/
function apiReqData(url, redirect_auth, req, res){
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
    querystring.stringify({
      error: 'state_mismatch'
    }));
  } else {
    res.clearCookie(stateKey);

    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_auth,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer.from(clientSecrets.client_id + ':' + clientSecrets.client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        access_token = body.access_token;
        refresh_token = body.refresh_token;

        var options = {
          url: url,
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          // console.log(body);
          if(!loggedin){
            loggedin = true;
            parseApiLogin(body, res);
          }
          if(loggedin && body.hasOwnProperty('items')){
            //TODO length check? and more sustainable system
            if(isTrack(body.items[0])){
              parseApiTracks(body, res);
            } else if (isArtist(body.items[0])){
              parseApiArtists(body, res);
            }
          }
        });
      } else {  //error
        res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        })
      );
    }});
  }
}


/**
* Method which redirects from render-login back to the home page.
*/
function parseApiLogin(obj, res){
  display_name = obj.display_name;
  login_image = obj.images[0].url;
  res.redirect('/');
}


/**
* Method for parsing the tracks obtained via the top tracks get request.
* Redirects user to the top-songs page upon completion.
* @param {obj} - JSON object.
* @param {obj} - Http response.
*/
function parseApiTracks(obj, res){
  /*
  Useful info for top tracks
  Artists    = obj.items[x].artists[y]
  Song name  = obj.items[x].name
  Album name = obj.items[x].album.name
  Album image = obj.items[x].album.images[0].url

  */
  top_songs_artists = new Array(obj.items.length);
  top_songs_name = new Array(obj.items.length);
  top_songs_albums = new Array(obj.items.length);
  top_songs_albums_images = new Array(obj.items.length);

  for (let i = 0; i < obj.items.length; i++){
    //get all artists
    var artists = obj.items[i].artists;

    var artists_string = '';
    for (let j = 0; j < artists.length; j++){
      artists_string += artists[j].name;
      if (j != artists.length - 1){
        artists_string += ', ';
      }
    }

    //add to respective arrays
    top_songs_artists[i] = artists_string;
    top_songs_name[i] = obj.items[i].name;
    top_songs_albums[i] = obj.items[i].album.name;
    top_songs_albums_images[i] = obj.items[i].album.images[0].url;
  }

  res.redirect('/top-songs');
}



/**
* Method for parsing the artists obtained via the top artists get request.
* Redirects user to the top-artists page upon completion.
* @param {obj} - JSON object.
* @param {obj} - Http response.
*/
function parseApiArtists(obj, res){
  top_artists_names = new Array(obj.items.length);
  top_artists_images = new Array(obj.items.length); // TODO: NOTE: images is USUALLY 3 long
  // console.log(obj);
  for (let i = 0; i < obj.items.length; i++){
    top_artists_names[i] = obj.items[i].name;
    //parse images url
    var image_refs = new Array(obj.items[i].images.length);
    for (let j = 0; j < obj.items[i].images.length; j++){
      image_refs[j] = obj.items[i].images[j].url;
    }
    top_artists_images[i] = image_refs;
  }

  res.redirect('/top-artists');
}


/**
* Method for returning string to display relative to time length.
* @param  {time_length} - Value of time length in form.
*/
var timeLimitDisplay = function(time_length){
  switch (time_length) {
    case "short_term": return "the Last Four Weeks";
    case "medium_term": return "the Last Six Months";
    case "long_term": return "All Time";
  }
  //TODO: error case
  return "error";
}

/**
* Checks if an object is an artists based on the simplified artist object.
* Reference: https://developer.spotify.com/documentation/web-api/reference/object-model/#artist-object-simplified.
* @param  {object} - Object being compared to see if it is an artist.
*/
var isArtist = function(object){
  return object.hasOwnProperty("external_urls")
  && object.hasOwnProperty("href")
  && object.hasOwnProperty("id")
  && object.hasOwnProperty("name")
  && object.hasOwnProperty("type")
  && object.hasOwnProperty("uri");
}

/**
* Checks if an object is a track based on the simplified track object.
* Could use full track  object but even the simple one ahs more than enough parameters to ensure object is a track.
* Reference: https://developer.spotify.com/documentation/web-api/reference/object-model/#track-object-simplified.
* @param  {object} - Object being compared to see if it is a track.
*/
var isTrack = function(object){
  return object.hasOwnProperty("album")
  && object.hasOwnProperty("artists")
  && object.hasOwnProperty("available_markets")
  && object.hasOwnProperty("disc_number")
  && object.hasOwnProperty("duration_ms")
  && object.hasOwnProperty("explicit")
  && object.hasOwnProperty("external_urls")
  && object.hasOwnProperty("href")
  && object.hasOwnProperty("id")
  && object.hasOwnProperty("name")
  && object.hasOwnProperty("preview_url")
  && object.hasOwnProperty("track_number")
  && object.hasOwnProperty("type")
  && object.hasOwnProperty("uri")
  && object.hasOwnProperty("is_local")
  ;
}

/**
* (Taken from web tutorial)
* Generates a random string containing numbers and letters, used for cookie.
* @param  {number} length The length of the string
* @return {string} The generated string
*/
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

//libraries used
var express = require('express');
const path = require('path');
var request = require('request');
var ejs = require('ejs');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
//local libraries used
var clientSecrets = require('./client-info.js'); //You will need to create your own client-info.js file
var parsingHelper = require('./parsing-helper.js');

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
var stateKey = 'spotify_auth_state';
//links to redirect form spotify service from - MUST BE WHITELISTED
var redirect_uri = 'http://localhost:8888/callback';
var redirect_top_songs = 'http://localhost:8888/top-songs-redirect';
var redirect_top_artists = 'http://localhost:8888/top-artists-redirect';
//general global vars
const MAX_TRACKS = 50;
var loggedin = false;
var access_token;
var refresh_token;
//get req vars
var top_tracks_limit = 25;
var top_tracks_time = 'short_term';
// data from server stored in moemory
var loggedInData;
var topSongsData;
var topArtistsData;


/**
 * Connect to home page (index.ejs).
 */
app.get('/', function(request, response) {
  if (!loggedin){
    //render with no user data
    response.render('public/index', {});
  } else {
    //render with user's image
    response.render('public/index', {
      display_name: loggedInData.display_name,
      login_image: loggedInData.login_image
    });
  }
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
* Login redirect.
*/
app.get('/logout', function(req, res) {
  //set cookie
  res.clearCookie(stateKey);
  loggedin = false;
  loggedInData = undefined;
  res.redirect('/');
});


/**
* Call back from login "request.
* Used for authentication.
*/
app.get('/callback', function(req, res) {
  var url = 'https://api.spotify.com/v1/me';
  var redirect_auth = redirect_uri;
  apiReqData(url, redirect_auth, req, res);
});


/**
* Page for seeing users top songs.
* Contains all data sent to page.
*/
app.get('/top-songs', function(req, res) {
  if(!loggedin){
    //TODO: redirect to a login popup
    res.redirect('/');
  } else {
    res.render('public/index', {
      display_name: loggedInData.display_name,
      login_image: loggedInData.login_image,
      top_artists: topSongsData.top_songs_artists,
      top_songs: topSongsData.top_songs_name,
      top_albums: topSongsData.top_songs_albums,
      top_albums_images: topSongsData.top_songs_albums_images,
      time_length: timeLimitDisplay(top_tracks_time),
    });
  }
});


/**
* Page for seeing users top songs.
* Contains all data sent to page.
*/
app.get('/top-artists', function(req, res) {
  if(!loggedin){
    //TODO: redirect to a login popup
    res.redirect('/');
  } else {
    res.render('public/index', {
      display_name: loggedInData.display_name,
      login_image: loggedInData.login_image,
      top_artists_names: topArtistsData.top_artists_names,
      top_artists_images: topArtistsData.top_artists_images,
      time_length: timeLimitDisplay(top_tracks_time)
    });
  }
});


/**
 * Get request from html page to server for updating user's top artists.
 */
app.get('/get-top-artists', function(req, res) {
  //set cookie
  state = generateRandomString(16);
  res.cookie(stateKey, state);

  //call API
  var scope = 'user-read-private user-read-email user-top-read';
  apiInitCall(scope, redirect_top_artists, res);
});


/**
* Get request from html page to server for updating user's top songs.
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
* Update the current tracks being displayed in the top songs page.
* Is the call point from html page to update the songs list.
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
      error: 'invalid_songs_amount'
    }));
  }
});


/**
* Update the current tracks being displayed in the top songs page.
* Is the call point from html page to update the artists list.
*/
app.get('/new-artists-form', function(req, res) {
  console.log("User requested \"" + req.query.track_amount + "\" top artists, on \"" + req.query.time_length +"\" length.");

  top_tracks_time = req.query.time_length; //TODO: verify?
  if (req.query.track_amount > 0 && req.query.track_amount <= MAX_TRACKS){
    top_tracks_limit = req.query.track_amount;
    res.redirect('/get-top-artists');
  } else {
    //invalid track amount redirect
    res.redirect('/top-artists#' +
    querystring.stringify({
      error: 'invalid_artists_amount'
    }));
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
            loggedInData = parsingHelper.parseApiLogin(body);
            res.redirect('/');
          }
          if(loggedin && body.hasOwnProperty('items')){
            //TODO length check?
            if(parsingHelper.isTrack(body.items[0])){
              //parse songs
              topSongsData = parsingHelper.parseApiTracks(body);
              res.redirect('/top-songs');
            } else if (parsingHelper.isArtist(body.items[0])){
              //parse artists
              topArtistsData = parsingHelper.parseApiArtists(body);
              res.redirect('/top-artists');
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

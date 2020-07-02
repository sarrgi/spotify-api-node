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
* Method which parses a login object so that it can be stored in the server.
* @param {obj} - JSON object being parsed.
*/
var parseApiLogin = function(obj) {
  var loggedInData = {
    user_id: obj.display_name,
    login_image: obj.images[0].url
  };
  return loggedInData;
}


/**
* Method for parsing the tracks obtained via the top tracks get request.
* @param {obj} - JSON object being parsed.
*/
var parseApiTracks = function(obj){
  var topSongsData = {
    top_songs_artists: new Array(obj.items.length),
    top_songs_name: new Array(obj.items.length),
    top_songs_albums: new Array(obj.items.length),
    top_songs_albums_images: new Array(obj.items.length)
  };

  for (let i = 0; i < obj.items.length; i++){
    //concatenate all artist(s)
    var artists = obj.items[i].artists;
    var artists_string = '';
    for (let j = 0; j < artists.length; j++){
      artists_string += artists[j].name;
      if (j != artists.length - 1){
        artists_string += ', ';
      }
    }

    //add to respective arrays
    topSongsData.top_songs_artists[i] = artists_string;
    topSongsData.top_songs_name[i] = obj.items[i].name;
    topSongsData.top_songs_albums[i] = obj.items[i].album.name;
    topSongsData.top_songs_albums_images[i] = obj.items[i].album.images[0].url;
  }

  return topSongsData;
}


/**
* Method for parsing the artists obtained via the top artists get request.
* @param {obj} - JSON object being parsed.
*/
var parseApiArtists = function (obj){
  var topArtistsData = {
    top_artists_names: new Array(obj.items.length),
    top_artists_images: new Array(obj.items.length) //NOTE: images is USUALLY 3 long
  }
  // console.log(obj);
  for (let i = 0; i < obj.items.length; i++){
    topArtistsData.top_artists_names[i] = obj.items[i].name;
    //parse images url
    var image_refs = new Array(obj.items[i].images.length);
    for (let j = 0; j < obj.items[i].images.length; j++){
      image_refs[j] = obj.items[i].images[j].url;
    }
    topArtistsData.top_artists_images[i] = image_refs;
  }

  return topArtistsData;
}


module.exports = {isArtist, isTrack, parseApiLogin, parseApiTracks, parseApiArtists}

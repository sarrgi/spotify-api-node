/**
* Checks if an object is an artists based on the simplified artist object.
* Reference: https://developer.spotify.com/documentation/web-api/reference/object-model/#artist-object-simplified.
* @param  {object} - Object being compared to see if it is an artist.
*/
var isArtist = function(object){
  return object.hasOwnProperty("type")
    && object.type === "artist";
}


/**
* Checks if an object is a playlist based on the simplified playlist object.
* Reference: https://developer.spotify.com/documentation/web-api/reference/object-model/#playlist-object-simplified.
* @param  {object} - Object being compared to see if it is a playlist.
*/
var isPlaylist = function(object){
  return object.hasOwnProperty("type")
    && object.type === "playlist";
}


/**
* Checks if an object is a track based on the simplified track object.
* Reference: https://developer.spotify.com/documentation/web-api/reference/object-model/#track-object-simplified.
* @param  {object} - Object being compared to see if it is a track.
*/
var isTrack = function(object){
  return object.hasOwnProperty("type")
    && object.type === "track";
}


/**
* Method which parses a login object so that it can be stored in the server.
* @param {obj} - JSON object being parsed.
*/
var parseLogin = function(obj) {
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
var parseTracks = function(obj){
  var topSongsData = {
    //TODO: fix naming
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
var parseArtists = function (obj){
  var topArtistsData = {
    //TODO: fix naming
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


/**
* Method for parsing the artists obtained via the top artists get request.
* @param {obj} - JSON object being parsed.
*/
var parsePlaylists = function (obj){
  var playlistsData = {
    id:  new Array(obj.items.length),
    description:  new Array(obj.items.length),
    images:  new Array(obj.items.length),
    name:  new Array(obj.items.length),
    owner:  new Array(obj.items.length),
    isPublic:  new Array(obj.items.length),
    tracks:  new Array(obj.items.length),
    uri :  new Array(obj.items.length)
  }

  for (let i = 0; i < obj.items.length; i++){
    //parse images url
    var image;
    if (obj.items[i].images.length == 0){
      //case for no image
      image = null;
    } else {
      image = obj.items[i].images[0].url;
    }
    playlistsData.images[i] = image;
    playlistsData.id[i] = obj.items[i].id;
    playlistsData.description[i] = obj.items[i].description;
    playlistsData.name[i] = obj.items[i].name;
    playlistsData.owner[i] = obj.items[i].owner.display_name;
    playlistsData.isPublic[i] = obj.items[i].public;
    playlistsData.tracks[i] = obj.items[i].tracks;
    playlistsData.uri[i] = obj.items[i].uri;
  }

  return playlistsData;
}

module.exports = {isArtist, isTrack, isPlaylist, parseLogin, parseTracks, parseArtists, parsePlaylists}

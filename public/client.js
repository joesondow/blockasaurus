// client-side js
// run by the browser each time your view template is loaded

var logout = function() {
    sessionStorage.removeItem('accessTokenPair');
    jQuery('#twitterUser').html('');
};

(function() {
  "use strict";
  
   $.urlParam = function(name){
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results == null){
         return null;
      }
      else{
         return results[1] || null;
      }
  }
  
  var validateAccessTokenPair = function(accessTokenPair) {
    
    if (accessTokenPair) {
      jQuery.ajax({
        method: "POST",
        url: '/validate-user',
        data: {
          accessTokenPair: accessTokenPair
        },
        success: function(user) {
          login(accessTokenPair, user);
        },
        error: function(data) {
          logout();
        }
      });
    }
  };
  
  // Look for token pair
  var accessTokenPair;
  if (window.blockasaurus && window.blockasaurus.accessTokenPair) {
    accessTokenPair = window.blockasaurus.accessTokenPair;
  }
  if (!accessTokenPair) {
    accessTokenPair = sessionStorage.getItem('accessTokenPair');
  }
  if (!accessTokenPair) {
    console.log('access token pair not found');
  }
  
  validateAccessTokenPair(accessTokenPair);  
    
  var login = function(accessTokenPair, user) {
    sessionStorage.setItem('accessTokenPair', accessTokenPair);
    jQuery('#input_logged_in').val(true);
    
    // If url param logged_in is not present, add it.
    if (jQuery.urlParam('logged_in') === 'true') {
      // console.log('url param found');
      // Show the user's profile pic
      var profilePicUrlHttps = user.profile_image_url_https;
      var screenName = user.screen_name;
      var displayName = user.name;
      jQuery('#twitterUser').html('Logged in: @'+ screenName + ' <a href="javascript:logout()">Logout</a>');
    } else {
      // console.log('url param NOT found');
      var sep = window.location.href.indexOf('?') > -1 ? '&' : '?';
      var url = window.location.href + sep + 'logged_in=true';
      window.location.replace(url);
    }
  };
  
  var checkRateLimits = function() {
    jQuery.ajax({
      method: "GET",
      url: "/check-rate-limits",
      data: {
        accessTokenPair: accessTokenPair
      },
      success: function(data) {
        // data is an array of objects.

        for (var i = 0; i < data.length; i++) {
          var friendship = data[i];
          var screenName = friendship.screen_name;
          var idStr = friendship.id_str;
          var connections = friendship.connections;
          if (connections && connections.some(conn => conn === "blocking")) {
            console.log("Already blocked " + screenName);
            jQuery('#td_status_' + screenName).html('Already blocked');
          } else {
            console.log("Not yet blocked " + screenName);
          }
        }
      },
      error: function(data) {}
    });
  };
  
  var checkFriendships = function() {
    jQuery.ajax({
      method: "POST",
      url: "/check-friendships",
      data: {
        screenNames: window.blockasaurus.screenNamesToBlock.join(","),
        accessTokenPair: accessTokenPair
      },
      success: function(data) {
        // data is an array of objects.

        for (var i = 0; i < data.length; i++) {
          var friendship = data[i];
          var screenName = friendship.screen_name;
          var idStr = friendship.id_str;
          var connections = friendship.connections;
          if (connections && connections.some(conn => conn === "blocking")) {
            console.log("Already blocked " + screenName);
            jQuery('#td_status_' + screenName).html('Already blocked');
          } else {
            console.log("Not yet blocked " + screenName);
          }
        }
      },
      error: function(data) {}
    });
  };

  if (window.blockasaurus.screenNamesToBlock) {
    checkFriendships();
  }
  
  // Get the Twitter credentials.
//   var trex = window.blockasaurus;
//   if (trex) {
//     var accessToken = trex.twitterTokens.access_token_key;
//     var accessTokenSecret = trex.twitterTokens.access_token_secret;
//     var screenNamesToBlock = trex.screenNamesToBlock;
//     var screenNameStatuses = {};

//     for (var k = 0; k < screenNamesToBlock.length; k++) {
//       var handle = screenNamesToBlock[k];
//       screenNameStatuses[handle] = {status: "tbd"};
//     }
//   }
  
})();

// server.js
// where your node app starts

// init project
var express = require("express");
var OAuth = require("oauth");

var app = express();

// fill with keys provided by Twitter
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;

// Hard-coded temporarily during development
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

// enable this through twitter's app management panel
const CALLBACK_SERVER = process.env.CALLBACK_SERVER;
const CALLBACK_RESOURCE = '/access-token';
const CALLBACK_URL = CALLBACK_SERVER + CALLBACK_RESOURCE;

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var ejs = require('ejs');

var Twitter = require('twitter');

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

function parse_blocklist(blocklist) {
  var tokens = blocklist.split(/[^_A-Za-z0-9]/);
  var screenNamesSet = new Set();
  var screenNames = [];
  var skipTokens = ["https", "http", "twitter", "com", "status"];
  tokens.forEach(token => {
    if (
      token.length >= 4 &&
      token.length <= 15 &&
      !skipTokens.includes(token.toLowerCase())
    ) {
      screenNamesSet.add(token);
    }
  });
  screenNamesSet.forEach(screenname => {
    screenNames.push(screenname);
  });
  return screenNames;
}

// function eval_report(report) {
//   if (typeof report != "undefined") {
//     return true;
//   } else {
//     return false;
//   }
// }

function blockAll(client, accounts, report = false, cursor = null) {
  accounts.forEach(screen_name => {
    if (report) {
      report_and_block(client, screen_name);
    } else {
      block(client, screen_name);
    }
  });
}

function report_and_block(client, screen_name) {
  client.post(
    "users/report_spam.json",
    { screen_name: screen_name, perform_block: true },
    function(error, response) {
      if (error) {
        console.log(error);
      } else {
        console.log("blocked and reported @" + screen_name);
      }
    }
  );
}

function block(client, screen_name) {
  client.post("blocks/create.json", { screen_name: screen_name }, function(
    error,
    response
  ) {
    if (error) {
      console.log(error);
    } else {
      console.log("blocked @" + screen_name);
    }
  });
}

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/faq", function(request, response) {
  response.sendFile(__dirname + "/views/faq.html");
});

app.post("/block", function(request, response) {
  var accounts = parse_blocklist(request.body.blocklist);
  // var tweet_url = request.body.tweet_url;
  // var report = eval_report(request.body.report);
  //Starts twitter and authenticates
  var client = new Twitter({
    consumer_key: request.body.consumer_key,
    consumer_secret: request.body.consumer_secret,
    access_token_key: request.body.access_token,
    access_token_secret: request.body.access_token_secret
  });
  blockAll(client, accounts);
  client = null;
  ejs.renderFile(
    __dirname + "/views/block.ejs",
    {},
    function(err, str) {
      response.send(str);
    }
  );
});

function get_twitter_oauth(blocklist) {
  return new OAuth.OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    CONSUMER_KEY,
    CONSUMER_SECRET,
    "1.0A",
    CALLBACK_URL + "?blocklist=" + encodeURIComponent(blocklist),
    "HMAC-SHA1"
  );
}

app.post("/request-token", function(request, response) {

  var blocklist = request.body.blocklist;
  var uriEncodedBlocklist = encodeURIComponent(blocklist);
  
  if (request.body.logged_in === 'true') {
    // Assume creds are in sessionStorage and client JS can log in already, 
    // so redirect to access-token
    response.redirect(CALLBACK_RESOURCE + '?logged_in=true&blocklist=' + uriEncodedBlocklist);
  } else {
    // Logged out, need to authenticate
    var client = new Twitter({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET
    });
    // request an unauthorized Request Token from twitter (OAuth1.0 - 6.1)
    var oa = get_twitter_oauth(blocklist);
    oa.getOAuthRequestToken(function(
      error,
      request_token,
      request_secret,
      results
    ) {
      if (!error) {
        // send the user to authorize the Request Token (OAuth1.0 - 6.2)
        response.redirect(
          "https://api.twitter.com/oauth/authorize?oauth_token=" + request_token
        );
      } else {
        response.send(error);
      }
    });
  }
});

function renderBlockEjs(response, data) {
  ejs.renderFile(
      __dirname + "/views/block.ejs",
      data,
      function(err, str) {
        response.send(str);
      }
    );
}

app.get(CALLBACK_RESOURCE, function(request, response) {
  var blocklist = request.query.blocklist;
  var accounts = parse_blocklist(blocklist);
  console.log(CALLBACK_RESOURCE + ' ' + blocklist);

  if (request.query.logged_in === 'true') {
    renderBlockEjs(response, { accounts: accounts, accessTokenPair: '' });
  } else {
    // get the authorized Request Token from the GET parameters
    var request_token = request.query.oauth_token;
    var oauth_verifier = request.query.oauth_verifier;

    // This has never worked in poop-blocker or Blockasaurus because reportauth is not the name of the form input.
    // I might fix and test this feature in the future. For now, it's meaningless.
    // var report = eval_report(request.body.reportauth);

    var oa = get_twitter_oauth(accounts);
    // exchange the authorized Request Token for an Access Token (OAuth1.0 - 6.3)
    oa.getOAuthAccessToken(request_token, null, oauth_verifier, function(
      error,
      access_token,
      access_token_secret,
      results
    ) {
      if (!error) {
        var client = new Twitter({
          consumer_key: CONSUMER_KEY,
          consumer_secret: CONSUMER_SECRET,
          access_token_key: access_token,
          access_token_secret: access_token_secret
        });
        var accessTokenPair = access_token + "," + access_token_secret;
        // try {
        //   blockAll(client, accounts);
        // } catch (error) {
        //   response.send(error);
        //   return;
        // }
        client = null;
        console.log('accessTokenPair ' + accessTokenPair);
        renderBlockEjs(response, { accounts: accounts, accessTokenPair: accessTokenPair });
      }
      else {
        console.log(error)
        response.send(error);
      }
    });
  }
  
  
});

function makeClient(accessTokenPair) {
  
  var accessToken, accessTokenSecret;
  var tokens = accessTokenPair.split(',');
  if (tokens.length === 2) {
    accessToken = tokens[0];
    accessTokenSecret = tokens[1];
  } else {
    throw 'Invalid credentials';
  }
  
  return new Twitter({
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
    access_token_key: accessToken,
    access_token_secret: accessTokenSecret
  });
}


app.post("/check-friendships", function(request, response) {
  var accessTokenPair = request.body.accessTokenPair;
  
  
  // var access_token = request.body.access_token;
  // var access_token_secret = request.body.access_token_secret;
  var screenNamesCsv = request.body.screenNames;
  
  var client = makeClient(accessTokenPair);
  try {
    client.get(
      "friendships/lookup",
      { screen_name: screenNamesCsv },
      function(error, friendships, resp) {
        if (error) {
          response.json(error);
        } else {
          response.json(friendships);
        }
      }
    );
  } catch (error) {
    response.json(error);
    return;
  }
  client = null;
});

app.post('/validate-user', function(request, response) {
  var accessTokenPair = request.body.accessTokenPair;
  console.log('validate-user accessTokenPair '+ accessTokenPair);
  var client = makeClient(accessTokenPair);
  try {
    client.get(
      'account/verify_credentials',
      {},
      function(error, user, resp) {
        if (error) {
          response.json(error);
        } else {
          response.json(user);
        }
      }
    );
  } catch (error) {
    response.json(error);
    return;
  }
  client = null;
});



// app.post("/block-one", function(request, response) {
//   var access_token = request.body.access_token;
//   var access_token_secret = request.body.access_token_secret;
//   var target_account = request.body.target_account;
// });

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

// server.js
// where your node app starts

// init project
var express = require('express');
var OAuth = require('oauth');

var app = express();

// fill with keys provided by Twitter
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
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
  var skipTokens = ["https", "http", "twitter", "com", "status", ]
  // var tokens = blocklist.split(/[ ,\n]/);
  // console.log(tokens.length);
  tokens.forEach((token) => {
    // console.log("--" + token + "--");
    if (token.length >= 4 && token.length <= 15 && !skipTokens.includes(token)) {
      screenNamesSet.add(token);
    }
  });
  screenNamesSet.forEach((screenname) => {
    screenNames.push(screenname);
  });
  screenNames.forEach((screenName) => {
    // console.log("++" + screenName + "++");
  });
  return screenNames;
}

function eval_report(report){
  if (typeof report != 'undefined') {
    return true;
  } else {
    return false;
  }
}

function blockAll(client, accounts, report=false, cursor=null) {
  accounts.forEach((screen_name) => {
    if (report){
      report_and_block(client, screen_name);
    } else {
      block(client, screen_name);
    }
  });
}

function report_and_block(client, screen_name) {
  client.post(
    'users/report_spam.json',
    {screen_name: screen_name, perform_block: true},
    function(errors, response) {
      if (errors) {
        // errors.forEach((error) => {
        //   console.log(error['message']);
        console.log(errors);
        // });
      }
      else {
        console.log('user @' + screen_name + ' has been blocked!');
      }
    }
  );
}

function block(client, screen_name){
  client.post(
    'blocks/create.json',
    {screen_name: screen_name},
    function(errors, response) {
      if (errors) {
        console.log(errors);
        // errors.forEach((error) => {
        //   console.log(error['message']);
        // });
      } else {
        console.log('user @' + screen_name + ' has been blocked!');
      }
    }
  );
}


// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


// http://expressjs.com/en/starter/basic-routing.html
app.get('/faq', function(request, response) {
  response.sendFile(__dirname + '/views/faq.html');
});


app.post('/block', function(request, response) {
  var accounts = parse_blocklist(request.body.blocklist);
  // var tweet_url = request.body.tweet_url;
  var report = eval_report(request.body.report);
  //Starts twitter and authenticates
  var client = new Twitter({
    consumer_key: request.body.consumer_key,
    consumer_secret: request.body.consumer_secret,
    access_token_key: request.body.access_token,
    access_token_secret: request.body.access_token_secret
  });
  blockAll(client, accounts, report);
  client = null;
  ejs.renderFile(__dirname + '/views/block.ejs', 
  {},  // {tweet_url: tweet_url}, {},
    function(err, str){
      response.send(str);
    }
  );
});

function get_twitter_oauth(blocklist) {
  return new OAuth.OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    CONSUMER_KEY,
    CONSUMER_SECRET,
    '1.0A',
    CALLBACK_URL + '?blocklist=' + encodeURIComponent(blocklist),
    'HMAC-SHA1'
  );
}

app.post('/request-token', function(request, response) {
  var client = new Twitter({
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
  });
  var blocklist = request.body.blocklist;
  // request an unauthorized Request Token from twitter (OAuth1.0 - 6.1)
  var oa = get_twitter_oauth(blocklist);
  oa.getOAuthRequestToken(function(error, request_token, request_secret, results) {
    if (!error) {
      // send the user to authorize the Request Token (OAuth1.0 - 6.2)
      response.redirect('https://api.twitter.com/oauth/authorize?oauth_token='+request_token);
    }
    else {
      response.send(error);
    }
  });
});

app.get(CALLBACK_RESOURCE, function(request, response) {
  // get the authorized Request Token from the GET parameters
  var request_token = request.query.oauth_token;
  var oauth_verifier = request.query.oauth_verifier;
  var blocklist = request.query.blocklist;
  // console.log("__"+blocklist+"__");
  var accounts = parse_blocklist(blocklist);
  // console.log("__"+accounts.length+"__");
  var report = eval_report(request.body.reportauth);

  var oa = get_twitter_oauth(accounts);
  // exchange the authorized Request Token for an Access Token (OAuth1.0 - 6.3)
  oa.getOAuthAccessToken(request_token, null, oauth_verifier, function(error, access_token, access_token_secret, results) {
    if (!error) {
      var client = new Twitter({
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET,
        access_token_key: access_token,
        access_token_secret: access_token_secret
      });
      try {
        blockAll(client, accounts, report);
      }
      catch (error) {
        response.send(error);
        return;
      }
      client = null;

      ejs.renderFile(__dirname + '/views/block.ejs', 
        {accounts: accounts}, 
        function(err, str) { response.send(str); }
      );
    }
    else {
      response.send(error);
    }
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

var textMeme = require('text-meme');
var path = require('path');
var Twit = require('twit');
var fs = require('fs');
var randomColor = require('randomcolor');
var keys = fs.readFileSync('config.json');
var config = JSON.parse(keys);
var destPath = process.env.OPENSHIFT_DATA_DIR;
var username = 'textmemes';

var T = new Twit({
    consumer_key:         config.consumer_key, 
    consumer_secret:      config.consumer_secret,
    access_token:         config.access_token,
    access_token_secret:  config.access_token_secret
});

var isMention = function(arr) {
  var flag = false;
  arr.forEach(function(entity) {
    if(entity.screen_name === username) {
      flag = true;
    }
  });
  return flag;
};

var getReplyTweet = function(arr, tweetFrom) {
  var replyTweet = '@' + tweetFrom;
  arr.forEach(function(entity) {
    if(entity.screen_name !== username) {
      replyTweet += ' @' + entity.screen_name; 
    }
  });
  return replyTweet;
};

var getText = function(tweetText) {
    if (/"/.test(tweetText)) {
        return tweetText.match(/"(.*?)"/)[1];
    }
    return '';
}


var postImage = function(imageContent, tweet) {
  var tweetId = tweet.id_str;
  var tweetFrom = tweet.user.screen_name;
  T.post('media/upload', { media_data: imageContent }, function (err, data, response) {
    var mediaIdStr = data.media_id_string
    var params = { in_reply_to_status_id: tweetId, status: getReplyTweet(tweet.entities.user_mentions, tweetFrom), media_ids: [mediaIdStr] };

    T.post('statuses/update', params, function (err, data, response) {
      //console.log('replied with text meme');
      //console.log(data);
    });
  });
}

var stream = T.stream('user', { track: username });

stream.on('tweet', function(tweet) {
  if(isMention(tweet.entities.user_mentions) && !tweet.retweeted_status) {
    var text = getText(tweet.text);
    if(text !== '') {
      var filename = textMeme(text, {dest: destPath, delay: 400, background: randomColor({luminosity: 'dark'})});
      var img = path.join(destPath, filename);

      setTimeout(function(img, tweet) {
        fs.readFile(img, { encoding: 'base64' }, function(err, data) {
          if (err) {
            console.log('error');
            console.log(err);
          }
          var imageContent = data;
          postImage(imageContent, tweet);
          fs.unlinkSync(img);
        });
      }, 5000, img, tweet); 
    }
  }
});

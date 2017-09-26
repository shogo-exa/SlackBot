var request = require('request')
var restify = require('restify');
var builder = require('botbuilder');
const loger = require('./log.js');

//=========================================================
// Bot Setup
//=========================================================
// Setup Restify Server
var server = restify.createServer();
var botenv = process.env.BOT_ENV;
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s (%s)', server.name, server.url, botenv);
});
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,  // 環境変数より取得する
    appPassword: process.env.MICROSOFT_APP_PASSWORD // 環境変数より取得する
});

// ボットがメッセージを受け取るURL
server.post('/', connector.listen()); // 例：https://xxx.co.jp/
// server.post('/message/api', connector.listen()); 例：https://xxx.co.jp/message/api

var bot = module.exports = new builder.UniversalBot(connector, [
    (session, args, next) => {
    },
    (session, res, next) => {
        const userSelect = res.response;
        switch (userSelect) {
            case 'MultiDialog':
                break;

            case 'HeroCard':
                break;

            case 'SigninCard':
                break;

            case 'Image':
                break;

            default:

        }
    },
]);
bot.library(require('./Cards').createLibrary());

bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        loger.log("join Member", message);
        var membersAdded = message.membersAdded
            .map((m) => {
                var isSelf = m.id === message.address.bot.id;
                return (isSelf ? message.address.bot.name : m.name);
            })
            .join(', ');

        var reply = new builder.Message()
            .address(message.address)
            .text('いらっしゃいませー ' + membersAdded + ' さん');
        bot.send(reply);
    }
    if (message.membersRemoved) {
        loger.log("join Member", message);
        var membersRemoved = message.membersRemoved
            .map((m) => {
                var isSelf = m.id === message.address.bot.id;
                return (isSelf ? message.address.bot.name : m.name);
            })
            .join(', ');
        var reply = new builder.Message()
            .address(message.address)
            .text('ばいばーい' + membersRemoved);
        bot.send(reply);
    }
});
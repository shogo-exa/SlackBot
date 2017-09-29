var request = require('request')
var restify = require('restify');
var builder = require('botbuilder');
var WebClient = require('@slack/client').WebClient;
var async = require('async')

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

var mbfBot = module.exports = new builder.UniversalBot(connector, [
    (session, args, next) => {
        loger.log("メッセージ", session.message)
        var isReport = false;
        if (session.message.text.substring(0, 4) == "進捗報告") isReport = true;
        if (isReport) {
            loger.log("進捗報告", session)
            session.send("進捗報告を受けます");
            session.beginDialog("Report");
        }
        else {
            session.endConversation();
        }
    },
    (session, args, next) => {
        session.endConversation();
    }]);
mbfBot.dialog("Report", [
    (session, args, next) => {
        var chatData = new builder.Message(session);
        chatData.attachmentLayout(builder.AttachmentLayout.carousel);
        chatData.attachments([
            new builder.HeroCard(session)
                .title('講座選択')
                .text('どの講座を受けましたか?')
                .buttons([
                    builder.CardAction.imBack(session, 'practice1', 'アプリケーション開発者のための機械学習実践講座'),
                    builder.CardAction.imBack(session, 'practice2', 'みんなのAI講座 ゼロからPythonで学ぶ人工知能と機械学習'),
                    builder.CardAction.imBack(session, 'practice3', 'Pythonで機械学習 : scikit-learnで学ぶ識別入門'),
                    builder.CardAction.imBack(session, 'practice4', 'ゼロから作るニューラルネットワーク【Python3 + NumPy】'),
                    builder.CardAction.imBack(session, 'practice5', '【4日で体験】TensorFlow x Python3で学ぶディープラーニング')
                ])
        ]);
        builder.Prompts.text(session, chatData);
    },
    (session, results, next) => {
        loger.log("選択された講座", results)
        const practice = results.response;
        session.endDialogWithResult({ response: practice });
    }
])

// bot.library(require('./Cards').createLibrary());

var slack = new WebClient(process.env.SLACK_BOT_TOKEN);

mbfBot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        loger.log("join Member", message);
        snedMemberInfo(message.membersAdded, true);
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
        reply.text("講座に関する質問はこのチャンネルにしてください")
        bot.send(reply)

    }
    if (message.membersRemoved) {
        loger.log("leave Member", message);
        snedMemberInfo(message.membersAdded, false);
        var membersRemoved = message.membersRemoved
            .map((m) => {
                var isSelf = m.id === message.address.bot.id;
                return (isSelf ? message.address.bot.name : m.name);
            })
            .join(', ');
        var reply = new builder.Message()
            .address(message.address)
            .text('ばいばーい' + membersRemoved);
        mbfBot.send(reply);
    }
});

function snedMemberInfo(userMap, isStart) {
    userMap.map((m) => {
        async.series([(next) => {
            loger.log("userMap", m);
            m.id = m.id.split(":")[0];
            next();

        }, (next) => {
            loger.log("Retrieve Information From : ", m.id);
            slack.users.info(m.id, (err, res) => {
                if (err) {
                    loger.log("Get User Info: Failed", err);
                } else {
                    loger.log("Get User Info: Success", res);
                }
                m.email = res.user.profile.email;
                if (isStart) m.start = getTimeStamp();
                else m.end = getTimeStamp();
                next();

            })
        }], () => {
            loger.log('End Make Info from', m)
            var str = JSON.stringify(m, undefined, 4);
            slack.chat.postMessage(process.env.USER_INFO_DESTINATION, str, (err, res) => {
                loger.console('send : ', res);
            })
        })
    })
    loger.log("maked Info", userMap);
    return userMap;
}

function getTimeStamp() {
    var d = new Date();
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hour = (d.getHours() < 10) ? '0' + d.getHours() : d.getHours();
    var min = (d.getMinutes() < 10) ? '0' + d.getMinutes() : d.getMinutes();
    var sec = (d.getSeconds() < 10) ? '0' + d.getSeconds() : d.getSeconds();
    return year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
}
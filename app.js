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
        loger.log("メッセージ", session.message);
        if (session.message.text == "進捗報告") {
            loger.log("進捗報告", session)
            session.send("進捗報告を受けます");
            session.beginDialog("Report");
        }
        else {
            session.endConversation();
        }
    },
    (session, results, next) => {
        session.send("下記進捗結果を受け付けました");
        session.send("講座：" + session.privateConversationData.practice);
        session.send("セクション：" + session.privateConversationData.section);
        session.send("レクチャー：" + session.privateConversationData.recture);

        sendReport(session);
        session.endConversation();
    }]);
mbfBot.dialog("Report", [
    (session, args, next) => {
        const pra1 = 'アプリケーション開発者のための機械学習実践講座';
        const pra2 = 'みんなのAI講座 ゼロからPythonで学ぶ人工知能と機械学習';
        const pra3 = 'Pythonで機械学習 : scikit-learnで学ぶ識別入門';
        const pra4 = 'ゼロから作るニューラルネットワーク【Python3 + NumPy】';
        const pra5 = '【4日で体験】TensorFlow x Python3で学ぶディープラーニン';

        var chatData = new builder.Message(session);
        chatData.attachmentLayout(builder.AttachmentLayout.carousel);
        chatData.attachments([
            new builder.HeroCard(session)
                .title('講座選択')
                .text('どの講座を受けましたか?')
                .buttons([
                    builder.CardAction.imBack(session, pra1, pra1),
                    builder.CardAction.imBack(session, pra2, pra2),
                    builder.CardAction.imBack(session, pra3, pra3),
                    builder.CardAction.imBack(session, pra4, pra4),
                    builder.CardAction.imBack(session, pra5, pra5)
                ])
        ]);
        builder.Prompts.text(session, chatData);
    },
    (session, results, next) => {
        loger.log("選択された講座", results)
        session.privateConversationData.practice = results.response;

        builder.Prompts.number(session, "セクションは何番まで進みましたか?")
    },
    (session, results, next) => {
        loger.log("セクション数の回答", results);
        session.privateConversationData.section = results.response;

        builder.Prompts.number(session, "レクチャーは何番まで進みましたか？");
    },
    (session, results, next) => {
        loger.log("レクチャー数", results);

        session.privateConversationData.recture = results.response;

        session.endDialog();
    }
])

// bot.library(require('./Cards').createLibrary());

var slack = new WebClient(process.env.SLACK_BOT_TOKEN);

mbfBot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        loger.log("join Member", message);
        var isSelf = false;
        snedMemberInfo(message, true);
        var membersAdded = message.membersAdded
            .map((m) => {
                if (m.id === message.address.bot.id.split(":")[0]) {
                    isSelf = true;
                }
                return m.name
            });
        loger.log("members", membersAdded);
        if (!isSelf && membersAdded) {
            var reply = new builder.Message()
                .address(message.address)
                .text('いらっしゃいませー ' + membersAdded + ' さん');
            mbfBot.send(reply);
            reply.text("講座に関する質問は各チャネルにしてください")
            mbfBot.send(reply)
        }
    }
    if (message.membersRemoved) {
        loger.log("leave Member", message);
        snedMemberInfo(message, false);
        var membersRemoved = message.membersRemoved
            .map((m) => {
                var isSelf = m.id === message.address.bot.id;
                return (isSelf ? message.address.bot.name : m.name);
            })
            .join(', ');
        var reply = new builder.Message()
            .address(message.address)
            .text('おつかれさまでしたー' + membersRemoved + "さん");
        mbfBot.send(reply);
    }
});

function snedMemberInfo(message, isStart) {
    message.membersAdded.map((m) => {
        async.series([(next) => { // api無しで取得できる情報を取得
            loger.log("userMap", m);
            m.id = m.id.split(":")[0];
            m.channel = {}
            m.channel.id = message.sourceEvent.event.channel
            if (isStart) m.start = getTimeStamp();
            else m.end = getTimeStamp();
            next();

        }, (next) => {// apiを使ってユーザー情報を取得
            loger.log("Retrieve Information From : ", m.id);
            slack.users.info(m.id, (err, res) => {
                if (err) {
                    loger.log("Get User Info: Failed", err);
                } else {
                    loger.log("Get User Info: Success", res);
                }
                m.email = res.user.profile.email;
                next();

            })
        }, (next) => {
            slack.channels.info(m.channel.id, (err, res) => {
                if (err) {
                    loger.log("Get User Info: Failed", err);
                } else {
                    loger.log("Get User Info: Success", res);
                }
                m.channel.name = res.channel.name;
                next();
            })
        }], () => {
            loger.log('End Make Info from', m)
            var str = JSON.stringify(m, undefined, 4);
            slack.chat.postMessage(process.env.USER_INFO_DESTINATION, "入退室者情報" + str, (err, res) => {
                loger.console('send : ', res);
            })
        })
    })
}

function sendReport(session) {
    var report = {};
    report.id = getUserIdFromSession(session);
    report.name = session.message.user.name;
    report.time = getTimeStamp();
    report.practice = session.privateConversationData.practice;
    report.section = session.privateConversationData.section;
    report.recture = session.privateConversationData.recture;
    slack.users.info(report.id, (err, res) => {
        if (err) {
            loger.log("Get User Info: Failed", err);
        } else {
            loger.log("Get User Info: Success", res);
        }
        report.email = res.user.profile.email;
        var str = JSON.stringify(report, undefined, 4);
        slack.chat.postMessage(process.env.USER_INFO_DESTINATION, "進捗報告" + str, (err, res) => {
            loger.console('send : ', res);
        })
    })
}

function getUserIdFromSession(session) {
    return session.message.user.id.split(":")[0];
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
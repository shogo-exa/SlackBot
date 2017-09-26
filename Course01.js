const builder = require('botbuilder');
const ConversationV1 = require('watson-developer-cloud/conversation/v1');
const loger = require('./log.js');

//=========================================================
// Conversation Setup
//=========================================================
// Create chat bot
var lib = new builder.Library('Course01');
lib.dialog('/', [
    (session, args, next) => {
    },
]);
// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};
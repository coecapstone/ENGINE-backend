var mongoose = require('mongoose');

var expiration_date = new Date();

//schema for users
var notificaionSchema = mongoose.Schema({
    userID_ref: {
        type:mongoose.Types.ObjectId,
        ref:'User',
        required: true
    },
    Title: {
        type: String,
        required: true
    },
    Message: {
        type: String,
        required: true
    },
    Type: {
        type: String,
        required: true,
    },
    Create_date: {
        type:Date,
        default: Date.now
    },
    expiration_date: {
        type:Date,
        default: expiration_date.setDate(expiration_date.getDate()+30)
    }

});

var Notification = module.exports = mongoose.model('Notification', notificaionSchema);

//this method will add a new notification to the system
module.exports.addNotification = function (notification_info) {

    try{
        Notification.create(notification_info);
    }catch{
        console.log("ERROR: Notification did not pushed to the database");
    }
}

//this method will return all the notification for a given user, given userID
module.exports.getNotifications = function(userID,callback)
{
    Notification.find({userID_ref:userID},callback);
}
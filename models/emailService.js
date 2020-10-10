var nodemailer = require('nodemailer');

var transporter = null;
var mailOptions = null;

module.exports.initialize_transporter = function (service, username, pass)
{
    transporter =  nodemailer.createTransport({
        service: service,
        auth: {
          user: username,
          pass: pass
        }
      });
}

module.exports.Configure_mail_to = function (from,to,subject,text){

    mailOptions = {
        from: from,
        to: to,
        subject: subject,
        //text: text
        html: text       
      };
}


module.exports.SendMail = function ()
{
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}
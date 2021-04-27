//this will allow us to access methods defined in Users model
var Users_ref = require('./Users');
var mongoose = require('mongoose');

//schema for Impersonating
var impersonatingSchema = mongoose.Schema({
    trueName:{
        type:String,
        required: true
    },
    impersonatingName:{
        type:String,
        required: true
    }
});

var Impersonating = module.exports = mongoose.model('Impersonating', impersonatingSchema);

// ---------- Helper functions ---------------------------------

//This validator function will validate Passed in JSON object contains correct data types
function validate_and_copy_passedJSON(JSON_Obj)
{
    var err_list = []; //this will keep all the error messages
    //Empty template of a JSON object
    var Impersonating_JSON_Obj = {
        "trueName":null,
        "impersonatingName":null,
    };

    //check passed in JSON fields have correct data types
    if(typeof JSON_Obj.trueName != 'string')
        err_list.push("True Name is not String type");
    else
        Impersonating_JSON_Obj.trueName = JSON_Obj.trueName;

    if(typeof JSON_Obj.impersonatingName != 'string')
        err_list.push("Name is not String type");
    else
        Impersonating_JSON_Obj.impersonatingName = JSON_Obj.impersonatingName;
    
    if(err_list.length == 0)
        return Impersonating_JSON_Obj;
    else
        return null;
}

// ------- Helper Functions ----------------------

module.exports.isImpersonating = async function(trueName)
{
    try {
    var impEntry = await Impersonating.find({"trueName":trueName});
    if (!impEntry)
        return trueName; // not impersonating, use my real name
    //console.log("impEntry = " + JSON.stringify(impEntry));
    //console.log("impEntry.length = " + impEntry.length);
    if (impEntry.length == 0)
        return trueName; // not impersonating, use my real name
    if (impEntry.length > 1) {
        Impersonating.deleteMany({"trueName": trueName}, {}, async function(err, value) {
            if (err) {
	        callback(err, null);
            } else {
                var existing = await Impersonating.find({"trueName": trueName});
                //console.log("after deleting, existing.length = " + existing.length);
                return trueName;
            }
        });
    }
    //console.log("impEntry[0] = " + JSON.stringify(impEntry[0]));
    if (!impEntry[0].impersonatingName)
        return trueName; // not impersonating, use my real name
    // Don't allow impersonation of a non-user
    var found = await Users_ref.user_exists_inCollection_byUWID(impEntry[0].impersonatingName);
    //console.log("found: " + found);
    if (found == null || !found._id)
        return trueName;

    return impEntry[0].impersonatingName; // return who I am impersonating
    } catch {
        return null;
    }
}

// ------- API functions -------------------------

//Method to add a new Impersonating to the mongoDB 
module.exports.addImpersonating = async function(trueName, impersonatingName, callback)
{
    // Auth check: only developers can impersonate other users
    // XXX this is a stub, implement roles!
    if (trueName != "perseant" && trueName != "yangx38"
        && trueName != "xiyueyao" && trueName != "ab32") {
        callback(`Only developers are authorized to impersonate another user`, null);
    }

    // If there is an existing impersonation, remove it
    var existing = await Impersonating.find({"trueName": trueName});
    if (existing) {
        //console.log("existing.length = " + existing.length + ", deleting");
        Impersonating.deleteMany({"trueName": trueName}, {}, async function(err, value) {
            if (err) {
	        callback(err, null);
            } else {
                var existing = await Impersonating.find({"trueName": trueName});
                //console.log("after deleting, existing.length = " + existing.length);
                finishImpersonating(trueName, impersonatingName, callback);
            }
        });
    } else {
        finishImpersonating(trueName, impersonatingName, callback);
    }
}

async function finishImpersonating(trueName, impersonatingName, callback) {
    // Validate
    const validated_results = validate_and_copy_passedJSON({"trueName":trueName, "impersonatingName":impersonatingName});
    if(validated_results == null)
        return;
        
    // Insert our new impersonation record
    var values = await Impersonating.create(validated_results);
                //var existing = await Impersonating.find({"trueName": trueName});
                //console.log("after creating, existing.length = " + existing.length);
    callback(null, values);
}

//this will allow us to access methods defined in Users model
var Users_ref = require('./Users');

var mongoose = require('mongoose');

//schema for Units
var unitSchema = mongoose.Schema({
    unitName:{
        type:String,
        required: true
    },
    userIDs:[
        {
            ID:{
                type:mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            Admin:{
                type:Boolean,
                required: true
            }
        }
    ],
    subUnitIDs:{
        type:[mongoose.Schema.Types.ObjectId],
        ref:'SubUnit'
    },
    formVisibility:[
        {
            formName:{
                type: String,
                required: true
            },
            visible:{
                type: Boolean,
                required: true
        }
    }
    ]
});

var Unit = module.exports = mongoose.model('Unit', unitSchema);

// ---------- Helper functions ---------------------------------

//This validator function will validate Passed in JSON object contains correct data types
function validate_and_copy_passedJSON(JSON_Obj, callback)
{
    var err_list = []; //this will keep all the error messages
    //Empty template of a department JSON object
    var Unit_JSON_Obj = {
        "unitName":null,
        "userIDs":[],
        "subUnitIDs":[],
        "formVisibility":[]
    };

    //check passed in JSON fields have correct data types
    if(typeof JSON_Obj.unitName != 'string')
        err_list.push("Name is not String type");
    else
        Unit_JSON_Obj.unitName = JSON_Obj.unitName;

    if (!Array.isArray(JSON_Obj.userIDs))
        err_list.push("UserIDs is not array type");
    else
        Unit_JSON_Obj.userIDs = validate_UserIDs(JSON_Obj.userIDs,callback);   

    if (!Array.isArray(JSON_Obj.subUnitIDs))
        err_list.push("subUnitIDs is not array type");
    else
        Unit_JSON_Obj.subUnitIDs = JSON_Obj.subUnitIDs; 
    
    if(err_list.length == 0)
        return Unit_JSON_Obj;
    else
    {
        callback(err_list,null);
        return null;
    }
}

//this function will validate if content inside the userIDs array is correct, if yes return the object, not call the callback
function validate_UserIDs(UserIDs_array, callback){
    var ArrayofIDs = [];
    var dataStruct_JSON = {"ID": null, "Admin":false}
    var errorsFound = false;

    //check types inside the UserIDs array
    for(x=0;x<UserIDs_array.length;x++)
    {
        if(typeof UserIDs_array[x].ID != 'string')
        {
            errorsFound = true;
            break;
        }else
            dataStruct_JSON.ID = UserIDs_array[x].ID;

        
        if(typeof UserIDs_array[x].Admin != 'boolean')
        {
            errorsFound = true;
            break;
        }else
            dataStruct_JSON.Admin = UserIDs_array[x].Admin;

        //finally adding to the array
        ArrayofIDs.push(dataStruct_JSON);
    }

    if(errorsFound)
        callback("userIDs array contains invalid data types")
    else
        return ArrayofIDs;

}

//this function will return all the Units in the colleciton
module.exports.getAllUnits = async function ()
{
    try{
        return (await Unit.find({}));
    }catch //cath will be executed when mongoose cant find the record !
    {
        return null;
    }
    
}

//this function will check whether if given Unit exists in the collection by its ID
module.exports.Unit_exsists_inCollection_byID = async function (UnitID)
{
    try{
        return (await Unit.findById(UnitID));
    }catch //cath will be executed when mongoose cant find the record !
    {
        return null;
    }
    
}

//this function will check whether if given Unit exists in the collection by its name
async function Unit_exsits_inColleciton_byName(Unit_name, owned_department)
{
    try{
        return (await Unit.findOne({"unitName":Unit_name}));
    }catch{
        return null;
    }
}



//this function will help to find if a given userID is alreadye exists in UserIDs => if found true, not found false
function check_UserID_exists_in_UserIDs(userID, Unit_JSON)
{
    console.log(Unit_JSON);
    for(var x=0;x<Unit_JSON.userIDs.length;x++)
        if(Unit_JSON.userIDs[x].ID == userID)
            return true;



    return false;
}

//this function will check if given SubunitID and UnitID
module.exports.check_SubunitID_exsists_in_SubunitIDs_array = async function (SubunitID,UnitID)
{
    try{
        const unitResult = await Unit.find({_id:mongoose.Types.ObjectId(UnitID), subUnitIDs:mongoose.Types.ObjectId(SubunitID)});
        if(unitResult.length ==0) //if not null return it
            return false;
        else
            return true;

    }catch //cath will be executed when mongoose cant find the record !
    {
        return null;
    }
}

//this module will add Subunits to the SubUnitIDs array in subUnit records
module.exports.addSubunits_to_SubUnitIDs_array = async function (SubunitIDs,UnitID)
{
    for(var x=0;x<SubunitIDs.length;x++)
    {
        try{
            const result = await Unit.check_SubunitID_exsists_in_SubunitIDs_array(SubunitIDs[x],UnitID);

            if(result == null) //incase above function fail to execute query return null
                return null;
            else if(result == false)
                await Unit.findByIdAndUpdate({"_id":UnitID},{$push: {subUnitIDs:SubunitIDs[x]}})

        }catch{
            return null;
        }
    }

    return true;
}

module.exports.getAllSubUnitIDs = async function(unitID)
{
    try{
        const result = await Unit.findById(unitID);
        if(result)
            return result.subUnitIDs;
        else
            return null;
    }catch{
        return null;
    }
}

// ---------- End of Helper functions ---------------------------------


// ------- API functions -------------------------

//Method to add a new Unit to the mongoDB 
module.exports.addUnit = async function(unit,callback)
{

    if(await Unit_exsits_inColleciton_byName(unit.unitName,unit.Owned_Department) == null)
    {
        const validated_results = validate_and_copy_passedJSON(unit,callback);
        if(validated_results == null)
            return;
        
        Unit.create(validated_results, callback);
    }
        
    else
        callback(`Unit "${unit.unitName}" exists under units collection`,null);
}


//Method to add add new users to the Unit by ID of the Unit
module.exports.addUsers_to_Unit_byID = async function(unitID,UserIDs_array,callback)
{

    const results_unit = await Unit.Unit_exsists_inCollection_byID(unitID);
    var valid_UserIDs = []; //this will keep track of all the valid User IDs 
    
    //this will filter out all the valid user IDs and save it in valid_UserIDs array
    for(var x=0;x<UserIDs_array.length;x++)
        if(await Users_ref.validate_UserID(UserIDs_array[x].ID))
            valid_UserIDs.push(UserIDs_array[x]);
    
        
    if(results_unit)
    {
        //Now lets remove any userIDs that already exsists in the fetched Unit record
        for(var x=0;x<(valid_UserIDs.length);x++)
            if(check_UserID_exists_in_UserIDs(valid_UserIDs[x].ID,results_unit) == false)
            {
                //now lets push IDs that are not already in the array
                try{
                    await Unit.findByIdAndUpdate({"_id":unitID},{$push: {userIDs:{ID:valid_UserIDs[x].ID, Admin:valid_UserIDs[x].Admin}}})
                }catch{
                    callback(`Error occured inserting ID:${valid_UserIDs[x].ID} to collection`);
                    return;
                }
            }

        callback(null,"Successfully added users");

    }else //means we didn't find the Unit under Units collection
        callback(`UnitID: ${unitID} not found !`,null);

}


//this method will find all the users and return their information given unit ID
module.exports.getUsers_with_information = async function(Unit_ID,callback){
    //this will keep track of all the user information
    var userInfo = [];
    //check unit exisists in the database
    const unit_fetched = await Unit.Unit_exsists_inCollection_byID(Unit_ID);

    if(unit_fetched == null)
    {
        callback(`Invalid Unit ID ${Unit_ID}`,null);
        return;
    }
    //adding all the information to an array
    for(var x=0;x<unit_fetched.userIDs.length;x++)
    {
        var tempInfo = (await Users_ref.User_exsists_inCollection_byID(unit_fetched.userIDs[x].ID)).toObject();
        //adding admin information to the JSON object
        tempInfo.Admin = unit_fetched.userIDs[x].Admin;
        userInfo.push(tempInfo);
    }
        
    //finally send all the information to the client
    callback(null,userInfo);

}


//this will update the users access level given its ID and new accessLevel information
module.exports.update_user_accessLevel = async function(userID,accessLevel,unitID,callback)
{
    var isAdmin = false;
    if(accessLevel == "false")
        isAdmin = false;
    else
        isAdmin = true;

    const results_unit = await Unit.Unit_exsists_inCollection_byID(unitID);
    if(!results_unit)
    {
        callback(`Unit doesnot exists`,null);
        return;
    }

    try{
        //await Unit.findByIdAndUpdate({_id:unitID, 'userIDs.ID':userID},{$set: {'userIDs':{'Admin':isAdmin}}});
        await Unit.updateOne({'_id':unitID, 'userIDs.ID':userID},{'$set':{'userIDs.$.Admin':isAdmin}});
        callback(null,'Successfully updated accessLevel');
    }catch(err){
        console.log(err);
        callback(`Internel Server Error Occured while removing the user`,null);
    }


}

module.exports.remove_user_from_accessLevel = async function(userID,unitID,callback)
{
    const results_unit = await Unit.Unit_exsists_inCollection_byID(unitID);
    if(!results_unit)
    {
        callback(`Unit doesnot exists`,null);
        return;
    }

    try{
        await Unit.findByIdAndUpdate({_id:unitID},{$pull: {'userIDs':{'ID':userID}}});
        callback(null,'Successfully removed user from the unit');
    }catch{
        callback(`Internel Server Error Occured while removing the user`,null);
    }

}

module.exports.Update_unit_name = async function(UnitID, newUnitName, callback)
{
    const results_unit = await Unit.Unit_exsists_inCollection_byID(UnitID);
    if(!results_unit)
    {
        callback(`Unit doesnot exists`,null);
        return;
    }

    try
    {
        await Unit.findById(UnitID,function (err,UnitInfo){

            if(err)
            {
                callback(`Internel Server Error Occured while updating Unit Name`,null);
                return;
            }else
            {
                UnitInfo.unitName = newUnitName;
                UnitInfo.markModified();
                UnitInfo.save();
                callback(null,'Successfully updated Unit Name');
                return;

            }

        });
    }catch
    {
        callback(`Internel Server Error Occured while updating Unit Name`,null);
        return;
    }


}



module.exports.AddFormVisibilityInformation = async function(UnitID, JSON_Obj, callback)
{
    //check if the Unit Exists
    const results_unit = await Unit.Unit_exsists_inCollection_byID(UnitID);
    if(!results_unit)
    {
        callback(`Unit doesnot exists`,null);
        return;
    }

    const JSON_Info = JSON_Obj.formVisibility;
    //if unit exists then we can add form visibility information to the system
    try{

        for(var x=0;x<JSON_Info.length;x++)
            await Unit.findByIdAndUpdate(UnitID,{$push: {formVisibility:JSON_Info[x]}})
        
        callback(null,"Form Information Successfully added");

    }catch{
        callback("Internal server error occured while adding form visibility information",null);
    }
}

module.exports.SetFormVisible_status = async function(UnitID, FormVisibility_Object_ID, visibleStatus, callback)
{
    //convert string to bool
    if(visibleStatus == "false")
        visibleStatus = false;
    else
        visibleStatus = true;

    Unit.updateOne({'_id':UnitID, 'formVisibility._id':FormVisibility_Object_ID},{'$set':{'formVisibility.$.visible':visibleStatus}},callback);

}

module.exports.getFormVisibility_Information = async function(UnitID,callback)
{


    const results_unit = await Unit.Unit_exsists_inCollection_byID(UnitID);
    if(!results_unit)
    {
        callback(`Unit doesnot exists`,null);
        return;
    }else
    {
        callback(null,results_unit.formVisibility);
    }
    
}
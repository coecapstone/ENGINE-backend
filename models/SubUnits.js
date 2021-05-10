//this will allow us to access methods defined in Units model
var Units_ref = require('./Units');
//this will allow us to access methods defined in Users model
var Users_ref = require('./Users');
//this will allows us to use Budget document in this model
var Budget_Model = require('./Budget');

var mongoose = require('mongoose');

//schema for SubUnits

var subUnitScheme = mongoose.Schema({
    subUnitName:{
        type:String,
        required: true
    },
    Submitters_IDs:[
        {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'User'
        }
    ],
    UnitID_ref:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Unit'
    },
    BudgetTable:[Budget_Model]
});

var SubUnit = module.exports = mongoose.model('SubUnit', subUnitScheme);

// ------------------- Helper Functions --------------------------------------------------------

//this function will return all the Units in the colleciton
module.exports.getAllSubUnits = async function ()
{
    try{
        return (await SubUnit.find({}));
    }catch //cath will be executed when mongoose cant find the record !
    {
        return null;
    }
    
}
//This validator function will validate Passed in JSON object contains correct data types
async function validate_and_copy_passedJSON(JSON_Obj, callback) {

    var err_list = []; //this will keep all the error messages

    //Empty template of a subunit JSON object
    var SubUnit_JSON_Obj = {
        "subUnitName": null,
        "Submitters_IDs": [],
        "UnitID_ref": null,
        "BudgetTable":[]
    };

    //Empty template of a Budget JSON object
    var Buget_JSON_Obj = {
        "budgetNumber": null,
        "budgetName": null,
        "startDate": null,
        "endDate": null,
        "approvers": [],
        "approvalLogic": null
    }




    if (typeof JSON_Obj.subUnitName != 'string')
        err_list.push("subUnitName is not String type")
    else
        SubUnit_JSON_Obj.subUnitName = JSON_Obj.subUnitName;
            
    if (!Array.isArray(JSON_Obj.Submitters_IDs))
        err_list.push("Submitters_IDs is not array type")
    else
        SubUnit_JSON_Obj.Submitters_IDs = JSON_Obj.Submitters_IDs;    
        
    if (typeof JSON_Obj.UnitID_ref != 'string')
        err_list.push("UnitID_ref is not String type")
    else
        SubUnit_JSON_Obj.UnitID_ref = JSON_Obj.UnitID_ref;
        
    if (!Array.isArray(JSON_Obj.BudgetTable))
        err_list.push("BudgetTable is not array type")
    else
        //check if client has provided BudgetTable information, if not (if array is empty) we just skip this part 
        if(JSON_Obj.BudgetTable.length > 0)
        {
            for(var x=0;x<JSON_Obj.BudgetTable.length;x++)
            {
                if (typeof JSON_Obj.BudgetTable[x].budgetNumber != 'string')
                    err_list.push(`budgetNumber at BudgetTable element ${x+1} is not String type`)
                else
                    Buget_JSON_Obj.budgetNumber = JSON_Obj.BudgetTable[x].budgetNumber;    
                    
                if (typeof JSON_Obj.BudgetTable[x].budgetName != 'string')
                    err_list.push(`budgetName at BudgetTable element ${x+1} is not String type`)
                else
                    Buget_JSON_Obj.budgetName = JSON_Obj.BudgetTable[x].budgetName;  

                //check if client sent a valid date for start date
                if(Date.parse(JSON_Obj.BudgetTable[x].startDate) == null)
                    err_list.push(`startDate at BudgetTable element ${x+1} is not valid date type`)
                else
                    Buget_JSON_Obj.startDate = new Date(JSON_Obj.BudgetTable[x].startDate);

                //check if client sent a valid date for end date
                if(JSON_Obj.BudgetTable[x].endDate != "" ||  JSON_Obj.BudgetTable[x].endDate != null) //check if there's a date, if not skip this part
                    if(Date.parse(JSON_Obj.BudgetTable[x].endDate) == null)
                        err_list.push(`endDate at BudgetTable element ${x+1} is not valid date type`)
                    else
                        Buget_JSON_Obj.endDate = new Date(JSON_Obj.BudgetTable[x].endDate);

                if (typeof JSON_Obj.BudgetTable[x].approvalLogic != 'string')
                    err_list.push(`approvalLogic at BudgetTable element ${x+1} is not String type`)
                else
                    Buget_JSON_Obj.approvalLogic = JSON_Obj.BudgetTable[x].approvalLogic;  
                
                //check if the approver field contains an array
                if (!Array.isArray(JSON_Obj.BudgetTable[x].approvers))
                    err_list.push(`approvers at BudgetTable element ${x+1} is not array type`)
                else
                    //less go through all the elements and validate them
                    for(var y=0;y<JSON_Obj.BudgetTable[x].approvers.length;y++)
                    {
                        //check passed in user ID is actually exists
                        const fetched_User_info = await Users_ref.User_exsists_inCollection_byID(JSON_Obj.BudgetTable[x].approvers[y].ID);
                        if(fetched_User_info == null)
                        {
                            err_list.push(`BudgetTable element ${x+1}, approver element ${y+1} user ID doesnot exists in the user table`);
                            break;
                        }
                        //check limit is a number
                        if(typeof JSON_Obj.BudgetTable[x].approvers[y].limit != 'number')
                        {
                            err_list.push(`BudgetTable element ${x+1}, approver element ${y+1} limit is not a number`);
                            break;
                        }
                        //check allowedRequests is an array type
                        if(!Array.isArray(JSON_Obj.BudgetTable[x].approvers[y].allowedRequests))
                        {
                            err_list.push(`BudgetTable element ${x+1}, approver element ${y+1} allowedRequests is not array type`);
                            break;
                        }
                        
                        //if we pass all the checks then push this bad boy to the array
                        Buget_JSON_Obj.approvers.push(JSON_Obj.BudgetTable[x].approvers[y]);
                        
                    }

                //if we pass all the checks then push this budget to the SubUnit_JSON_Obj's BudgetTable
                var temp = new Object(); //creating a new object, otherwise it'll save a reference to the object
                SubUnit_JSON_Obj.BudgetTable.push(Object.assign(temp,Buget_JSON_Obj));
                //now less reset the Buget_JSON_Obj for next iteration
                Buget_JSON_Obj.budgetNumber = null;
                Buget_JSON_Obj.budgetName = null;
                Buget_JSON_Obj.startDate = null;
                Buget_JSON_Obj.endDate = null;
                Buget_JSON_Obj.approvers = [];
                Buget_JSON_Obj.approvalLogic = null;
            }
        }

        /*TODO:
            1. Check if budget already exists under subunit if yes we dont need a duplicate
            2. If Mentioned in the submitter array is mentioned in the approver array then remove him from the submitter array. And wiseversa*/
            
            

    if(err_list.length == 0)
        return SubUnit_JSON_Obj;
    else
    {
        callback(err_list,null);
        return null;
    }
        
}

//this function will check whether if given SubUnit exists in the collection by its name
async function Subunit_exsits_inColleciton_byName(SubUnit_name)
{
    try{
        return (await SubUnit.findOne({"subUnitName":SubUnit_name}));
    }catch{
        return null;
    }
}

//this function will check whether if given SubUnit exists in the collection by its ID
module.exports.Subunit_exsits_inColleciton_byID = async function (SubUnitID)
{
    try{
        return (await SubUnit.findById(SubUnitID));
    }catch{
        return null;
    }
}

//this function will check if subunit exists under  unit => return true if doesnt exists, false if exists
async function check_subUnit_exsists_under_unit(subUnitName,UnitID)
{
    const result = await Subunit_exsits_inColleciton_byName(subUnitName);
    if(result == null)
        return true;
    else
    {
        const result_Subunit = await Units_ref.check_SubunitID_exsists_in_SubunitIDs_array(result._id,UnitID);
        if(result_Subunit == false)
            return true;
        else if(result_Subunit == true)
            return false;
        else if(result_Subunit == null)
            return null;
    }

}

//this function will help to find if a given userID is alreadye exists in submitters_IDS => if found return existing IDs, not found null
function check_UserID_exists_in_SubmittersIDs(userIDs, SubUnit_JSON)
{
    
    //this will keep the matching IDs
    var matchingIDs = [];

    for(var x=0;x<userIDs.length;x++)
        if(SubUnit_JSON.Submitters_IDs.includes(userIDs[x]))
            matchingIDs.push(userIDs[x]);

    
    if(matchingIDs.length == 0)
        return null;
    else
        return matchingIDs;
   
}

//this function will help to find if a given userID is alreadye exists in submitters_IDS => if found true, not found false
function check_OneUserID_exists_in_SubmittersIDs(userID, Submitter_IDs_array)
{
    
    for(var x=0;x<Submitter_IDs_array.length;x++)
        if(Submitter_IDs_array[x] == userID)
            return true;

    return false;
}

//this method will check if a given user IDs exists under approvers in budget table ==> return null if nothing found, if found return found IDs
function check_UserID_exists_in_BudgetTable_approvers(userIDs, SubUnit_JSON)
{
    //this will keep all the IDs found in approvers array
    var foundIDs = [];
    //this will keep the matching UserIDs
    var matchingIDs = [];


    //just make a copy of all the IDS in the Budget table's approvers list
    for(var x=0;x<SubUnit_JSON.BudgetTable.length;x++)
        for(var y=0;y<SubUnit_JSON.BudgetTable[x].approvers.length;y++)
            foundIDs.push(SubUnit_JSON.BudgetTable[x].approvers[y].ID);

    //now lets check if theres any matching ones
    for(var ken=0; ken<userIDs.length;ken++)
        if(foundIDs.includes(userIDs[ken]))
            matchingIDs.push(userIDs[ken]);

    if(matchingIDs.length == 0)
        return null;
    else
        return matchingIDs;
}

//this function will find if a user ID exists in the approver array given Budget Information, found return TRUE, if not FALSE
function check_UserID_exists_in_SpecificBudget_approvers_array(UserID, Budget_Info_JSON)
{
    for(var x=0;x<Budget_Info_JSON.approvers.length;x++)
        if(Budget_Info_JSON.approvers[x].ID == UserID)
            return true;

    //if not found
    return false;
}

//this function will find the Budget Information, given all the budgets under a subunit
function find_A_BudgetInformation_Given_all_Budgets_in_SubUnit(BudgetID, AllBudgets_in_SubUnit)
{
    var budget_Info = null;
    for(var y=0;y<AllBudgets_in_SubUnit.length;y++)
        if(AllBudgets_in_SubUnit[y].budgetNumber == BudgetID)
            return AllBudgets_in_SubUnit[y];


    //if not found return NULL
    return null;

}

//this function will check if budget Numbers exists in any of the subunits (realated to unit or related to another unit). 
async function check_Budget_already_exists_in_any_subUnit(budgetNumbers,subUnitID)
{
    //keep track of already found budgets
    var duplicate_budgets = [];
    for(var x=0;x<budgetNumbers.length;x++)
        try{
            const res = await SubUnit.findOne({"_id":subUnitID,"BudgetTable.budgetNumber":budgetNumbers[x]});
            
            if(res != null)
                duplicate_budgets.push(budgetNumbers[x]);
        }catch{
            return null;
        }

    return duplicate_budgets;
} 

//this function will chek if the budget number exists in the given subunit; return TRUE if found, FALSE if not found
async function check_budget_Number_exist_in_given_SubUnit(subUnitID, budgetID)
{
    try{
        const res = await SubUnit.findById(subUnitID);
        for(var x=0;x<res.BudgetTable.length;x++)
        {   //console.log(BudgetTable[x].budgetNumber);
            if(res.BudgetTable[x].budgetNumber == budgetID)
                return true;
        }

        return false;
    }catch{
        return null;
    }
} 

module.exports.getApprovers_and_approvalLogic_given_budgetNumber = async function(BudgetNumber, SubUnitID)
{
    var returnval = null;

    try{
        const res = await SubUnit.findById(SubUnitID);
        for(var x=0;x<res.BudgetTable.length;x++)
        {
            if(res.BudgetTable[x].budgetNumber == BudgetNumber)
            {
                return {"approvers":res.BudgetTable[x].approvers, "approvalLogic":res.BudgetTable[x].approvalLogic};
            }
        }

        //if nothing found
        return null;

    }catch{
        return null;
    }
    
}

// ------------------- End of Helper Functions --------------------------------------------------------


// ------------------- API Functions ------------------------------------------------------------------

//Method to add a new SubUnit to the mongoDB 
module.exports.addSubUnits = async function(Subunit_JSON,callback){

    const Unit_results = await Units_ref.Unit_exsists_inCollection_byID(Subunit_JSON.UnitID_ref);
    //check if unit actually exists. if no there's no point of moving forward. 
    if(Unit_results == null)
    {
        callback(`Unit ID:"${Subunit_JSON.UnitID_ref}" does not exsists`,null);
        return;
    }

    const SubUnit_result = await check_subUnit_exsists_under_unit(Subunit_JSON.subUnitName,Subunit_JSON.UnitID_ref);
    if(SubUnit_result == null)
    {
        callback("Internel Server error occured",null); 
        return;
    }
    
    if(SubUnit_result)
    {
            try{
                const subUnit_validated = await validate_and_copy_passedJSON(Subunit_JSON,callback);
                if(subUnit_validated == null)
                    return;
                //adding new subunit to the collection
                const return_result = await SubUnit.create(subUnit_validated);
                //adding the subunit to units subunitIDs array
                const update_results = await Units_ref.addSubunits_to_SubUnitIDs_array([return_result._id],return_result.UnitID_ref)
                if(update_results !=null)
                    callback(null,return_result); 
                else
                    callback(`Error occured while adding subunit to corresponding Units array of IDs`,null); 

            }catch{
                callback("Internel Server error occured",null); 
            }

    }else
        callback(`SubUnit "${Subunit_JSON.subUnitName}" already exsists under this unit`,null); 




}

//this method helps to assign user as submitters
module.exports.addSubmitters = async function(submitters_JSON,subunitID,callback){

    //get document from the subunit ID
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);
    const submitters_IDs_array = submitters_JSON.Submitters_IDs;

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subunitID} doesnot exists`,null);
        return;
    }

    const check_matched_IDs = check_UserID_exists_in_BudgetTable_approvers(submitters_IDs_array,fetched_SubUnit);
    if(check_matched_IDs != null)
    {
        callback(`Users ID(s) ${check_matched_IDs} already exists under approvers.`,null);
        return;
    }

    //if all good we can start adding these guys as a submitters.
    for(var x=0;x<submitters_IDs_array.length;x++)
        if(check_OneUserID_exists_in_SubmittersIDs(submitters_IDs_array[x],fetched_SubUnit.Submitters_IDs) == false)
            await SubUnit.findByIdAndUpdate({"_id":subunitID},{$push: {Submitters_IDs:submitters_IDs_array[x]}});

    callback(null,`Submitters ${submitters_IDs_array} successfully added to Sub unit ${subunitID}`);

}


//this method will remove submitters from the given subunit
module.exports.removeSubmitter = async function(submitters_JSON,subunitID,callback){

    //get document from the subunit ID
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);
    const submitters_IDs_array = submitters_JSON.Submitters_IDs;

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subunitID} doesnot exists`,null);
        return;
    }

    //now check if all the passed in UserID(s) exists in the submitters array
    const check_matched_IDs = check_UserID_exists_in_SubmittersIDs(submitters_IDs_array,fetched_SubUnit);
    
    if(check_matched_IDs == null)
    {
        callback(`all of the passed in submitter IDs does not exist in the database`,null);
        return;
    }

    if(check_matched_IDs.length != submitters_IDs_array.length)
    {
        callback(`Some/one of the passed in submitter IDs does not exist in the database`,null);
        return;
    }

    //in here we are good.
    for(var x=0;x<submitters_IDs_array.length;x++)
        try
        {
            await SubUnit.findByIdAndUpdate({_id:subunitID},{$pull: {Submitters_IDs: submitters_IDs_array[x]}});
        }catch
        {
            callback(`Internal Server Error ocuured while removing userID ${submitters_IDs_array[x]} from submitters`,null);
            return;
        }

    //here means we removed all the IDs successfully
    callback(null,`Successfully removed userIsD ${submitters_IDs_array} from submitters`);
    
}


//this function will add a new user to the approvers of the budget given budget ID and the subunit ID
module.exports.addApprover = async function(subunitID,budgetID,approver_JSON,callback){

    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subunitID} doesnot exists`,null);
        return;
    }

    //then make an array that contains all the IDs passed in by the client
    var passedIn_approvers_IDs = [];
    //construction above initialized array
    for(var x=0;x<approver_JSON.approvers.length;x++)
        passedIn_approvers_IDs.push(approver_JSON.approvers[x].ID);


    //second check if at least one of the given approvers IDs exists in the submitters arrray if yes, then we cannot add them
    //const check_matched_IDs = check_UserID_exists_in_SubmittersIDs(passedIn_approvers_IDs,fetched_SubUnit);
    //
    //if(check_matched_IDs != null)
    //{
    //    callback(`Following IDs ${check_matched_IDs} are assigned as submitters in the backend and can not set them as approvers`,null);
    //    return;
    //}

    //multiple budgets can have same approver in the approver array. So we dont have to check that

    //BUT same approver array cannot have duplicates of the same user ID !, we are checking that 
    const fetched_Budget = find_A_BudgetInformation_Given_all_Budgets_in_SubUnit(budgetID,fetched_SubUnit.BudgetTable);
    
    if(fetched_Budget == null)
    {
        callback(`Budget Number ${budgetID} cannot found under subunit ID ${subunitID}`,null);
        return;
    }

    //check_UserID_exists_in_SpecificBudget_approvers_array
    for(var y=0;y<approver_JSON.approvers.length;y++)
        if(check_UserID_exists_in_SpecificBudget_approvers_array(approver_JSON.approvers[y].ID,fetched_Budget) == false) // this will help to eliminate duplicates
        {
           try{
                await SubUnit.updateOne({"_id":subunitID, "BudgetTable.budgetNumber":budgetID},{$push: {'BudgetTable.$.approvers':approver_JSON.approvers[y]}});
            }catch(err){
                callback(err,null);
                return;
            }
        }
    callback(null,`Successfully added User IDs to the approver list of budget number ${budgetID}`);

    

}

module.exports.removeApprover = async function(subunitID,budgetID, approverID,callback)
{
     //first check if the subunit ID exists in the collection
     const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);

     if(fetched_SubUnit == null)
     {
         callback(`Sub unit ID ${subunitID} doesnot exists`,null);
         return;
     }
     
     const fetched_Budget = find_A_BudgetInformation_Given_all_Budgets_in_SubUnit(budgetID,fetched_SubUnit.BudgetTable);
    
     if(fetched_Budget == null)
     {
         callback(`Budget Number ${budgetID} cannot found under subunit ID ${subunitID}`,null);
         return;
     }

     //if all the above checks are good, now we can remove this bugger from the approvers array
     SubUnit.updateOne({"_id":subunitID, "BudgetTable.budgetNumber":budgetID}, {'$pull': {'BudgetTable.$.approvers':{'ID':approverID}}},{new: true},callback);
}

module.exports.updateApprover = async function(subunitID,budgetID, approver_JSON,callback)
{
     //first check if the subunit ID exists in the collection
     const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);

     if(fetched_SubUnit == null)
     {
         callback(`Sub unit ID ${subunitID} doesnot exists`,null);
         return;
     }
     
     const fetched_Budget = find_A_BudgetInformation_Given_all_Budgets_in_SubUnit(budgetID,fetched_SubUnit.BudgetTable);
    
     if(fetched_Budget == null)
     {
         callback(`Budget Number ${budgetID} cannot found under subunit ID ${subunitID}`,null);
         return;
     }

     //if all the above checks are good, now we can remove this bugger from the approvers array
     
     SubUnit.updateOne({"_id":subunitID, "BudgetTable.budgetNumber":budgetID, "BudgetTable.approvers.ID":approver_JSON.ID}, 
     {'$set': 
     {'BudgetTable.$[budgetObject].approvers.$[approverobject].limit':approver_JSON.limit, 'BudgetTable.$[budgetObject].approvers.$[approverobject].allowedRequests':approver_JSON.allowedRequests, 'BudgetTable.$[budgetObject].approvers.$[approverobject].PI':approver_JSON.PI}},
     {"arrayFilters":[{"budgetObject.budgetNumber":budgetID},{"approverobject.ID":approver_JSON.ID}]},callback);
     


}


//this function will help to add a new bufget to the given subunit
module.exports.addBudget = async function(subunitID,budget_JSON,callback){

    //this will keep track of all the budget numbers sent by the user
    var budgetNumbers = [];
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subunitID} doesnot exists`,null);
        return;
    }

    //next check if any of the given Budgets are already exists in any of the subunits
    for(var x=0;x<budget_JSON.budgets.length;x++)
        budgetNumbers.push(budget_JSON.budgets[x].budgetNumber);

    const duplicate_budgets = await check_Budget_already_exists_in_any_subUnit(budgetNumbers,subunitID);
    if(duplicate_budgets == null)
    {
        callback('Internal Server Error occured while looking for duplicates',null);
        return;
    }else if (duplicate_budgets.length > 0)
    {
        callback(`Budget Number(s) ${duplicate_budgets} already exists under subunits`,null);
        return; 
    }

    //here means we are all good to add these puppies to the database/collection
    for(var y=0;y<budget_JSON.budgets.length;y++)
        try{
            await SubUnit.findByIdAndUpdate(subunitID,{$push: {BudgetTable:budget_JSON.budgets[y]}})
        }catch{
            callback(`Internal Server Error occured while adding budget Number ${budget_JSON.budgets[y].budgetNumber}`,null);
            return;
        }
    

    callback(null,`Budget IDs successfully added to the subunit ${subunitID}`);     

    
}

//this function will remove a budget from a subunit, given subUnit ID and Budget Number
module.exports.removeBudget = async function(subunitID,budgetNumber,callback){
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subunitID} doesnot exists`,null);
        return;
    }

    const results = await check_budget_Number_exist_in_given_SubUnit(subunitID, budgetNumber);

    if(results== false)
    {
        callback(`Budget Number ${budgetNumber} does not exist under Sub unit ID ${subunitID}`,null);
        return;
    }else if (results == null)
    {
        callback(`Error occured while looking for Budget Number`,null);
        return;
    }

    //now lets remove this budget
    SubUnit.findByIdAndUpdate(subunitID, {'$pull': {'BudgetTable':{'budgetNumber':budgetNumber}}},{new: true},callback);


}

module.exports.updateApprovalLogic = async function(subunitID, budgetNumber,approvalLogicString,callback)
{
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subunitID} doesnot exists`,null);
        return;
    }

    const results = await check_budget_Number_exist_in_given_SubUnit(subunitID, budgetNumber);

    if(results== false)
    {
        callback(`Budget Number ${budgetNumber} does not exist under Sub unit ID ${subunitID}`,null);
        return;
    }else if (results == null)
    {
        callback(`Error occured while looking for Budget Number`,null);
        return;
    }

    //once we are here means budget and subunit exists, its time to update approval logic
    SubUnit.updateOne({'_id':subunitID, 'BudgetTable.budgetNumber':budgetNumber},{'$set':{'BudgetTable.$.approvalLogic':approvalLogicString}},callback);
}


//this function will return all the budgets given subUnit ID
module.exports.getSubUnitDetails = async function(subunitID,callback){
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subunitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subunitID} doesnot exists`,null);
        return;
    }

    SubUnit.findById(subunitID,callback);
}

//this function will return all the budgets given subUnit ID
module.exports.getBudgetDetails = async function(BudgetID,callback){

    try{
        await SubUnit.find({},function (err, res){
            if(err)
            {
                callback(`Error occured while fetching all documents`,null);
                return;
            }else
            {
                for(var x=0;x<res.length;x++)
                    for(var y=0;y<res[x].BudgetTable.length;y++)
                    {
                        if(res[x].BudgetTable[y].budgetNumber == BudgetID)
                        {
                            callback(null,res[x].BudgetTable[y]);
                            return;
                        }
                    }
                callback(`Budget Number ${BudgetID} not found`,null);
                return;
            }
        });
    }catch{
        callback(`Error occured while looking for Budget Number ${BudgetID} not found`,null);
        return;
    }

}

//this function will return the submitters information given subunits ID
module.exports.getSubmitterInfo = async function(subUnitID,callback){

    //this will keep all the userInformation
    var userInfo = [];
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subUnitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subUnitID} doesnot exists`,null);
        return;
    }

    for(var x=0;x<fetched_SubUnit.Submitters_IDs.length;x++)
        userInfo.push(await Users_ref.User_exsists_inCollection_byID(fetched_SubUnit.Submitters_IDs[x]));

    callback(null,userInfo);
}




//this will login a user given its UWID
/*module.exports.loginUser = async function(UWID,callback){

    try{
        var userInfo = await Users_ref.findOne({"UWID":UWID});
        if(userInfo == null)
        {
            callback(`User with UW net ID: ${UWID} does not exist in the database`,null);
            return;
        }

        var accessInfo =        {
                                    "userInfo":userInfo

                                }
        const user_ObjID = userInfo._id;
        //now lets traverse through all the units and find if the user exists in the Units collection

            var fetched_Unit_info = await Units_ref.getAllUnits();
            if(fetched_Unit_info != null)
                for(var x=0;x<fetched_Unit_info.length;x++)
                    for(var y=0;y<fetched_Unit_info[x].userIDs.length;y++)
                        if(fetched_Unit_info[x].userIDs[y].ID.equals(user_ObjID) && fetched_Unit_info[x].userIDs[y].Admin == true)
                        {
                            accessInfo.AccessLevel =  "Financial Admin";
                            accessInfo.UnitName = fetched_Unit_info[x].unitName;
                            accessInfo.UnitID = fetched_Unit_info[x]._id;
                            callback(null,accessInfo);
                            return;
                        }else if (fetched_Unit_info[x].userIDs[y].ID.equals(user_ObjID) && fetched_Unit_info[x].userIDs[y].Admin == false)
                        {
                            accessInfo.AccessLevel =  "Financial Staff";
                            accessInfo.UnitName = fetched_Unit_info[x].unitName;
                            accessInfo.UnitID = fetched_Unit_info[x]._id;
                            callback(null,accessInfo);
                            return;
                        }

        
        
                        
        //now lets traverse through all the subunits and find if the user exists under submitters in the SubUnits collection        
        var fetched_subUnit_info = await SubUnit.getAllSubUnits();
        if(fetched_subUnit_info != null)
        {
            for(var xx=0;xx<fetched_subUnit_info.length;xx++)
            {
                for(var yy=0;yy<fetched_subUnit_info[xx].Submitters_IDs.length;yy++)
                {
                    if(fetched_subUnit_info[xx].Submitters_IDs[yy].equals(user_ObjID))
                    {
                        accessInfo.AccessLevel =  "Submitter";
                        accessInfo.SubUnitName = fetched_subUnit_info[xx].subUnitName;
                        accessInfo.SubUnitID = fetched_subUnit_info[xx]._id;
                        callback(null,accessInfo);
                        return;                        
                    }
                }
            }

            //now lets traverse through all the subunits and find if the user exists under approver in the SubUnits collection
            for(var xx=0;xx<fetched_subUnit_info.length;xx++)
            {
                for(var yy=0;yy<fetched_subUnit_info[xx].BudgetTable.length;yy++)
                {
                    //console.log(fetched_subUnit_info[xx].BudgetTable[yy]);
                    for(var zz=0;zz<fetched_subUnit_info[xx].BudgetTable[yy].approvers.length;zz++)
                    {
                        if(fetched_subUnit_info[xx].BudgetTable[yy].approvers[zz].ID == user_ObjID)
                        {
                            
                            accessInfo.AccessLevel =  "Approver";
                            accessInfo.SubUnitName = fetched_subUnit_info[xx].subUnitName;
                            accessInfo.SubUnitID = fetched_subUnit_info[xx]._id;
                            callback(null,accessInfo);
                            return;                             
                        }
                    }
                }
            }
        }


        //incase we didn't find that user just say cant find him/her
        callback(`User with UW net ID: ${UWID} is not assigned with a access Level. Please assign the user first to login`,null);
        return;                            
        
    }catch{
        callback(`Login Error Occured while looking for UWID`,null);
        return;
    }
}*/


module.exports.getAll_subunits = async function(UnitID,callback){

    SubUnit.find({UnitID_ref:UnitID},callback);   

}


module.exports.UpdateSubUnitName = async function(subUnitID,newName,callback)
{
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subUnitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subUnitID} doesnot exists`,null);
        return;
    }


    SubUnit.findByIdAndUpdate(subUnitID,{"subUnitName":newName},callback);

}

module.exports.removeSubunit = async function(subUnitID,callback)
{
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subUnitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subUnitID} doesnot exists`,null);
        return;
    } 
    
    //now lets remove the subunit from the database
    try{
        await SubUnit.findByIdAndRemove(subUnitID);
        callback(null,`Subunit successfully removed`);
    }catch{
        callback(`Internal server error occured while removing Subunit ID ${subUnitID} please try again`,null);
    }

}



module.exports.findUser_information = async function(userID,callback)
{
    try{
        var userInfo = await Users_ref.findById(userID);
        if(userInfo == null)
        {
            callback(`User with userID: ${userID} does not exist in the database`,null);
            return;
        }

        var accessInfo =        {
                                    "userInfo":userInfo

                                }
        const user_ObjID = userInfo._id;
        //now lets traverse through all the units and find if the user exists in the Units collection

            var fetched_Unit_info = await Units_ref.getAllUnits();
            if(fetched_Unit_info != null)
                for(var x=0;x<fetched_Unit_info.length;x++)
                    for(var y=0;y<fetched_Unit_info[x].userIDs.length;y++)
                        if(fetched_Unit_info[x].userIDs[y].ID.equals(user_ObjID) && fetched_Unit_info[x].userIDs[y].Admin == true)
                        {
                            accessInfo.AccessLevel =  "Financial Admin";
                            accessInfo.UnitName = fetched_Unit_info[x].unitName;
                            accessInfo.UnitID = fetched_Unit_info[x]._id;
                            callback(null,accessInfo);
                            return;
                        }else if (fetched_Unit_info[x].userIDs[y].ID.equals(user_ObjID) && fetched_Unit_info[x].userIDs[y].Admin == false)
                        {
                            accessInfo.AccessLevel =  "Financial Staff";
                            accessInfo.UnitName = fetched_Unit_info[x].unitName;
                            accessInfo.UnitID = fetched_Unit_info[x]._id;
                            callback(null,accessInfo);
                            return;
                        }

        
        
                        
        //now lets traverse through all the subunits and find if the user exists under submitters in the SubUnits collection        
        var fetched_subUnit_info = await SubUnit.getAllSubUnits();
        if(fetched_subUnit_info != null)
        {
            for(var xx=0;xx<fetched_subUnit_info.length;xx++)
            {
                for(var yy=0;yy<fetched_subUnit_info[xx].Submitters_IDs.length;yy++)
                {
                    if(fetched_subUnit_info[xx].Submitters_IDs[yy].equals(user_ObjID))
                    {
                        accessInfo.AccessLevel =  "Submitter";
                        accessInfo.SubUnitName = fetched_subUnit_info[xx].subUnitName;
                        accessInfo.SubUnitID = fetched_subUnit_info[xx]._id;
                        callback(null,accessInfo);
                        return;                        
                    }
                }
            }

            //now lets traverse through all the subunits and find if the user exists under approver in the SubUnits collection
            for(var xx=0;xx<fetched_subUnit_info.length;xx++)
            {
                for(var yy=0;yy<fetched_subUnit_info[xx].BudgetTable.length;yy++)
                {
                    //console.log(fetched_subUnit_info[xx].BudgetTable[yy]);
                    for(var zz=0;zz<fetched_subUnit_info[xx].BudgetTable[yy].approvers.length;zz++)
                    {
                        if(fetched_subUnit_info[xx].BudgetTable[yy].approvers[zz].ID == user_ObjID)
                        {
                            
                            accessInfo.AccessLevel =  "Approver";
                            accessInfo.SubUnitName = fetched_subUnit_info[xx].subUnitName;
                            accessInfo.SubUnitID = fetched_subUnit_info[xx]._id;
                            callback(null,accessInfo);
                            return;                             
                        }
                    }
                }
            }
        }


        //incase we didn't find that user just say cant find him/her
        callback(`User with user ID: ${userID} is not assigned with a access Level.`,null);
        return;                            
        
    }catch{
        callback(`Error Occured while looking for userID`,null);
        return;
    }    
}


// ------------------- End of API Functions ------------------------------------------------------------------

//----------------------------------- LOGIN FUNTIONS----------------------------------------------------------
module.exports.loginUser = async function(UWID,callback){

    //this variable will keep all the possible roles found in the database given user ID
    var possible_roles = {
        "userInfo": null,
        "submitter":[],
        "approver":[],
        "fiscalStaff":[],
        "fiscalAdmin":[]
    }

    var userInfo = await Users_ref.findOne({"UWID":UWID});
    if(userInfo == null)
    {
        callback(`User with UW net ID: ${UWID} does not exist in the database`,null);
        return;
    }

    possible_roles.userInfo = userInfo;

    const user_database_ID = userInfo._id;

    //lets crawl through units and see if we can find a match - to find fiscal admins and staff
    try{
        const res = await Units_ref.find({"userIDs.ID":user_database_ID});
        for(var x=0;x<res.length;x++)
            for(var y=0;y<res[x].userIDs.length;y++)
            {
               
                if(res[x].userIDs[y].ID == user_database_ID.toString())
                    if(res[x].userIDs[y].Admin)
                        possible_roles.fiscalAdmin.push({"UnitName":res[x].unitName, "UnitID":res[x]._id});
                    else
                        possible_roles.fiscalStaff.push({"UnitName":res[x].unitName, "UnitID":res[x]._id});  
            }

    }catch{
        callback(`Internal Server Error has occured`,null);
        return;
    }

    //looking for submitters now
    try{
        const res = await SubUnit.find({"Submitters_IDs":user_database_ID});
        
        for(var x=0;x<res.length;x++)
            for(var y=0;y<res[x].Submitters_IDs.length;y++)
            {
                if(res[x].Submitters_IDs[y].toString() == user_database_ID.toString())
                    possible_roles.submitter.push({"SubunitName":res[x].subUnitName, "SubunitID":res[x]._id});
            }
            
    }catch(err){
        //console.log(err);
        callback(`Internal Server Error has occured`,null);
        return;
    }

    //looking for approvers now
    try{
        var temp = []
        const res = await SubUnit.find({"BudgetTable.approvers.ID":user_database_ID.toString()});//.select('BudgetTable subUnitName');
        for(var x=0;x<res.length;x++)
            for(var y=0;y<res[x].BudgetTable.length;y++)
                for(var z=0;z<res[x].BudgetTable[y].approvers.length;z++)
                    if(res[x].BudgetTable[y].approvers[z].ID.toString() == user_database_ID.toString())
                        temp.push({"SubunitName":res[x].subUnitName, "SubunitID":res[x]._id});
            
        //removing any duplicates this to deal with case, where approver is mentioned in two budgets in the same subunit. remove duplicate beacause we just need to know where user resides
        var jsonObject = temp.map(JSON.stringify); 
        var uniqueSet = new Set(jsonObject); 
        var uniqueArray = Array.from(uniqueSet).map(JSON.parse); 
        possible_roles.approver.push(uniqueArray);
    }catch{
        callback(`Internal Server Error has occured`,null);
        return;
    }
    
    
    callback(null,possible_roles);
}


module.exports.getBudgetsUnderSubUnit = async function(subUnitID,callback)
{
    //first check if the subunit ID exists in the collection
    const fetched_SubUnit = await SubUnit.Subunit_exsits_inColleciton_byID(subUnitID);

    if(fetched_SubUnit == null)
    {
        callback(`Sub unit ID ${subUnitID} doesnot exists`,null);
        return;
    }else
    {
        callback(null,fetched_SubUnit.BudgetTable)
    }


}
//----------------------------------- END OF LOGIN FUNCTIONS -------------------------------------------------

//this will help to access modules in Users model
var Users_ref = require("./Users");
var approvalLogicReponses_Modal = require("./approval_info");
var SubUnit_ref = require("./SubUnits");
var Unit_ref = require("./Units");


var mongoose = require('mongoose');
var fs = require('fs');
var rimraf = require("rimraf");

//schema for SubUnits

var orderScheme = mongoose.Schema({

    userID_ref:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required: true
    },
    userName:{
        type:String,
        required: true
    },
    OrderType:{
        type:String,
        required: true
    },
    OrderInfo:{
        type: String,
        required: true
    },
    OrderStatus:{
        type:String,
        required:true
    },
    ChatInfo:{
        type:[
            {
                userName:{
                    type:String,
                    required: true
                },
                comment:{
                    type:String,
                    required: true
                },
                timeStamp:{
                    type:Date,
                    default:Date.now
                }
            }
        ],
        default: []
    },
    OrderHistory:{
        type:[
            {
                userName:{
                    type:String,
                    required: true
                },
                action:{
                    type:String,
                    required: true
                },
                timeStamp:{
                    type:Date,
                    default:Date.now
                }
            }
        ],
        default: []
    },
    assignedTo:{
        type:mongoose.Types.ObjectId,
        ref:'User'
    },
    assignedTo_name:{
        type:String
    },
    submittedOn:{
        type:Date,
        default: Date.now
    },
    lastModified:{
        type:Date,
        default: Date.now
    },
    AribaReference:{
        type:String,
        default: null
    },
    ApprovalResponses:[approvalLogicReponses_Modal],
    AwaitingResponses: {
        type:[mongoose.Types.ObjectId],
        ref: 'User'
    },
    Unit_SubUnit_ref:{
        type:String
    },
    Unit_SubUnit_Name:{
        type:String,
        required: true
    },
    Create_New_Approval_Chain: {
        type:Boolean,
        default:false
    }
    

});

var Order = module.exports = mongoose.model('Order', orderScheme);

// ------------------- Helper Functions --------------------------------------------------------------

//This validator function will validate Passed in JSON object contains correct data types
async function validate_and_copy_passedJSON(JSON_Obj,approvalResponse,type,callback) {

    var err_list = []; //this will keep all the error messages

    //Empty template of a user JSON object
    var Order_JSON_Obj = {
        "userID_ref": null,
        "userName": null,
        "OrderType": null,
        "OrderInfo": null,
        "OrderStatus": null,
        "ChatInfo": [],
        "OrderHistory": [],
        "assignedTo":null,
        "assignedTo_name": null,
        "AribaReference": null,
        "ApprovalResponses":approvalResponse.Approval_reponses,
        "AwaitingResponses":approvalResponse.awaiting_reposnses,
        "Unit_SubUnit_ref": approvalResponse.Unit_Subunit_ID,
        "Unit_SubUnit_Name": null,
        "Create_New_Approval_Chain": false
    };

    if (typeof JSON_Obj.userID_ref != 'string')
        err_list.push("userID_ref is not String type")
    else
        Order_JSON_Obj.userID_ref = JSON_Obj.userID_ref;

    if (typeof JSON_Obj.OrderType != 'string')
        err_list.push("OrderType is not String type")
    else
        Order_JSON_Obj.OrderType = JSON_Obj.OrderType;
        
    if (typeof JSON_Obj.OrderInfo != 'string')
        err_list.push("OrderInfo is not String type")
    else
        Order_JSON_Obj.OrderInfo = JSON_Obj.OrderInfo;

    /*if (typeof JSON_Obj.OrderStatus != 'string')
        err_list.push("OrderStatus is not String type")
    else
        Order_JSON_Obj.OrderStatus = JSON_Obj.OrderStatus;*/
    
    if(approvalResponse.already_approved == true)
        Order_JSON_Obj.OrderStatus = "Approved";
    else
        Order_JSON_Obj.OrderStatus = "Awaiting Approval";
         
    /*if (typeof JSON_Obj.ChatInfo != 'string')
        err_list.push("ChatInfo is not String type")
    else
        Order_JSON_Obj.ChatInfo = JSON_Obj.ChatInfo;*/

        
    if (typeof JSON_Obj.assignedTo != 'string' && JSON_Obj.assignedTo != null)
        err_list.push("assignedTo is not String type")
    else
        Order_JSON_Obj.assignedTo = JSON_Obj.assignedTo; 
    
    //get user name and fill out the field
    const userInfo = await Users_ref.User_exsists_inCollection_byID(JSON_Obj.userID_ref);    
    Order_JSON_Obj.userName = userInfo.Name;

    //get assigned to user name and fill out the field
    if(JSON_Obj.assignedTo != null)
    {
        const assignedTo_info = await Users_ref.User_exsists_inCollection_byID(JSON_Obj.assignedTo); 
        Order_JSON_Obj.assignedTo_name = assignedTo_info.Name;
    }else
    {
        Order_JSON_Obj.assignedTo_name = null;
    }

    var lowercase_type = type.toLowerCase();
    //now lets get unit or subunit name
    if(lowercase_type == 'unit')
    {
        const unitInfo = await Unit_ref.Unit_exsists_inCollection_byID(approvalResponse.Unit_Subunit_ID);
        Order_JSON_Obj.Unit_SubUnit_Name = unitInfo.unitName;
    }else if(lowercase_type == 'subunit')
    {
        const subunitInfo = await SubUnit_ref.Subunit_exsits_inColleciton_byID(approvalResponse.Unit_Subunit_ID);
        Order_JSON_Obj.Unit_SubUnit_Name = subunitInfo.subUnitName;
    }
    

    if(err_list.length == 0)
        return Order_JSON_Obj;
    else
    {
        callback(err_list,null);
        return null;
    }
        
}

//this function will check if given order ID existst in the collection given order ID
module.exports.check_Order_exists_byID = async function(orderID){
    try
    {
       return await Order.findById(orderID);
    }catch
    {
        return null;
    }
    
}
function calculate_awaiting_reponses(Approval_reponses)
{
    var res = [];

    for(var x=0;x<Approval_reponses.length;x++)
        for(var y=0;y<Approval_reponses[x].approverResponses.length;y++)
            if(Approval_reponses[x].approverResponses[y].response == null)
                res.push(Approval_reponses[x].approverResponses[y].approverID_ref);


    if(res.length <= 0)
        return {"awaiting_reposnses":res, "already_approved":true};
    else
        return {"awaiting_reposnses":res, "already_approved":false} ;

}

async function construct_approvalInfo(OrderType, LineItems, type, Sub_OR_UnitID,submitterID)
{
    var lowercase_type = type.toLowerCase();
    var Approval_reponses = [];
    
    if(lowercase_type == "subunit")
    {
        for(var x=0;x<LineItems.length;x++)
        {
            
            for(var y=0;y<LineItems[x].Budgets.length;y++)
            {
                var ret_val = await SubUnit_ref.getApprovers_and_approvalLogic_given_budgetNumber(LineItems[x].Budgets[y].Number,Sub_OR_UnitID);
                var calculated_amount = calculate_spilt(LineItems[x].Amount,LineItems[x].Budgets[y].Split);
                var result = construct_a_approval_logic_for_the_order_and_approver_response_part(ret_val.approvers,ret_val.approvalLogic,calculated_amount,OrderType,submitterID);
                if(result.PI_request)
                    Approval_reponses.push(construct_approval_Info_JSON_Object(result.approvalLogic,result.approverResponses,LineItems[x].Budgets[y].Number,LineItems[x].id,true))
                else
                    Approval_reponses.push(construct_approval_Info_JSON_Object(result.approvalLogic,result.approverResponses,LineItems[x].Budgets[y].Number,LineItems[x].id,null))    
                
            }
            
        }
        const awaiting_reposnses = calculate_awaiting_reponses(Approval_reponses);
        return {"Approval_reponses":Approval_reponses, "awaiting_reposnses":awaiting_reposnses.awaiting_reposnses, "already_approved":awaiting_reposnses.already_approved, "Unit_Subunit_ID":Sub_OR_UnitID};
    }else if(lowercase_type == "unit")
    {
        //this variable will keep all the budgets in a Unit
        var allBudgets_ = [];
        //for this first we need to find out all the budgets in the unit
        const allSubunits = await Unit_ref.getAllSubUnitIDs(Sub_OR_UnitID);
        
        for(var x=0;x<allSubunits.length;x++)
        {
            var SubUnit_info = await SubUnit_ref.findById(allSubunits[x]);
            if(SubUnit_info)
                allBudgets_.push.apply(allBudgets_,SubUnit_info.BudgetTable);
                
        }

        //process line items -- not my best wrok
        for(var x=0;x<LineItems.length;x++)
            for(var y=0;y<LineItems[x].Budgets.length;y++)
            {
                var ret_val = find_approvers_and_approval_logic(allBudgets_, LineItems[x].Budgets[y].Number);
                for(var z = 0;z<ret_val.length;z++)
                {
                    var calculated_amount = calculate_spilt(LineItems[x].Amount,LineItems[x].Budgets[y].Split);
                    var result = construct_a_approval_logic_for_the_order_and_approver_response_part(ret_val[z].approvers,ret_val[z].approvalLogic,calculated_amount,OrderType,submitterID);
                    if(result.PI_request)
                        Approval_reponses.push(construct_approval_Info_JSON_Object(result.approvalLogic,result.approverResponses,LineItems[x].Budgets[y].Number,LineItems[x].id,true))
                    else
                        Approval_reponses.push(construct_approval_Info_JSON_Object(result.approvalLogic,result.approverResponses,LineItems[x].Budgets[y].Number,LineItems[x].id,null))                        
                }
            }


            //console.log(Approval_reponses);
            const awaiting_reposnses = calculate_awaiting_reponses(Approval_reponses);
            return {"Approval_reponses":Approval_reponses, "awaiting_reposnses":awaiting_reposnses.awaiting_reposnses, "already_approved":awaiting_reposnses.already_approved, "Unit_Subunit_ID":Sub_OR_UnitID};
    }


}

function find_approvers_and_approval_logic(allBudgets, BudgetNumber)
{
    var results = [];
    for(var x=0;x<allBudgets.length;x++)
    {
        if(allBudgets[x].budgetNumber == BudgetNumber)
            results.push({"approvers":allBudgets[x].approvers, "approvalLogic":allBudgets[x].approvalLogic})
        
    }

    return results;

}

function calculate_spilt(TotalAmount,Split)
{
    if(Split.indexOf('$')>-1) //means this is a currency based split
    {
        const amount = Split.replace('$','');
        return (Number(TotalAmount) - Number(amount)).toFixed(2);
    }else if(Split.indexOf('%')>-1) //means this is a percentage based split
    {
        const percentage = Split.replace('%','');
        return (Number(TotalAmount) * (Number(percentage)/100)).toFixed(2);
    }
}

function construct_a_approval_logic_for_the_order_and_approver_response_part(approvers, givenLogic, amount, OrderType,submitterID)
{
    //console.log(approvers);
    //this will keep the approval response part and new approval logic part
    var result = [];
    var new_approver_logic = "";
    //keep track if the given logic contains only AND logics or only OR logics
    var is_only_AND_logics = false;

    //check if the given logical string only contains AND logics or OR logics
    if(givenLogic.includes('&&'))
        is_only_AND_logics = true;
    else
        is_only_AND_logics = false;

        
    for(var x=0;x<approvers.length;x++)
    {
        var approvers_limit = 0;
        if(approvers[x].limit == null) //this represents a case where approver's limit is  unlimited 
            approvers_limit = Infinity;
        else
            approvers_limit = Number(approvers[x].limit);

        //this represents a case, where the order was submitted by the PI of the subunit
        if(approvers[x].PI && approvers[x].ID == submitterID)
        {
            //in this case we dont need any approval from other approvers. Just PI in the approval logic and his reponse should be yes
            result = [{"approverID_ref":approvers[x].ID, "response":true}]
            new_approver_logic = approvers[x].ID;
            return {"approvalLogic":new_approver_logic, "approverResponses":result, "PI_request":true};

        }
        //check if the approver is capable of approving this request if yes, then add him to the result array
        else if(approvers[x].allowedRequests.includes(OrderType) && approvers_limit >= Number(amount) && approvers[x].ID != submitterID)
        {
            result.push({"approverID_ref":approvers[x].ID, "response":null});
            if(is_only_AND_logics)
                new_approver_logic += approvers[x].ID + "&&";
            else
                new_approver_logic += approvers[x].ID + "||";
  
        }
    }

            
        
    //icheck if we have unwanted && or || operators appended to the end, if yes remove dem 
    if(new_approver_logic[new_approver_logic.length - 1] == "&" || new_approver_logic[new_approver_logic.length - 1] == "|")
        new_approver_logic = new_approver_logic.slice(0,- 2);
    

    //returning new approval logic and approver response part
    return {"approvalLogic":new_approver_logic, "approverResponses":result, "PI_request":false};
    
}

function construct_approval_Info_JSON_Object(approvalLogicString, approvalResponses, BudgetNumber, LineItemNumber, finalResult)
{
    return {
        "lineItemID":Number(LineItemNumber),
        "approvalLogic": approvalLogicString,
        "approverResponses":approvalResponses,
        "finalResult":finalResult,
        "BudgetNumber":BudgetNumber
    }
}

// ------------------- End of Helper Functions --------------------------------------------------------


// ------------------- API Functions ------------------------------------------------------------------------


module.exports.getOrderInformation = async function(OrderID, callback)
{
    const results = await Order.check_Order_exists_byID(OrderID);

    if(results == null)
    {
        callback(`Order ID: ${OrderID} is invalid`,null);
        return;
    }else
        callback(null,results);

    
}


/*this function will add a new order to the Order collection also make a directory with the name of the 
Order_ID and save all the uploaded files and files uploaded in the Chat section of the order
*/
module.exports.addOrder = async function(Order_JSON,files,Sub_OR_UnitID,type,callback){
    const parsed_OrderInfo = JSON.parse(Order_JSON.OrderInfo);
    const approval_responses = await construct_approvalInfo(Order_JSON.OrderType,parsed_OrderInfo.LineItems,type,Sub_OR_UnitID,Order_JSON.userID_ref);
    console.log(approval_responses);
    //first validate the passed in Order information
    var Order_validated = await validate_and_copy_passedJSON(Order_JSON,approval_responses,type,callback);
    if(Order_validated == null)
        return;

    //check if the passed in user ID exists
    try
    {
        const User_validated = await Users_ref.validate_UserID(Order_validated.userID_ref);
        if(User_validated == null)
        {
            callback(`UserID ${Order_validated.userID_ref} does not exists`,null);
            return;
        }
    }catch
    {
        callback(`Internel Server Error Occured`,null);
        return;
    }

    //now lets add the order to the database
    try
    {

        const order_pushed = await Order.create(Order_validated);

        if(files != null)
        {
            //get number of files uploaded
            const file_names = Object.keys(files);
            const DIR_path = __dirname+"/../orders/"+order_pushed._id;
            //lets make a directory under orders with order ID
            await fs.mkdir(DIR_path, (err)=>{
                if(err)
                {
                    callback(`Internel Server Error Occured while uploading documents`,null);
                    //also remove the created record in order collection
                    Order.remove({_id:order_pushed._id});
                    return;   
                }else
                {
                    //now lets move all the uploaded files to the newly created directory
                    console.log("files Received:"+file_names.length);

                    for(var x=0;x<file_names.length;x++)
                    {
                        fs.writeFile(DIR_path+"/"+files[file_names[x]].name,files[file_names[x]].data,function(err)
                        {
                            if(err)
                            {
                                console.log("\n\n\n=================error occured================");
                                console.log(err);
                                console.log("===================================================\n\n\n");
                            }
                                
                        })
                    }
                }
    
                });

        }
        
        callback(null,order_pushed); 



    }catch(err)
    {
        console.log(err);
        callback(`Internel Server Error Occured while pushing information to Collection`,null);
    }
    //callback(`Internel Server Error Occured while pushing information to Collection`,null);
}

//this function will upload file/attachments to the order given order ID
module.exports.uploadFiles = async function(orderID,files,callback){

    //get number of files uploaded
    const file_names = Object.keys(files);


    if( await Order.check_Order_exists_byID(orderID) == null) 
    {
        callback("Invalid Order ID",null);
        return;
    }

    //update last modified field
    try{
        await Order.findOneAndUpdate({_id:orderID},{lastModified:Date.now()},{new: true});
    }catch{
        callback("Internal server error occured while updating modified time",null);
        return;
    }

    const DIR_path = __dirname+"/../orders/"+orderID;

    //now lets move all the uploaded files to the newly created directory
    for(var x=0;x<file_names.length;x++)
    {
        files[file_names[x]].mv(DIR_path+"/"+files[file_names[x]].name,(err)=>{
            if(err)
            {
                callback(`Error occured while moving files`,null);
                return;
            }
        });
    }    

    callback(null,"Files successfully uploaded");

}


//this function will update order Info given Order ID
module.exports.updateOrder = async function(orderID,Order_JSON,type,callback){

    //check order exists in the collection
    if(await Order.check_Order_exists_byID(orderID) == null)
    {
        callback("Invalid Order ID",null);
        return;
    }

    const order = await Order.findById(orderID);
    if (order.Create_New_Approval_Chain == true) {
        const parsed_OrderInfo = JSON.parse(Order_JSON.OrderInfo);
        const approvalResponse = await construct_approvalInfo(order.OrderType,parsed_OrderInfo.LineItems,type,order.Unit_SubUnit_ref,order.userID_ref);
        Order.findOneAndUpdate({_id:orderID},{ApprovalResponses:approvalResponse.Approval_reponses,
                                              AwaitingResponses:approvalResponse.awaiting_reposnses,
                                              Create_New_Approval_Chain:false,
                                              OrderInfo:Order_JSON.OrderInfo,
                                              OrderStatus:"Awaiting Approval",
                                              lastModified:Date.now()},{new:true},callback);
    } else {
        Order.findOneAndUpdate({_id:orderID},{OrderInfo:Order_JSON.OrderInfo,OrderStatus:"Approved",lastModified:Date.now()},{new: true},callback);
    }
}

//this function will update order Info given Order ID
module.exports.updateOrderInfo = async function(orderID,Order_JSON,callback){

    //check order exists in the collection
    if(await Order.check_Order_exists_byID(orderID) == null)
    {
        callback("Invalid Order ID",null);
        return;
    }

    //if found then update with the information
    Order.findOneAndUpdate({_id:orderID},{OrderInfo:Order_JSON.OrderInfo,lastModified:Date.now()},{new: true},callback);

}


//this function will update order status given Order ID
module.exports.updateOrderStatus = async function(orderID,Order_JSON,callback){

    //check order exists in the collection
    if(await Order.check_Order_exists_byID(orderID) == null)
    {
        callback("Invalid Order ID",null);
        return;
    }

    //if found then update with the information
    Order.findOneAndUpdate({_id:orderID},{OrderStatus:Order_JSON.OrderStatus,lastModified:Date.now()},{new: true},callback);

}

// this function will update the CREATE_NEW_APPROVAL_CHAIN item given Order ID
// true means when update the request info it will create a new approval chain
// otherwise just update the content of order
module.exports.updateApprovalChainController = async function(orderID,Order_JSON,callback){

    //check order exists in the collection
    if(await Order.check_Order_exists_byID(orderID) == null)
    {
        callback("Invalid Order ID",null);
        return;
    }

    //if found then update with the information
    Order.findOneAndUpdate({_id:orderID},{Create_New_Approval_Chain:Order_JSON.data,lastModified:Date.now()},{new: true},callback);

}

//this function will update chat info given Order ID
module.exports.updateChatInfo = async function(orderID,Order_JSON,callback){

    const results = await Order.check_Order_exists_byID(orderID);
    //check order exists in the collection
    if( results == null)
    {
        callback("Invalid Order ID",null);
        return;
    }

    const userInfo = await Users_ref.User_exsists_inCollection_byID(Order_JSON.userName);

    if(userInfo == null)
    {
        callback("Invalid User ID",null);
        return;
    }

    var JSON_to_push = {
        "userName":userInfo.Name,
        "comment":Order_JSON.comment,
        "timeStamp":Date.now()
    }
    //var current_info = results.ChatInfo + "<br>" + Order_JSON.ChatInfo;


    //if found then update with the information
    Order.findOneAndUpdate({_id:orderID},{$push:{ChatInfo:JSON_to_push}, lastModified:Date.now()},{new: true},callback);

}

//this function will update order history given Order ID
module.exports.updateOrderHistory = async function(orderID,Order_JSON,callback){

    const results = await Order.check_Order_exists_byID(orderID);
    //check order exists in the collection
    if( results == null)
    {
        callback("Invalid Order ID",null);
        return;
    }

    const userInfo = await Users_ref.User_exsists_inCollection_byID(Order_JSON.userName);

    if(userInfo == null)
    {
        callback("Invalid User ID",null);
        return;
    }

    var JSON_to_push = {
        "userName":userInfo.Name,
        "action":Order_JSON.action,
        "timeStamp":Date.now()
    }
    //var current_info = results.ChatInfo + "<br>" + Order_JSON.ChatInfo;


    //if found then update with the information
    Order.findOneAndUpdate({_id:orderID},{$push:{OrderHistory:JSON_to_push}, lastModified:Date.now()},{new: true},callback);

}

//this function will remove an order and associated files given order ID
module.exports.removeOrder = async function(orderID,callback){

    //check order exists in the collection
    if(await Order.check_Order_exists_byID(orderID) == null)
    {
        callback("Invalid Order ID",null);
        return;
    }

    const DIR_path = __dirname+"/../orders/"+orderID;
    //remove all the associated files to this order - using rimraf library
    rimraf(DIR_path,(err)=>{
        if(err)
        {
            callback("Error occured while removing attachments associated with this order",null);
            return;
        }
    })

    //if found then update with the information
    Order.findByIdAndDelete({_id:orderID},callback);

}

//this function will assign a user to an Order
module.exports.assignOrder = async function(orderID,UserID,callback){

    const user_info = await Users_ref.validate_UserID(UserID)
    //check userID exists
    if( user_info == null)
    {
        callback("Invalid User ID",null);
        return;
    }

    //check order exists in the collection
    if(await Order.check_Order_exists_byID(orderID) == null)
    {
        callback("Invalid Order ID",null);
        return;
    }
    
    //if found then update with the information
    Order.findOneAndUpdate({_id:orderID},{assignedTo:UserID,assignedTo_name:user_info.Name},{new: true},callback);

}

//this function will untake an order.
module.exports.untakeOrder = function(orderID,callback)
{
    Order.findOneAndUpdate({_id:orderID},{assignedTo:null,assignedTo_name:null},{new: true},callback);
}

module.exports.getAssignedOrders = async function(userID,callback)
{
    //check userID exists
    if(await Users_ref.validate_UserID(userID) == null)
    {
        callback("Invalid User ID",null);
        return;
    }

    Order.find({"assignedTo":userID},callback);
}


//this function will return all the orders tied to a user
module.exports.getOrdersbyUserID = async function(UserID,callback){
    //first check if the user exists in the database
    const result = await Users_ref.User_exsists_inCollection_byID(UserID);

    if(result == null)
    {
        callback(`UserID ${UserID} does not exist in the database`,null);
        return;
    }

    //now lets look for all the orders under given userID
    try
    {

        callback(null, await Order.find({userID_ref:UserID}));

    }catch{
        callback(`Internal Error occured while fetching Order Information`,null);
        return;
    }
}


//this function will return all the orders 
module.exports.getAllOrders = async function(callback){

    //now lets look for all the orders under given userID
    try
    {
        callback(null, await Order.find({}));

    }catch{
        callback(`Internal Error occured while fetching Order Information`,null);
        return;
    }
}


//this function will return all the orders under an approver given it ID, SubUnit ID
module.exports.findApprovers_orders = async function(approverID, subUnitID, callback)
{
    //finding all the orders from the submitters
    try{
        const fetched_orders = await Order.find({"Unit_SubUnit_ref":subUnitID.toString(),"AwaitingResponses":approverID});
        callback(null,fetched_orders);
        return;
    }catch{
        callback(`Internal Error occured while fetching Order Information`,null);
        return;
    }

}


//this function will return order information to Fiscal staff and admin, given their Unit_ID, pretty much send all the orders under that unit (including all the orders from all the subunits under that unit)
module.exports.findOrdersForFiscal = async function (Unit_ID,callback)
{
    //this will keep track of all the oreders
    var ordersToSend = {
        "Unit":null,
        "SubUnits":[]
    }
    //check unit exisists in the database
    const unit_fetched = await Unit_ref.Unit_exsists_inCollection_byID(Unit_ID);

    if(unit_fetched == null)
    {
        callback(`Invalid Unit ID ${Unit_ID}`,null);
        return;
    }

    //now lets get all the subunits under this unit
    const subUnits = unit_fetched.subUnitIDs;

    

    //now lets find orders from Unit level
    try{
        const orders_from_unit = await Order.find({"Unit_SubUnit_ref":Unit_ID.toString()});
        ordersToSend.Unit = orders_from_unit;
    }catch
    {
        callback(`Internal Error occured while fetching Order Information`,null);
        return;
    }

    //now lets find order from all the subunits under the given unit
    try{
        for(var x=0;x<subUnits.length;x++)
        {
            var orders_from_subunit = await Order.find({"Unit_SubUnit_ref":subUnits[x].toString()});
            ordersToSend.SubUnits.push({"subUnitID":subUnits[x].toString(), "orders":orders_from_subunit});
        }
    }catch{
        callback(`Internal Error occured while fetching Order Information`,null);
        return;
    }

    callback(null,ordersToSend);


}


module.exports.ApproverResponse = async function(orderID, approverID, budgetNumber, LineItemNumber,response,callback)
{
    try{
	// Look at the submitter for this response.  If it is the same as the approver, reject.
	// XXX there are certain conditions where users *can* approve their own orders.
	// XXX Add that logic here.
	const asis_order = await Order.findOne({"_id": orderID});
	if (asis_order.userID_ref == approverID) {
            callback("You may not approve your own orders.  Sorry!", null);
            return;
	}

        const info =  await Order.findOneAndUpdate({"_id":orderID, "AwaitingResponses":approverID, "ApprovalResponses.BudgetNumber":budgetNumber, "ApprovalResponses.lineItemID": LineItemNumber}, 
        {'$set': 
        {'ApprovalResponses.$[approvalResponseObj].approverResponses.$[approverResponseObj].response':response}},
        {"arrayFilters":[{"approvalResponseObj.BudgetNumber":budgetNumber, "approvalResponseObj.lineItemID":LineItemNumber},{"approverResponseObj.approverID_ref":approverID}],new: true});

        if(info == null)
        {
            callback("No Order exists, according to given data", null);
            return;
        }

        //from the updated results lets only get the object that has been updated (i.e budget and line item obj)
        var updated_subDoc= null;
        for(var x=0;x<info.ApprovalResponses.length;x++)
            if(info.ApprovalResponses[x].lineItemID == LineItemNumber && info.ApprovalResponses[x].BudgetNumber == budgetNumber)
                updated_subDoc = info.ApprovalResponses[x];
        
        
        var ifApproverID_Contains = false;
        for(var x=0;x<updated_subDoc.approverResponses.length;x++)
            if(updated_subDoc.approverResponses[x].approverID_ref == approverID)
            {
                ifApproverID_Contains = true;
                break;
            }
                
        if(ifApproverID_Contains == false)
        {
            callback("Invalid Information", null);
            return;
        }
        //keep track if an record is updated
        var isUpdated = false;
        
        var final_reposnse_for_the_budget = null;
        //now lets calculate the final results for the budget number
        //case 1: where there's only one approver in the approval logic - in this case that approvers decision is the final decision
        if(updated_subDoc.approverResponses.length == 1)
        {
            if(updated_subDoc.approverResponses[0].response == true)
                final_reposnse_for_the_budget = true;
            else if(updated_subDoc.approverResponses[0].response == false)
                final_reposnse_for_the_budget = false;
            else if(updated_subDoc.approverResponses[0].response == null)
                final_reposnse_for_the_budget = null;

            isUpdated = true;          

        }else //case 2: where we have more than one approver. We need to walk through all the objects and read approver responses and decide final result
        {
            //this will keep track of if the approval logic consists of AND logic or OR logic
            var isAndLogic = false;
            if(updated_subDoc.approvalLogic.includes("&&"))
                isAndLogic = true;
            else
                isAndLogic = false;

            //this array will keep track of everyones approval responses
            var approval_responses = [];

            for(var x=0;x<updated_subDoc.approverResponses.length;x++)
                approval_responses.push(updated_subDoc.approverResponses[x].response);

            //console.log(isAndLogic);
            //console.log(approval_responses);

            //now lets calculate the final results
            //first check if its a AND logic or a OR logic
            if(isAndLogic)
            {
                //In this case if we have at at least one awaiting response, we cannot decide the final result
                if(approval_responses.includes(null))
                    final_reposnse_for_the_budget = null;
                else if (approval_responses.includes(false)) //if at least one false exists, this means according to AND logics the final answer should be false
                    final_reposnse_for_the_budget = false;
                else //represents a case, where everyone approved (i.e. all the elements in the array is true)
                    final_reposnse_for_the_budget = true;

                isUpdated = true;  
            }else
            {
                //console.log(approval_responses.includes(null) == false && approval_responses.includes(false));
                //in this case (OR logic case), if we have at least one true that means the final result should be true
                if(approval_responses.includes(true))
                    final_reposnse_for_the_budget = true;
                else if(approval_responses.includes(null) == false && approval_responses.includes(false)) //case where all rejected (i.e. array only contains false)
                    final_reposnse_for_the_budget = false;
                else // this case represents where array only contains null, i.e. no one responded yet
                    final_reposnse_for_the_budget = null; 
                    
                isUpdated = true;  
            }
            
        }


        if(isUpdated)
        {
            //updating final result in the selected record
            await Order.findOneAndUpdate({"_id":orderID, "AwaitingResponses":approverID, "ApprovalResponses.BudgetNumber":budgetNumber, "ApprovalResponses.lineItemID": LineItemNumber}, 
            {'$set': 
            {'ApprovalResponses.$[approvalResponseObj].finalResult':final_reposnse_for_the_budget}},
            {"arrayFilters":[{"approvalResponseObj.BudgetNumber":budgetNumber, "approvalResponseObj.lineItemID":LineItemNumber}],new: true});

            //finally pull out the userID from the awaitResponse array, since $pull removes all the duplicates, we need create a array which removes the one we need. then apply it to awaitingResponses using $set
            var onlyRemovedOne = false;
            var toSet = [];
            for(var x=0;x<info.AwaitingResponses.length;x++)
                if(info.AwaitingResponses[x].toString() == approverID && onlyRemovedOne == false)
                    onlyRemovedOne = true;
                else
                    toSet.push(info.AwaitingResponses[x]);
            
    
            await Order.findOneAndUpdate({"_id":orderID, "AwaitingResponses":approverID, "ApprovalResponses.BudgetNumber":budgetNumber, "ApprovalResponses.lineItemID": LineItemNumber}, 
            {'$set': 
            {'AwaitingResponses':toSet}},{new: true},callback);     
  
        }


    }catch(err){
        console.log(err);
        callback(err, null);
        return;
    }

}


//this function will return names of files that the user has attached with the order
module.exports.getfilesAttached = async function(orderID, callback)
{
    //first lets check if the order exists
    const results = await Order.check_Order_exists_byID(orderID);

    if(results == null)
    {
        callback(`Order ID ${orderID} does not exists`,null);
        return;
    }

    //lets check the file directory and see if we have any attached files
    const DIR_path = __dirname+"/../orders/"+orderID;

    fs.readdir(DIR_path, function (err, files) {
        //handling error
        if (err) {
            callback([],null);
            return;
        } 

        var fileNamesToSend = [];
        //listing all files using forEach
        files.forEach(function (file) {
            fileNamesToSend.push(file);
             
        });

        callback(null,fileNamesToSend);

    });
}



// ------------------- End of API Functions ------------------------------------------------------------------




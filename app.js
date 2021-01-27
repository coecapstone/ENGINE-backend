var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongose = require('mongoose');
var fileUpload  = require('express-fileupload');

// just a comment
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  
app.use(bodyParser.json());
app.use(fileUpload());

//adding all the required Models to the App
Users = require('./models/Users');
Units = require('./models/Units');
SubUnits = require('./models/SubUnits');
Orders = require('./models/Orders');
AllBudgets = require('./models/AllBudgets');
user_Notifications = require('./models/notifications');
emailService = require('./models/emailService');

var fs = require('fs');
const { isObject } = require('util');
//const notifications = require('./models/notifications');

//connect to mongoose --test 123
var mongoPath = 'mongodb+srv://developers:123HelloWorld@cluster0-e0mig.azure.mongodb.net/test?retryWrites=true&w=majority';
mongose.connect(mongoPath, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true,  useFindAndModify: false });
var db = mongose.connection;

var server = require('http').createServer(app);
var io = require('socket.io')(server); 


//app.listen(process.env.PORT|| 3000);
server.listen(process.env.PORT||3000);
console.log("Backend Running on Port 3000");

var currentClient = null;
//change this to a stack, so we can keep multiple users here
var clinet_userID = null;
io.on('connection', function(client){
    console.log('Client connected.....');

    currentClient = client;
    client.on('join',function(data){
        clinet_userID = data;
        console.log(data);
        //client.emit('message', "Hello from the other side !");
    });
});

// ------ API Routes -------------


//------------------------get request for landing page-------------------------------------------
app.get('/',function(req,res){
    res.send('Please use /api/ to access the API');
});

app.post('/api/testNotification',function(req,res){

    var JSON_info = req.body;

    currentClient.emit('message', {"Type":JSON_info.Type, "Title":JSON_info.Title, "Message":JSON_info.Message,"timeStamp":new Date().toISOString()});
    res.send('Notification triggered');
    user_Notifications.addNotification(JSON_info);
    emailService.initialize_transporter('gmail','kalana.sahabandu@gmail.com','_1Divxplayer');
    emailService.Configure_mail_to('kalana.sahabandu@gmail.com','ksahaban@uw.edu',JSON_info.Title, JSON_info.Message);
    emailService.SendMail();
    
});


//------------------------------------------------------------------------------------------------



// ---- User Routes -------

//Route to add a new Users to the Collection
app.post('/api/users',function(req,res){
    var User_JSON = req.body;

    Users.addUser(User_JSON,function(value,user){
        if(value){
            res.json({"status":true, "data":value});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});


app.post('/api/users/updateAddress/:_id',function(req,res){
    console.log("called");
    var JSONAddress = req.body;
    var userID= req.params._id;

    Users.updateAddress(JSONAddress,userID,function(err,order){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":order});
        }
    });
});

//Route to update Users information in the Collection
app.put('/api/users/:_email/:_id',function(req,res){
    var User_JSON = req.body;
    var old_email= req.params._email;
    var old_UWID = req.params._id;

    Users.updateUserInfo(old_email,old_UWID,User_JSON,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//Route to update Users information in the Collection given their ID
app.put('/api/usersbyID/:_id',function(req,res){
    var User_JSON = req.body;
    var ID = req.params._id;
    Users.updateUserInfobyID(ID,User_JSON,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//route to remove a user given users ID
app.delete('/api/users/:_id',function(req,res){
    var user_ID = req.params._id;

    Users.removeUser(user_ID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});


//Route will return user information given users information
app.get('/api/users/:_id',function(req,res){
    var userID = req.params._id;

    Users.searchUser_byObjectID(userID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//this API route will upload files to the server
app.post('/api/uploadProfilePic',function(req,res){

    var files = req.files;
    console.log(req.body);
    Users.uploadImage(files,function(err,order){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":order});
        }
    });
});



// ---- End of User Routes ------


// ---- Unit Routes -------

//Route to add a new Units to the Collection
app.post('/api/units',function(req,res){
    var Unit_JSON = req.body;

    Units.addUnit(Unit_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//route to add new users to Unit
app.post('/api/units/:_id',function(req,res){
    var Unit_users = req.body;
    var Unit_ID = req.params._id;
    Units.addUsers_to_Unit_byID(Unit_ID,Unit_users.userIDs,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//route to get information about all the users in the unit
app.get('/api/units/getUserInfomation/:_id',function(req,res){
    var Unit_ID = req.params._id;
    Units.getUsers_with_information(Unit_ID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this will update the users access level given its ID and new accessLevel information
app.put('/api/units/:_userID/:_accessLevel/:_unitID',function(req,res){
    var userID = req.params._userID;
    var accessLevel = req.params._accessLevel;
    var unitID = req.params._unitID;

    Units.update_user_accessLevel(userID,accessLevel,unitID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});


//this will update unit name given new name, its ID 
app.put('/api/units/:_unitID/:_newUnitName',function(req,res){
    var unitID = req.params._unitID;
    var newUnitName = req.params._newUnitName;

    Units.Update_unit_name(unitID,newUnitName,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//this will remove the users its ID and new accessLevel information from the unit
app.delete('/api/units/removeUser/:_userID/:_unitID',function(req,res){
    var userID = req.params._userID;
    var unitID = req.params._unitID;

    Units.remove_user_from_accessLevel(userID,unitID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});


//this will add form visibility information to the Unit
app.put('/api/formVisibility/:_unitID',function(req,res){
    var unitID = req.params._unitID;
    var formInfo = req.body;
    Units.AddFormVisibilityInformation(unitID,formInfo,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//this will change visibility of a form given forms ID and Unit ID
app.put('/api/formVisibility/:_unitID/:_formID/:_isVisible',function(req,res){
    var unitID = req.params._unitID;
    var isVisible = req.params._isVisible;
    var formID = req.params._formID;

    Units.SetFormVisible_status(unitID,formID,isVisible,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//this will change visibility of a form given forms ID and Unit ID
app.get('/api/formVisibility/:_unitID',function(req,res){
    var unitID = req.params._unitID;


    Units.getFormVisibility_Information(unitID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

// ---- End of Unit Routes ------


// ---- SubUnit Routes -------

//route to add subunits to the collection
app.post('/api/subunits',function(req,res){
    var Unit_JSON = req.body;

    SubUnits.addSubUnits(Unit_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//route to add submitters to the collection
app.post('/api/submitters/:_id',function(req,res){
    const Unit_JSON = req.body;
    const SubUnit_ID = req.params._id;

    SubUnits.addSubmitters(Unit_JSON,SubUnit_ID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//route to remove submitters to the collection
app.post('/api/Removesubmitters/:_id',function(req,res){
    const Unit_JSON = req.body;
    const SubUnit_ID = req.params._id;

    SubUnits.removeSubmitter(Unit_JSON,SubUnit_ID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});



//route to remove approvers to the collection
app.post('/api/approvers/:_id/:_budgetID',function(req,res){
    const approver_JSON = req.body;
    const SubUnit_ID = req.params._id;
    const Budget_ID = req.params._budgetID

    SubUnits.addApprover(SubUnit_ID,Budget_ID,approver_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//route to update approvers to the collection
app.put('/api/approvers/:_subUnitID/:_budgetID/',function(req,res){
    const approver_JSON = req.body;
    const SubUnit_ID = req.params._subUnitID;
    const Budget_ID = req.params._budgetID;

    SubUnits.updateApprover(SubUnit_ID,Budget_ID,approver_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//route to delete a  Subunit
app.delete('/api/approvers/:_subUnitID/:_budgetID/:_approverID',function(req,res){
    var SubUnitID = req.params._subUnitID;
    var budgetID = req.params._budgetID;
    var approverID = req.params._approverID;

    SubUnits.removeApprover(SubUnitID,budgetID,approverID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//this route will update the approval logic
app.put('/api/approvalLogic/:_subUnitID/:_budgetID/:_approvalLogicString',function(req,res){
    const SubUnit_ID = req.params._subUnitID;
    const Budget_ID = req.params._budgetID;
    const approvalLogicString = req.params._approvalLogicString;

    SubUnits.updateApprovalLogic(SubUnit_ID,Budget_ID,approvalLogicString,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//route to add new budget to a subunit given its subunit ID
app.post('/api/addNewBudgets/:_id',function(req,res){
    const budgets_JSON = req.body;
    const SubUnit_ID = req.params._id;

    SubUnits.addBudget(SubUnit_ID,budgets_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//route to remove budget
app.get('/api/removeBudget/:_subUnitID/:_BudgetNumber',function(req,res){
    const SubUnit_ID = req.params._subUnitID;
    const BudgetNumber = req.params._BudgetNumber;

    SubUnits.removeBudget(SubUnit_ID,BudgetNumber,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//route to get information about given subunit
app.get('/api/subunits/:_subUnitID',function(req,res){
    const SubUnit_ID = req.params._subUnitID;

    SubUnits.getSubUnitDetails(SubUnit_ID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//route to get information subunits under a given unit
app.get('/api/subunitsinUnit/:_UnitID',function(req,res){
    const Unit_ID = req.params._UnitID;

    SubUnits.getAll_subunits(Unit_ID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//route to budget information given Budget number
app.get('/api/getBudget/:_budgetID/',function(req,res){
    const budgetID = req.params._budgetID;

    SubUnits.getBudgetDetails(budgetID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//route to get information about submitters given subunit ID
app.get('/api/getSubmitterInfo/:_subUnitID/',function(req,res){
    const subUnitID = req.params._subUnitID;

    SubUnits.getSubmitterInfo(subUnitID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

app.get('/api/login/:_netID',function(req,res){
    var User_JSON = req.params._netID;

    SubUnits.loginUser(User_JSON,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//route to change Subunit Name
app.put('/api/subunits/:_subUnitID/:_newName',function(req,res){
    var SubUnitID = req.params._subUnitID;
    var newName = req.params._newName;

    SubUnits.UpdateSubUnitName(SubUnitID,newName,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

//route to delete a  Subunit
app.delete('/api/subunits/:_subUnitID',function(req,res){
    var SubUnitID = req.params._subUnitID;

    SubUnits.removeSubunit(SubUnitID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

app.get('/api/getuserInformation/:_userID',function(req,res){
    var User_ID = req.params._userID;

    SubUnits.findUser_information(User_ID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

app.get('/api/getBudgetsUnderSubUnit/:_subUnitID',function(req,res){
    var subUnitID = req.params._subUnitID;

    SubUnits.getBudgetsUnderSubUnit(subUnitID,function(err,user){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":user});
        }
    });
});

// ---- End of SubUnit Routes ------


// ---- Orders Routes -------

//this API route will upload files to the server
app.post('/api/uploadOrder/:_type/:_ID',function(req,res){
    var Order_JSON = req.body;
    var Sub_OR_UnitID = req.params._ID;
    var type = req.params._type;
    var files = req.files;
    Orders.addOrder(JSON.parse(Order_JSON.JSON_body),files,Sub_OR_UnitID,type,function(err,order){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":order});
        }
    });
});

//this API route will send Order information given order ID
app.get('/api/getOrderInformation/:_OrderID',function(req,res){

    var OrderID = req.params._OrderID;

    Orders.getOrderInformation(OrderID,function(err,order){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":order});
        }
    });
});

//this API route upload files to a given order given Order ID
app.post('/api/uploadFiles/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;
    const files = req.files;

    Orders.uploadFiles(Order_ID,files,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

// this API route will update the order, 
// including check if need to create new approval chain
// given OrderID and type (subunit/unit)
app.post('/api/updateOrder/:_orderID/:_type',function(req,res){
    var type = req.params._type;
    const Order_ID = req.params._orderID;
    const Order_JSON = req.body;
    Orders.updateOrder(Order_ID,Order_JSON,type,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

// this API route will update the OrderInfo only given OrderID
app.post('/api/updateOrderInfo/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;
    const Order_JSON = req.body;
    Orders.updateOrderInfo(Order_ID,Order_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will update the updateOrderStatus given OrderID
app.post('/api/updateOrderStatus/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;
    const Order_JSON = req.body;
    Orders.updateOrderStatus(Order_ID,Order_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

// this function will update the CREATE_NEW_APPROVAL_CHAIN item given Order ID
// true means when update the request info it will create a new approval chain
// otherwise just update the content of order
app.post('/api/updateApprovalChainController/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;
    const Order_JSON = req.body;
    Orders.updateApprovalChainController(Order_ID,Order_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will update the chatinfo given OrderID
app.post('/api/updateChatInfo/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;
    const Order_JSON = req.body;
    Orders.updateChatInfo(Order_ID,Order_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will update the order history given OrderID
app.post('/api/updateOrderHistory/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;
    const Order_JSON = req.body;
    Orders.updateOrderHistory(Order_ID,Order_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will remove the order given orderID
app.delete('/api/removeOrder/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;
    Orders.removeOrder(Order_ID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will assign an order to financial staff given OrderID and userID
app.post('/api/assignOrder/:_orderID/:_userID',function(req,res){
    const Order_ID = req.params._orderID;
    const userID = req.params._userID;
    Orders.assignOrder(Order_ID,userID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will untake an order. Such that we can assign new fiscal member using above route 
app.get('/api/untakeOrder/:_orderID',function(req,res){
    const Order_ID = req.params._orderID;

    Orders.untakeOrder(Order_ID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will return all the orders tied to a userID
app.get('/api/getAssignedOrders/:_userID',function(req,res){
    const userID = req.params._userID;

    Orders.getAssignedOrders(userID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

//this API route will return all the orders tied to a userID
app.get('/api/getOrders/:_userID',function(req,res){
    const userID = req.params._userID;
    Orders.getOrdersbyUserID(userID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//this API route will return all the orders tied to a userID
app.get('/api/getAllOrders',function(req,res){
    const userID = req.params._userID;
    Orders.getAllOrders(function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//this function will return all the orders under an approver given it ID, SubUnit ID
app.get('/api/findApproverOrders/:_approverID/:_subUnitID',function(req,res){
    const approverID = req.params._approverID;
    const subUnitID = req.params._subUnitID;

    Orders.findApprovers_orders(approverID,subUnitID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//this function will return all the orders under an unit - for fiscal staff use
app.get('/api/findOrdersForFiscal/:_UnitID',function(req,res){
    const UnitID = req.params._UnitID;

    Orders.findOrdersForFiscal(UnitID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//this function will update order with approver's response
app.put('/api/ApproverResponse',function(req,res){
    const approver_JSON = req.body;

    Orders.ApproverResponse(approver_JSON.orderID,approver_JSON.approverID,approver_JSON.budgetNumber,approver_JSON.LineItemNumber,approver_JSON.response,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


//this function will return names of files that the user has attached with the order
app.get('/api/getfilesAttached/:_OrderID',function(req,res){
    const OrderID = req.params._OrderID;

    Orders.getfilesAttached(OrderID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


// ---- End of Orders Routes ------

// ---- AllBudgets Routes -------------------

//this API route will add new Budgets to Units 
app.post('/api/allBudgets/:_UnitID',function(req,res){
    const UnitID = req.params._UnitID;
    const AllBudget_JSON = req.body;
    AllBudgets.add_to_All_Budgets(UnitID,AllBudget_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

app.get('/api/allBudgets/:_UnitID',function(req,res){
    const UnitID = req.params._UnitID;
    AllBudgets.get_all_budget_under_unit(UnitID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});

app.delete('/api/allBudgets/:_UnitID/:_budgetID',function(req,res){
    const budgetID = req.params._budgetID;
    const unitID = req.params._UnitID;

    AllBudgets.remove_budget_from_collection(budgetID,unitID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


app.put('/api/allBudgets/:_budgetID',function(req,res){
    const budgetID = req.params._budgetID;
    const AllBudget_JSON = req.body;

    AllBudgets.update_budget_information(budgetID,AllBudget_JSON,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});


app.put('/api/allBudgets/uploadExcelFile/:_UnitID',function(req,res){
    console.log("Triggerd - Excel upload");
    const UnitID = req.params._UnitID;
    const files = req.files;

    AllBudgets.add_new_budgets_from_excel_file(files,UnitID,function(err,unit){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":unit});
        }
    });
});



// ---- End of AllBudgets Routes -------------

//----------------- Notification ROUTES ---------------------------------------------------------------
app.get('/api/getNotifications/:_userID', function(req,res){

    const userID = req.params._userID;

    user_Notifications.getNotifications(userID,function(err,notifications){
        if(err){
            res.json({"status":false, "data":err});
        }else{
            res.json({"status":true, "data":notifications});
        }
    });

});
//----------------- END OF Notification ROUTES --------------------------------------------------------

//----------------- FILE DOWNLOAD ROUTES --------------------------------------------------------
app.get('/api/downloadAttachment/:_orderID/:_fileName', function(req,res){
    const orderID = req.params._orderID;
    const fileName = req.params._fileName;


    //check if file actually exists
    const DIR_path = __dirname+"/orders/"+orderID;
    var isFileFound = false;
    fs.readdir(DIR_path, function (err, files) {
        //handling error
        if (err) {
            console.log(err);
            res.json({"status":false, "data":'Internal Server Error Occured - Invalid OrderID'});
            return;
        } 

        //listing all files using forEach
        files.forEach(function (file) {
            
            if(fileName == file)
                isFileFound = true;
             
        });
        
        if(!isFileFound)
        {
            res.json({"status":false, "data":'File not Found'});
            return;
        }else
        {
            res.download(DIR_path+'/'+fileName);
            return;
        }
            


    });

});
//----------------- END OF FILE DOWNLOAD ROUTES -------------------------------------------------
//this will allow us to access methods defined in Units model
var Units_ref = require('./Units');

var mongoose = require('mongoose');

//dependency to read excel files
var xlsxFile = require('read-excel-file/node');
//file system dependency
var fs = require('fs');

//schema for All the budgets that a Unit will maintain 

var AllBudgetsScheme = mongoose.Schema({
    UnitID_ref:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Unit',
        required: true
    },
    BudgetNumber:{
        type: String,
        required: true
    },
    BudgetName:{
        type: String,
        required: true
    },
    StartDate:{
        type:Date
    },
    EndDate:{
        type:Date
    }
  
});

var AllBudgets = module.exports = mongoose.model('AllBudgets', AllBudgetsScheme);


// ------------------- Helper Functions --------------------------------------------------------

//This validator function will validate Passed in JSON object contains correct data types
function validate_and_copy_passedJSON(JSON_Obj,UnitID_ref, callback) {

    var err_list = []; //this will keep all the error messages
    //Empty template of a user JSON object
    var Budget_JSON_Obj = {
        "UnitID_ref":UnitID_ref,
        "BudgetNumber": null,
        "BudgetName": null,
        "StartDate": null,
        "EndDate": null

    };

    if (typeof JSON_Obj.BudgetNumber != 'string')
        err_list.push("Budget Number is not String type");
    else
        Budget_JSON_Obj.BudgetNumber = JSON_Obj.BudgetNumber;

    if (typeof JSON_Obj.BudgetName != 'string')
        err_list.push("Budget Name is not String type");
    else
        Budget_JSON_Obj.BudgetName = JSON_Obj.BudgetName;

    if (Date.parse(Budget_JSON_Obj.StartDate) == null)
        err_list.push("Start Date is not Date type");
    else
        Budget_JSON_Obj.StartDate = JSON_Obj.StartDate;  

    if (Date.parse(Budget_JSON_Obj.EndDate) == null)
        err_list.push("End Date is not Date type");
    else
        Budget_JSON_Obj.EndDate = JSON_Obj.EndDate;

    if(err_list.length == 0)
        return Budget_JSON_Obj;
    else
    {
        callback(err_list,null);
        return null;
    }
}


//This validator function will validate Passed in JSON object contains correct data types
function validate_and_copy_passedJSON_Excel_upload(JSON_Obj,UnitID_ref, rowNumber, callback) {

    var err_list = []; //this will keep all the error messages
    //Empty template of a user JSON object
    var Budget_JSON_Obj = {
        "UnitID_ref":UnitID_ref,
        "BudgetNumber": null,
        "BudgetName": null,
        "StartDate": null,
        "EndDate": null

    };

    if (typeof JSON_Obj.BudgetNumber != 'string')
        err_list.push("Budget Number is not String type");
    else
        Budget_JSON_Obj.BudgetNumber = JSON_Obj.BudgetNumber;

    if (typeof JSON_Obj.BudgetName != 'string')
        err_list.push("Budget Name is not String type");
    else
        Budget_JSON_Obj.BudgetName = JSON_Obj.BudgetName;

    if (Date.parse(Budget_JSON_Obj.StartDate) == null)
        err_list.push("Start Date is not Date type");
    else
        Budget_JSON_Obj.StartDate = JSON_Obj.StartDate;  

    if (Date.parse(Budget_JSON_Obj.EndDate) == null)
        err_list.push("End Date is not Date type");
    else
        Budget_JSON_Obj.EndDate = JSON_Obj.EndDate;

    if(err_list.length == 0)
        return Budget_JSON_Obj;
    else
    {
        if(JSON_Obj.BudgetNumber == null || JSON_Obj.BudgetNumber=="")
            callback(err_list,`Excel Document Row ${rowNumber}`);
        else
            callback(err_list,JSON_Obj.BudgetNumber);
        return null;
    }
}

//return false in error or budget number already exists and return true if budget number does not exists
module.exports.Budget_exists_under_Unit = async function (UnitID,Budget_Number,callback) 
{
    const Unit_results = await Units_ref.Unit_exsists_inCollection_byID(UnitID);
    //check if unit actually exists. if no there's no point of moving forward. 
    if(Unit_results == null)
    {
        callback(`Unit ID:"${UnitID}" does not exsists`,null);
        return false;
    }

    try
    {
        const budget_results = await AllBudgets.findOne({UnitID_ref:UnitID, BudgetNumber:Budget_Number });

        if(budget_results)
        {
            callback(`BudgetNumber:"${Budget_Number}" already exists under this Unit`,null);
            return false;
        }else
            return true;

    }catch
    {
        callback(`Internal Server error occured, while looking for budget records`,null);
        return false;
    }
}

// ------------------- End of Helper Functions --------------------------------------------------------



module.exports.add_to_All_Budgets = async function (UnitID,JSON_Obj,callback)
{
    const validated_results = validate_and_copy_passedJSON(JSON_Obj,UnitID, callback);
    if(validated_results == null)
        return;

    //check budget already exists in the database
    const results_Budgets = await AllBudgets.Budget_exists_under_Unit(UnitID, JSON_Obj.BudgetNumber, callback);
    if(results_Budgets == false)
        return;

    //now lets add the Budget to the table
    AllBudgets.create(validated_results, callback);
}


module.exports.get_all_budget_under_unit = async function(UnitID,callback)
{
    const Unit_results = await Units_ref.Unit_exsists_inCollection_byID(UnitID);
    //check if unit actually exists. if no there's no point of moving forward. 
    if(Unit_results == null)
    {
        callback(`Unit ID:"${UnitID}" does not exsists`,null);
        return false;
    }

    //now lets find all the buudgets under given unit and return to user
    AllBudgets.find({UnitID_ref:UnitID},callback);
}

module.exports.remove_budget_from_collection = async function(budgetID,UnitID,callback)
{
    const Unit_results = await Units_ref.Unit_exsists_inCollection_byID(UnitID);
    //check if unit actually exists. if no there's no point of moving forward. 
    if(Unit_results == null)
    {
        callback(`Unit ID:"${UnitID}" does not exsists`,null);
        return false;
    }

    //now lets remove the budget
    AllBudgets.findByIdAndDelete(budgetID,callback);

}

module.exports.update_budget_information = function(budgetID,JSON_Obj,callback)
{
    AllBudgets.findByIdAndUpdate(budgetID,JSON_Obj,callback);
}

module.exports.add_new_budgets_from_excel_file = async function(excelFile,UnitID,callback)
{
    var return_results = [];
    var passed_ones = [];
    var read_rows = null
    var JSON_object = {
        "BudgetNumber": null,
        "BudgetName": null,
        "StartDate": null,
        "EndDate": null     
    }

    const Unit_results = await Units_ref.Unit_exsists_inCollection_byID(UnitID);
    //check if unit actually exists. if no there's no point of moving forward. 
    if(Unit_results == null)
    {
        callback(`Unit ID:"${UnitID}" does not exsists`,null);
        return;
    }

    const file_name = Object.keys(excelFile);
    const selected_file = (excelFile[file_name[0]]);
    const temp_file_path = __dirname+"/../temp/"+selected_file.name;

    //move the file to working directory s.t the excel reader can read it
    await selected_file.mv(temp_file_path);

    //if Unit found we can proceed
    //read all the rows into a array
    await xlsxFile(temp_file_path).then((rows) => {
        read_rows = rows;
       });
      

    //now lets try to add these budgets to the database
    for(var y=1;y<read_rows.length;y++)
    {
        //fill in JSON Object
        JSON_object.BudgetNumber = read_rows[y][0];
        JSON_object.BudgetName = read_rows[y][1];
        JSON_object.StartDate = read_rows[y][2];
        JSON_object.EndDate = read_rows[y][3];


        var validated_JSON = validate_and_copy_passedJSON_Excel_upload(JSON_object,UnitID,y+1,function (err,Budget_Number) {
            return_results.push({"BudgetNumber":Budget_Number, "Info":err});
        });
    
        //if JSON is validated then push to database
        if(validated_JSON)
        {
            //check budget already exists under database
            try{
                var budget_results = await AllBudgets.findOne({UnitID_ref:UnitID, BudgetNumber:validated_JSON.BudgetNumber });
                if(budget_results)
                {
                    return_results.push({"BudgetNumber":validated_JSON.BudgetNumber, "Info":["Budget Already exists"]});
                }else
                {
                    //otherwise add them to the database
                    AllBudgets.create(validated_JSON);
                    passed_ones.push({"BudgetNumber":validated_JSON.BudgetNumber, "Info":["Success"]})
                }
            }catch(err)
            {
                return_results.push({"BudgetNumber":validated_JSON.BudgetNumber, "Info":["Internal server error occured. Try again"]});
            }
        }
    }   

    //finally remove the temporary file from the system
    await fs.unlink(temp_file_path,function (err) {
        if (err) throw err;
        // if no error, file has been deleted successfully
    });

    callback(null,{"success":passed_ones, "errors":return_results});
}


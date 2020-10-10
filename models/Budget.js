var mongoose = require('mongoose');
//allows to use currency
require('mongoose-currency').loadType(mongoose);
//schema for SubUnits

var budgetScheme = mongoose.Schema({
    budgetNumber:{
        type:String,
        required: true,
        unique: true
    },
    budgetName:{
        type:String,
        required:true
    },
    startDate:{
        type:Date,
        required: true
    },
    endDate:{
        type:Date
    },
    approvers:[
        {
            ID:{
                type:mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required:true
            },
            limit:{
                type:mongoose.Types.Currency,
                required:true
            },
            allowedRequests:{
                type:[String],
                required:true
            },
            PI:{
                type:Boolean,
                required:true
            }
        }
    ],
    approvalLogic:{
        type:String,
        required:true
    }

});

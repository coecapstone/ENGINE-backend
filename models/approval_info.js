var mongoose = require('mongoose');

var approvalLogicResponses_scheme = mongoose.Schema({

    lineItemID:{
        type:Number,
        required: true
    },
    approvalLogic:{
        type:String,
        required: true
    },
    approverResponses:[
        {
            approverID_ref:{
                type:mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            response:{
                type:Boolean,
                required: true
            }
        }
    ],
    finalResult:{
        type:Boolean,
        required:true
    },
    BudgetNumber:{
        type:String,
        required:true
    }

});




const accountModel = require("../models/account.model")


async function createAccountController(req,res) {
    const user = req.user
    const account = await accountModel.create({
        user:user._id
    })


    res.status(201).json({
        account
    })
    
}



async function getUserAccountController(req, res){
    const accounts = await accountModel.find({user: req.user._id})

    return res.status(200).json({
        accounts
    })
}


async function getAccountBalanceController(req, res){
    const {accountId} = req.params;

    console.log("PARAM ID:", req.params.accountId)
    console.log("USER ID:", req.user._id)



        /*     Account database me dhundhte hain:
            Sirf wahi account jo user ka hai
            Ye ensure karta hai ki koi bhi user dusre ka account balance nahi dekh sakta
        
        */

    const account = await accountModel.findOne({
        _id: accountId,
        user:req.user._id
    })


    if(!account){
        return res.status(404).json({
            message:"Account not found"
        })
    }

        /*       Account ka balance calculate karte hain ledger entries se
                Yaha credit minus debit se balance nikalta hai
                Ye logic ye ensure karta hai ki har user ko sirf apna accurate balance mile  

        */

    const balance = await account.getBalance()

    res.status(200).json({
        accountId: account._id,
        balance: balance
    })
}



module.exports = {
    createAccountController,
    getUserAccountController,

    getAccountBalanceController
}
const transactionModel = require("../models/transaction.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const ledgerModel = require("../models/ledger.model")
const mongoose = require("mongoose")
const { promises } = require("nodemailer/lib/xoauth2")

/**
 * -> create a new transaction
 * THE 10 STEPS TRANSFER FLOW
 *   -> validate request
 *   -> validate idempotency key
 *   -> check amount status
 *   -> Drive sender balance from ledger
 *   -> Create transaction (PENDING)
 *   -> Create Debit ledger entry
 *   -> Create Credit ledger entry
 *   -> Mark transaction COMPLETED
 *   -> commit mongoDB session
 *   -> send email notifiaction

 */


async function createTransaction(req, res){


    // 1. validate request

    const{fromAccount, toAccount, amount, idempotencyKey} = req.body

    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message:"FromAccount, toAccount, amount and idempotency are required"
        })
    }


    const fromUserAccount = await accountModel.findOne({
        _id:fromAccount,
    })

    const toUserAccount = await accountModel.findOne({
        _id:toAccount,
    })


    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message:"Invalid fromUserAccount or toUserAccount"
        })
    }


    console.log("FROM ACCOUNT:", fromAccount)
    console.log("TO ACCOUNT:", toAccount)


    //2. validate idempotency key



    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if(isTransactionAlreadyExists){
        if(isTransactionAlreadyExists.status === "COMPLETED"){
            return res.status(200).json({
                message:"Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }

        if(isTransactionAlreadyExists.status === "PENDING"){
            return res.status(200).json({
                message:"Transaction is still processing",

            })
        }


        if(isTransactionAlreadyExists.status === "FAILED"){
            return res.status(500).json({
                message:"Transaction is failed, please retry"
            })
        }


        if(isTransactionAlreadyExists.status === "REVERSED"){
            return res.status(500).json({
                message:"Transaction was reversed, please retry"
            })
        }


    }



    //3. check amount status


    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message:"Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }



    // 4. Drive sender balance from ledger


    const balance = await fromUserAccount.getBalance()

    if(balance < amount){
        return res.status(400).json({
            message:`Insufficient balance. Current balance is ${balance}.Requested amount is ${amount}`
        })
    }

    let transaction;


    try{

    //5 Create transaction (PENDING)

    const session = await mongoose.startSession()
    session.startTransaction()

    transaction = (await transactionModel.create([{
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status:"PENDING"

    }],{session}))[0]


    const debitLedgerEntry = await ledgerModel.create([{
        account: fromAccount,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }],{session})

    // await( () => {
    //         return new promises((resolve) => setTimeout(resolve, 15 * 1000));
    // })()


    await new Promise(resolve => setTimeout(resolve, 15000));

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }],{session})

    // console.log("CREDIT ENTRY:", creditLedgerEntry)


    await transactionModel.findOneAndUpdate(
        {_id:transaction._id},
        {status:"COMPLETED"},
        {session})


    // transaction.status ="COMPLETED"
    // await transaction.save({session})




    await session.commitTransaction()
    session.endSession()

    }
    catch(err){
        console.log("Transaction ERROR:", err);
        return res.status(400).json({
            message:"Transaction is PENDING due to some issue, please retry after sometime"
        })
    }



    //10 send email notifiaction


    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount, fromAccount)


    return res.status(201).json({
        message:"Transaction completed successfully",
        transaction: transaction
    })

}


async function createIntialFundsTransaction(req, res){

    //  console.log("REQ.USER:", req.user)

    // just for checking

    const {toAccount, amount, idempotencyKey} = req.body

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message:"toAccount, amount, and idempotencyKey are required"
        })
    }


    const toUserAccount = await accountModel.findOne({
        _id:toAccount,
    })

    if(!toUserAccount){
        return res.status(400).json({
            message:"Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        
        user: req.user._id
    })

    console.log("SYSTEM ACCOUNT (FROM):", fromUserAccount._id)
console.log("USER ACCOUNT (TO):", toUserAccount._id)

    if(!fromUserAccount){
        return res.status(400).json({
            message:"System user account not found!!"
        })
    }



    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = await transactionModel.create({
        fromAccount:fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status:"PENDING"

    }, {session})


    const debitLedgerEntry = await ledgerModel.create({
        account:fromUserAccount._id,
        amount:amount,
        transaction:transaction._id,
        type:"DEBIT"

    },{session})


    const creditLedgerEntry = await ledgerModel.create({
        account:toUserAccount._id,
        amount:amount,
        transaction:transaction._id,
        type:"CREDIT"

    },{session})


    transaction.status = "COMPLETED"
    await transaction.save({session})

    await session.commitTransaction()
    session.endSession()


    return res.status(201).json({
        message:"Inital funds transaction completed sucessfully",
        transaction:transaction

    })
}


module.exports = { createTransaction, createIntialFundsTransaction}
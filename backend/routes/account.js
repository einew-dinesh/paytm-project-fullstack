const express = require('express');
const { authMiddleware } = require('./middleware');
const { Account } = require('../db');
const { default: mongoose } = require('mongoose');

const router = express.Router();

router.use(authMiddleware)

router.get('/balance',async(req,res)=>{
    const userId = req.headers.userId
    const account = await Account.findOne({userId})
    console.log(account)
    if(account){
        return res.status(200).json({
            balance:account.balance
        })
    }else{
        return res.status(411).json({
            message:"You dont have bank account"
        })
    }
})

router.post('/transfer',async(req,res)=>{
    const from = req.headers.userId
    const to = req.body.to
    const amount = req.body.amount

    const session = await mongoose.startSession();
    session.startTransaction();

    const senderAccount = await Account.findOne({userId:from}).session(session)
    if(!senderAccount||senderAccount.balance<amount){
        await session.abortTransaction()
        return res.status(400).json({
            message:"Insufficient balance"
        })
    }
    
    try{
        await Account.findOne({userId:to}).session(session)
    }catch(err){
        await session.abortTransaction()
        return res.status(400).json({
            message:"Invaild account you want to send"
        })
    }


    await Account.findOneAndUpdate({userId:from},{$inc:{balance:-amount}}).session(session)
    await Account.findOneAndUpdate({userId:to},{$inc:{balance:amount}}).session(session)

    session.commitTransaction()

    return res.status(200).json({
        message:"Transfer successful"
    })
        

})

module.exports = router
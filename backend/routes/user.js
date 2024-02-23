const express = require("express")
const z = require('zod')
const jwt = require('jsonwebtoken')
const {JWT_SECRET} = require('./../config')
const {authMiddleware} = require('./middleware')


const {User, Account} = require('./../db')

const router = express.Router();

const signupBody = z.object({
    username:z.string().min(3).max(30).toLowerCase().trim(),
    password:z.string().min(6).trim(),
    firstName:z.string().max(50).trim(),
    lastName:z.string().max(50).trim()
})

const signinBody = z.object({
    username:z.string().min(3).max(30).toLowerCase().trim(),
    password:z.string().min(6).trim()
})

const userUpdateBody = z.object({
    password:z.string().min(6).trim().optional(),
    firstName:z.string().max(50).trim().optional(),
    lastName:z.string().max(50).trim().optional()
})

const validateSignup = (req, res, next) => {
    const {success}= signupBody.safeParse(req.body)
    if(!success){
        return res.status(411).json({
            message:"Incorrect Inputs"
        })
    }else{
        return next();
    }

};
const validateSignin = (req, res, next) => {
    const {success}= signinBody.safeParse(req.body)
    if(!success){
        return res.status(411).json({
            message:"Incorrect Inputs"
        })
    }else{
        return next();
    }
};
const validateUserUpdate = (req,res,next)=>{
    const {success}= userUpdateBody.safeParse(req.body)
    if(!success){
        return res.status(411).json({
            message:"Error while updating values"
        })
    }else{
        return next();
    }
};

router.post('/signup',validateSignup,async (req,res)=>{

    try{
        userExist=await User.exists({username:req.body.username})
        if(userExist){
            return res.status(411).json({
                message: "Email already taken"
            })
        }else{
            const user =await User.create(req.body);
            await Account.create({
                userId: user._id,
                balance:Math.ceil(Math.random()*10000)
            })
            const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    
            return res.status(200).json({
                message: "User created successfully",
                token: token
            })
        }
    }catch(error){
        console.error("Error occurred during existence check:", error);
        return res.status(500).json({
            message: "An error occurred during signup. Please try again later."
        });
    }

})

router.post('/signin',validateSignin, async (req,res)=>{
    try{
        user =await User.findOne({username:req.body.username})
        if(user){
            if(user.password==req.body.password){
                token = jwt.sign({userId:user._id},JWT_SECRET)
                return res.status(200).json({
                    token:token
                })
            }else{
                return res.status(411).json({
                    message:"Incorrect Passowrd"
                })
            }
        }else{
            return res.status(411).json({
                message:"User Does not Exist"
            })
        }
    }catch(error){
        return res.status(411).json({
            message:"Error While Logging in"
        }) 
    }
})

router.get('/bulk',authMiddleware,async (req,res)=>{
    const filter = req.query.filter || ""
    const users = await User.find({
        $or:[ {
            firstName:{
                "$regex":filter 
            }
        }, {
            lastName:{
                "$regex":filter 
            }
        } ]
    }).select("firstName lastName")
           
    if(users.length!=0){
        return res.status(200).json({
            users
        })
    }else{
        return res.status(411).json({
            message:"No users found"
        })
    }
})

router.put('/',authMiddleware, validateUserUpdate,async (req,res)=>{
    console.log(req.body)
    const user = await User.findByIdAndUpdate(req.headers.userId,req.body) //it returns not updated value
    console.log(user)
    if(user){
        return res.status(200).json({
            message:"Updated Successfully"
        })
    }else{
        return res.status(411).json({
            message:"Failed to update"
        })
    }
})

module.exports=router
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const config = require('../config');

const userSchema = new mongoose.Schema(
    {
        username:{
            type: String,
            required: true,
            min: 4, max: 25
        },
        password:{
            type: String,
            required: true,
            min: 8, max: 300
        },
        confirmPassword:{
            type: String, 
            required: true, 
            min: 8, max: 100
        },
        email:{
            type: String, 
            required: true, 
        },
        phoneNumber:{
            type: String, 
            required: true, 
            min:11, max:11
        },
        country: {
            type: String,
            required: true,
        },
        cart: [{
            type: mongoose.Types.ObjectId,
            ref: 'Product',
        }]
    },
    {
        timestamps: true
    }
);

userSchema.pre('save', async function (next) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(this.password, salt);
        this.password = hashed;
        const hashedCP = await bcrypt.hash(this.confirmPassword, salt);
        this.confirmPassword = hashedCP;
        next();
    } catch (error) {
        next(error);    //to the next checkauth
    }
});

userSchema.methods.genAuthToken = function () {
    return jwt.sign(this.toJSON(), config.SECRET_KEY);
};

const User = mongoose.model('User', userSchema)
module.exports = User
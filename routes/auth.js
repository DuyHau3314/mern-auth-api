const express = require('express');

const router = express.Router();

const {signup, activationAccount,signin, forgotPassword, resetPassword, googleLogin,facebookLogin}  = require('../controllers/auth');

const {validateSignup,validateSignin} = require('../validation/auth');
const {runValidation} = require('../validation/index');

router.post('/signup', validateSignup, runValidation, signup);
router.post('/activation-account', activationAccount);
router.post('/signin',validateSignin, runValidation,signin);
router.post('/forgot-password',forgotPassword);
router.post('/reset-password',resetPassword);

//GOOGLE - FACEBOOK 
router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);

module.exports =  router;
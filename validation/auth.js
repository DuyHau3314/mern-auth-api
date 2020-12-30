const {check} = require('express-validator');


exports.validateSignup = [
    check('email')
    .isEmail()
    .withMessage('Email is not a valid email address'),

    check('name')
    .not()
    .isEmpty()
    .withMessage('Name is required'),

    check('password')
    .isLength({min: 6})
    .withMessage('Password must be at least 6 characters long')
];

exports.validateSignin = [
    check('email')
    .isEmail()
    .withMessage('Email is not a valid email address'),

    check('password')
    .isLength({min: 6})
    .withMessage('Password must be at least 6 characters long')
];
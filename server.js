const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

//DATABASE
mongoose.connect(process.env.DATABASE, {
    useUnifiedTopology: true,
    useCreateIndex: true,
    useNewUrlParser: true
}).then(res => {
    console.log('CONNECTED DATABASE SUCCESSFULLY')
}).catch(error => {
    console.log('CONNECTED DATABASE FAILED');
});

///import router
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');

//app middleware
app.use(bodyParser.json());
app.use(morgan('dev'));
if(process.env.NODE_ENV !== 'production'){
    app.use(cors({ 
        origin: process.env.CLIENT_URL
    }));
}

//middleware
app.use('/api', authRouter, userRouter);


const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Server listening on ' + port);
});
const User = require("../models/user");
exports.read = (req, res) => {
  const id = req.params.id;
  console.log(req.user._id);
  if (id === req.user._id) {
    User.findById(req.user._id, (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User not found",
        });
      }
      user.salt = undefined;
      user.hashed_password = undefined;
      user.resetPasswordLink = undefined;
      return res.json(user);
    });
  }
};

exports.update = (req, res) => {
  const {name, password} = req.body;
  if(req.user._id) {
    User.findById(req.user._id, (err, user) => {
      if(err || !user){
        return res.status(400).json({
          error: 'User not found'
        });
      } 
      if(!name){
        return res.status(400).json({
          error: 'Name is required'
        });
      } 
      user.name = name;
      if(password){
        if(password.length < 6){
          return res.status(400).json({
            error: 'Password must be at least 6 characters long'
          })
        }
        user.password = password;
      }

      user.save((err, user)=> {
        if(err){
          return res.status(400).json({
            error: 'Update user failed'
          });
        }
        user.hashed_password = undefined;
        user.resetPasswordLink = undefined;
        user.salt = undefined;
    
        return res.json({
          message: 'Update user successfully',
          user
        });
      }); 
    });
  }else{
    return res.status(400).json({
      error: 'Please signin first'
    });
  }
};  

exports.adminMiddleware = (req, res, next) => {
  if(!req.user._id){
    return res.status(400).json({
      error: 'Please signin first'
    })
  }
  User.findById(req.user._id, (err, user) => {
    if(user.role !== 'admin'){
      return res.status(400).json({
        error: 'Admin Resource.. Access denied'
      })
    }
    next();
  });

};
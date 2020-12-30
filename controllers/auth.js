const User = require("../models/user");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const expressJwt = require("express-jwt");
const { OAuth2Client } = require("google-auth-library");
const fetch = require('node-fetch');


exports.signup = (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email }, (err, user) => {
    if (user) {
      return res.status(400).json({
        error: "Email is taken",
      });
    }

    const token = jwt.sign(
      { email, password, name },
      process.env.JWT_ACTIVATION_ACCOUNT,
      { expiresIn: "20m" }
    );
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account activation link`,
      html: `
                      <p>Please use the following link to activate your account</p>
                      <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
                      <hr />
                      <p>This email may contain sensitive information</p>
                      <p>${process.env.CLIENT_URL}</p>
                  `,
    };

    sgMail
      .send(emailData)
      .then((sent) => {
        console.log("SIGNUP EMAIL SENT", sent);
        return res.json({
          message: `Emaiwl has been sent to  ${email}. Follow the instruction to active your account`,
          name,
        });
      })
      .catch((err) => {
        console.log(err.response.body);
        return res.status(400).json({
          error: err.message,
        });
      });
  });
};

exports.activationAccount = (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({
      error: "Token is invalid",
    });
  }
  jwt.verify(token, process.env.JWT_ACTIVATION_ACCOUNT, (err, decoded) => {
    if (err) {
      return res.status(400).json({
        error: "Token is expired",
      });
    }

    const { email, name, password } = jwt.decode(token);
    const user = new User({ email, password, name });
    user.save((err, user) => {
      if (err) {
        return res.status(400).json({
          error: "Save user failed",
        });
      }
      return res.json({
        message: "Save user successfully... Please sign in!!!",
        name,
      });
    });
  });
};

exports.signin = (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    if (!user.authentication(password)) {
      return res.status(400).json({
        error: "Not match email or password",
      });
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    user.salt = undefined;
    user.hashed_password = undefined;
    user.resetPasswordLink = undefined;
    res.json({
      token,
      user,
    });
  });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256", "HS384", "HS512", "sha1"],
});

exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    const token = jwt.sign({ email }, process.env.JWT_RESET_PASSWORD, {
      expiresIn: "20m",
    });

    User.updateOne({ resetPasswordLink: token }, (err, user) => {
      if (err) {
        return res.status(400).json({
          error: "Cannot update reset password link",
        });
      }
      const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Reset password`,
        html: `
                        <p>Please use the following link to reset your password</p>
                        <p>${process.env.CLIENT_URL}/auth/reset-password/${token}</p>
                        <hr />
                        <p>This email may contain sensitive information</p>
                        <p>${process.env.CLIENT_URL}</p>
                    `,
      };

      sgMail
        .send(emailData)
        .then((sent) => {
          console.log("FORGOT PASSWORD EMAIL SENT", sent);
          return res.json({
            message: `Email has been sent to  ${email}. Follow the instruction to active your account`,
          });
        })
        .catch((err) => {
          console.log(err.response.body);
          return res.status(400).json({
            error: err.message,
          });
        });
    });
  });
};

exports.resetPassword = (req, res) => {
  const { newPassword, token } = req.body;
  if (!token) {
    return res.status(400).json({
      error: "Invalid token",
    });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters long",
    });
  }

  jwt.verify(token, process.env.JWT_RESET_PASSWORD, (err, decoded) => {
    if (err) {
      return res.status(400).json({
        error: "Token has expired",
      });
    }

    const { email } = jwt.decode(token);
    User.findOne({ email }, (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "User not found",
        });
      }
      user.password = newPassword;
      user.resetPasswordLink = "";
      user.save((err, user) => {
        if (err) {
          return res.status(400).json({
            error: "Save user failed",
          });
        }
        return res.json({
          message: "User saved successfully",
        });
      });
    });
  });
};

///GOOGLE- FACEBOOK
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
  const { idToken } = req.body;
  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    .then(response => {
      const {email_verified, email, name} = response.payload;
      if (email_verified) {
        User.findOne({ email }, (err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            const { _id, name, email, role } = user;
            return res.json({
              token,
              user: { _id, email, name, role },
            });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log("ERROR GOOGLE LOGIN IN USER SAVE", err);
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
              );
              const { _id, email, name, role } = data;
              return res.json({
                token,
                user: { _id, email, name, role },
              });
            });
          }
        });
      }else {
        return res.status(400).json({
          error: "Google login failed.. Try again!!",
        });
      }
    })
};

//FACEBOOK
exports.facebookLogin = (req, res) => {
  const {userID, accessToken} = req.body;
  const url = `https://graph.facebook.com/${userID}?fields=id,name,email&access_token=${accessToken}`;
  fetch(url, {method: 'GET'}).then(response => response.json()).then(response => {
    const {name, email} = response;
    User.findOne({email}, (err, user) => {
      if(user){
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: "7d"});
        const {_id, name, email, role} = user;
        return res.json({
          token, 
          user: { _id, email, name, role}
        });
      }else{
        const password = email + process.env.JWT_SECRET;
        user = new User({name, email, password});
        user.save((err, data) => {
          if(err) {
            console.log('ERROR FACEBOOK LOGIN ON USER SAVE', err);
            res.status(400).json({
              error: 'User signup failed with facebook',
            });
          }

          const token = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
          });
          const { _id, email, name, role } = data;
          return res.json({
            token,
            user: { _id, email, name, role },
          });

        });
      }
      
    }).catch(error => {
      res.status(400).json({
        error: 'Facebook login failed.. Try later'
      });
    })
  });
};
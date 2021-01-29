const express = require('express');
const app = express();
const router = express.Router()
const jwt = require('jsonwebtoken');
const {SECRET_KEY} = require('../config');
const User = require('../models/user');
const ExpressError = require('../expressError');

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
//  **/
router.post('/login', async(req, res, next) => {
    try {
        const { username, password } = req.body;
        if(await User.authenticate(username, password)) {
            await User.updateLoginTimestamp(username);
            let token = jwt.sign( {username}, SECRET_KEY);
            return res.json({token});
        } else {
            throw new ExpressError("Invalid username/password", 400)
        }      
    } catch (error) {
        return next(error)
    }
})


/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async(req, res, next) => {
    try {
        const {username} = await User.register(req.body);
        let token = jwt.sign({username}, SECRET_KEY);
        await User.updateLoginTimestamp(username);
        return res.json({token});
    } catch (error) {
        return next(error);
    }
})


module.exports = router


  
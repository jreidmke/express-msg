/** User class for message.ly */
const db = require("../db");
const ExpressError = require("../expressError");

const bcrypt = require("bcrypt");
const {BCRYPT_WORK_FACTOR} = require('../config');

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {
      const hashword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
      const result = await db.query(
        `INSERT INTO users
        (username, password, first_name, last_name, phone, join_at)
        VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING username, password, first_name, last_name, phone`, 
        [username, hashword, first_name, last_name, phone]
      );
      return result.rows[0];   
    } 
  
  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    try {
      const result = await db.query(
        `SELECT password FROM users WHERE username=$1`,
        [username]
      );
      const user = result.rows[0];
      if(user) {
        return await bcrypt.compare(password, user.password) ? true : false;
    } 
  } catch (error) {
    console.log(error)
    throw new ExpressError('User does not exist', 404);
  }
}


  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    await db.query(
      `UPDATE users
      SET last_login_at=CURRENT_TIMESTAMP
      WHERE username=$1`,
      [username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    try {
      const results = await db.query(
        `SELECT username, first_name, last_name, phone
        FROM users`
      );
      return results.rows;
    } catch (error) {
      console.log(error);
    }
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    try {
      const result = await db.query(
        `SELECT username, first_name, last_name, phone, join_at, last_login_at
        FROM users
        WHERE username=$1`,
        [username]
      );
      if(!result.rows[0]) {
        throw new ExpressError(`No such user, ${username}!`);
      }
      return result.rows[0];
    } catch (error) {
      console.log(error)
    }
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    try {
      const results = await db.query(
        `SELECT m.id, m.body, u.username, u.first_name, u.last_name, u.phone, m.sent_at, m.read_at
        FROM messages AS m
        JOIN users AS u
        ON m.to_username=u.username
        WHERE from_username=$1`,
        [username]
      )

      if(!results.rows) {
        throw new ExpressError(`No such user, ${username}!`);
      }

      return results.rows.map(m => ({
        id: m.id,
        to_user: {
          username: m.username,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone
        },
        body: m.body,
        sent_at: m.sent_at,
        read_at: m.read_at
      }));

    } catch (error) {
      console.log(error);
    }
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
        `SELECT m.id,
                m.from_username,
                u.first_name,
                u.last_name,
                u.phone,
                m.body,
                m.sent_at,
                m.read_at
          FROM messages AS m
           JOIN users AS u ON m.from_username = u.username
          WHERE to_username = $1`,
        [username]);

    return result.rows.map(m => ({
      id: m.id,
      from_user: {
        username: m.from_username,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone,
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at
    }));
  }
}


module.exports = User;

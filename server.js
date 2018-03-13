const express = require('express');
const path = require('path');
const webpack = require('webpack');
const app = express();
const databaseRoutes  = express.Router();
const webpackMiddleware = require("webpack-dev-middleware");
const morgan = require('morgan')
const webpackConfig = require('./webpack.config.js');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const bodyParser = require("body-parser");
const knex = require('knex')({
  client: 'pg',
  version: '7.2',
  connection: {
    // port: 5432,
    host : 'localhost',
    user : 'final',
    password : 'final',
    database : 'icebreaker'
  }
});


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


let fbid = "";
let fb_pic = "";
let acc_token = "";
let cookie_id = 0;

///////////FACEBOOK AUTHENTICATION//////////////////////////////


passport.use(new FacebookStrategy({
    clientID: "575115656176298",
    clientSecret: "4d3a4ba21f529ae6b035cc38f95fbeb6",
    callbackURL: "http://localhost:8080/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    knex.select().table('users').where({first_name: 'Baracko'})
    .then(function(user) {
      console.log("WOWOWWOWOWOWW", user);
      if(user.length < 1){
        done(null, console.log("need to register"));
        //Needs to save fbid as cookie, redirect to complete registration page on which it will then save to db and redirect to dashboard
      } else {
        cookie_id = user[0].id;
        done(null, user = user);
        //done(null, console.log(accessToken, profile.id));
        //Needs to set cookies and redirect to dashboard
      }
    });
  }
));
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(webpackMiddleware(
  webpack(webpackConfig),
  { publicPath: '/' }
));
app.use( passport.initialize());
app.use( passport.session());
app.use( bodyParser.json());
app.use( bodyParser.urlencoded({ extended: true }));

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile']}));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/jammin!!!',
                                      failureRedirect: '/signup' }));

app.get('/api/potentials', (req, res) => {
  const cookieid = 14
  console.log("potentials get for id ", cookieid)
   knex('users')
   .whereNotExists(knex.select('*').from('userlikes').where('userid1',  Number(cookie_id)))
   .whereNotExists(knex.select('*').from('userlikes').whereRaw('users.id = userlikes.userid2'))
   .whereExists(knex.select('*').from('filters').whereRaw('users.gender = filters.male'))
   .orWhereExists(knex.select('*').from('filters').whereRaw('users.gender = filters.female'))
   // .whereBetween(knex.select('*').from('filters').whereRaw('users.age', ['filters.min_age', 'filters.max_age']))
  .then((result) => {
      console.log("knex result", result)
      res.send(result)
        })
  .catch((err) => {
          console.log("error", err)
        })
      })


app.get('/api/matches', (req, res) => {
  const cookieid = cookie_id
  console.log("potentials get for id ", cookieid)
  knex('users').whereExists(knex.select('*').from('userlikes').where('userid1', 1))
  // .whereExists(knex.select('*').from('userlikes').whereRaw('users.id = userlikes.userid2'))
  // .whereExists(knex.select('*').from('userlikes').where('liked', true))
  .then((result) => {
      console.log("knex result", result)
      res.send(result)
        })
  .catch((err) => {
          console.log("error", err)

        })
      })


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
  req.session = {"id": cookie_id};
  console.log(req.session.id);
});

app.post('/signup', (req, res) => {

  if(req.session.id){
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    let age = Number(req.body.age);
    let gender = req.body.gender;
    let description = req.body.description;
    knex('users').where("id", Number(req.session.id)).update({first_name: first_name, last_name: last_name, age: age, gender: gender, description: description})
      .then(function (woo) {
          console.log("Woo!");
         });
    res.redirect('/matches');
  } else {
    let facebook_id = fbid;
    let facebook_picture_url = fb_pic;
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    let age = Number(req.body.age);
    let gender = req.body.gender;
    let description = req.body.description;
    let location = "45.490998036, -73.56833106";
    console.log(req.body);
    knex('users').insert({facebook_id: facebook_id, first_name: first_name, last_name: last_name, age: age, gender: gender, description: description, facebook_picture_url: facebook_picture_url, location: location})
      .returning('id')
      .then(function (id) {
          cookie_id = id;
         });
    res.redirect('/filters');
  }
});

app.post('/filters', (req, res) => {
  let userid = Number(cookie_id);
  let min_age = Number(req.body.min_age);
  let max_age = Number(req.body.max_age);
  let radius = Number(req.body.distance);
  let female = (req.body.female) ? true : false;
  let male = (req.body.male) ? true : false;
  let other = (req.body.other) ? true : false;

  knex('filters').insert({userid: userid, min_age: min_age, max_age: max_age, radius: radius, female: female, male: male, other: other})
    .then(function (woo) {
        console.log("WOO!");
       });

  req.session = {"id": cookie_id};
  res.redirect('/matches');
});

app.listen(8080, () => console.log('Server listening on 8080'));


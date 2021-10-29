/***********************
Load Components!
Express      - A Node.js Framework
Body-Parser  - A tool to help use parse the data in a post request
Pg-Promise   - A database tool to help use connect to our PostgreSQL database
***********************/
var express = require('express'); //Ensure our express framework has been added
var app = express();
var fetch = require('node-fetch');
const axios = require('axios');
var bodyParser = require('body-parser'); //Ensure our body-parser tool has been added
const { pool } = require("./dbConfig");
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require("passport");
const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 3000;

//Create Database Connection
var pgp = require('pg-promise')();

/**********************
  Database Connection information
  host: This defines the ip address of the server hosting our database.
        We'll be using `db` as this is the name of the postgres container in our
        docker-compose.yml file. Docker will translate this into the actual ip of the
        container for us (i.e. can't be access via the Internet).
  port: This defines what port we can expect to communicate to our database.  We'll use 5432 to talk with PostgreSQL
  database: This is the name of our specific database.  From our previous lab,
        we created the football_db database, which holds our football data tables
  user: This should be left as postgres, the default user account created when PostgreSQL was installed
  password: This the password for accessing the database. We set this in the
        docker-compose.yml for now, usually that'd be in a seperate file so you're not pushing your credentials to GitHub :).
**********************/
const dev_dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user:  process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
};

/** If we're running in production mode (on heroku), the we use DATABASE_URL
 * to connect to Heroku Postgres.
 */
const isProduction = process.env.NODE_ENV === 'production';
const dbConfig = isProduction ? process.env.DATABASE_URL : dev_dbConfig;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Heroku Postgres patch for v10
// fixes: https://github.com/vitaly-t/pg-promise/issues/711
if (isProduction) {
  pgp.pg.defaults.ssl = {rejectUnauthorized: false};
}

const db = pgp(dbConfig);

app.set('view engine', "ejs");
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(__dirname + '/'));

app.use(session({
    secret: 'passwordyouwillneverguesslol',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

function json(url) {
  return fetch(url).then(res => res.json());
}

// Google api related variables
const apiKey = '08d40370c7de416b79aaeab3b1eec4d88a555806cbae7552e56ab497';
const googKey = 'AIzaSyBUeImM3xqVjnjbPTrkx6qeUmpaqcid8Ws';
let finalPlaceId = ''; // This stores the placeId the user selects on restaurants page, for further use on movies and itinerary
let userIp = '';
let restaurant_name = '';

// MovieGlu api related variables

// Production Values
// var movieGlu_authorization = "Basic TlJITDpicjVKZ0xwY3p3TzY=";
// var movieGlu_x_api_key = "i8LDBlpqi1asf6A0ff0pp6zeq8bnEqCK6vMMNj9S";
// var movieGlu_territory = "US";
// var movieGlu_geolocation = "40.0150;-105.2705";

// Test Values
var movieGlu_authorization = "Basic TlJITF9YWDpLZTNhRHNubkFuc3E=";
var movieGlu_x_api_key = "XNsRQ3tR2f2175UJg7CpKalmFhnrprDq8bBoDqPZ";
var movieGlu_territory = "XX";
var movieGlu_geolocation = "-22.0;14.0";

  let date = new Date();
  let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
  let mo = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(date);
  let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
  console.log(`${ye}-${mo}-${da}`);

var movieGlu_device_datetime = `${ye}-${mo}-${da}` + "T18:00:29.544Z";
var movieGlu_device_date = `${ye}-${mo}-${da}`;
var cinema_id;
var cinema_name;
var movie_name;
var theater_coords_lat;
var theater_coords_lng;
var theater_address;
var theater_city;
var theater_state;

//API call to get users IP, if hosted locally, requires node-fetch module
json(`https://api.ipdata.co?api-key=${apiKey}`).then(data => {
    userIp = data.ip;
});

app.get('/', checkAuthenticated, (req, res) => {
  console.log("here");

  pool.query(
      `SELECT * FROM user_info
    WHERE email = $1`, ["x"], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
      }
  );
    res.render("pages/home");


});

app.get('/signup', checkAuthenticated, (req, res) => {
    res.render("pages/signup");
});

app.get('/login', checkAuthenticated, (req, res) => {
    res.render("pages/login");
});

app.get('/food-preferences', checkNotAuthenticated, (req, res) => {
// app.get('/food-preferences', (req, res) => {
  // fix from: https://lostechies.com/derickbailey/2013/12/04/getting-the-real-client-ip-address-on-a-heroku-hosted-nodejs-app/
  var ipAddr = req.headers["x-forwarded-for"]; // if used on heroku, this grabs users ip from heroku ip forwarding
  if (ipAddr){
      var list = ipAddr.split(",");
      ipAddr = list[list.length-1];
      userIp = ipAddr;
  }
  res.render('pages/food-preferences', {
      my_title: 'Cuisine Preferences',
      error: false
  });
    user_email = req.user.email;
});

app.get('/logout', (req, res) => {
    req.logOut();
    req.flash('success_msg', "You have logged out");
    res.redirect('/login');
});

app.post('/register', async(req, res) => {
    let { name, email, password, password2 } = req.body;

    console.log({
        name,
        email,
        password,
        password2
    });

    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please fill out all fields" });
    }

    if (password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters" });
    }

    if (password != password2) {
        errors.push({ message: "Passwords don't match" });
    }

    if (errors.length > 0) {
        res.render("pages/signup", { errors });
    } else {
        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);

        pool.query(
            `SELECT * FROM user_info
          WHERE email = $1`, [email], (err, results) => {
                if (err) {
                    console.log(err);
                    throw err;
                }

                if (results.rows.length > 0) {
                    errors.push({ message: "User already registered, please Log in" });
                    res.render('pages/signup', { errors });
                } else {
                    pool.query(
                        `INSERT INTO user_info (name, email, password)
                      VALUES ($1, $2, $3)
                      RETURNING id, password`, [name, email, hashedPassword], (err, results) => {
                            if (err) {
                                throw err;
                            }
                            req.flash('success_msg', "You are now registered. Please log in");
                            res.redirect("/login");
                        }
                    );
                }
            }
        );
    }
});

app.post("/login", passport.authenticate('local', {
    successRedirect: "/food-preferences",
    failureRedirect: "/login",
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/food-preferences');
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect('/login');
}

// Sends restaurant prefs to the restaurants page, which uses it to populate restaurants
app.post('/restaurants', function(req, res){
  let keysArr = [];
  let data = req.body.data;
  let error = true;
  for (let key in data){ // this loop sums # of preferences
      if (data[key].length === 1){ // if statement to detect if only 1 pref selected
          error = false;
          break;
      }
      keysArr.push(data[key]);
  }
  if ((keysArr.length <= 3 && keysArr.length > 0) || !error){ // If not right # of prefs, reloads page and prints error
      axios({ // This API provides the lat and long of the users IP
          url: `https://freegeoip.app/json/${userIp}`,
            method: 'GET',
          })
      .then(items => {
          let cuisineArr = ['', '', ''];
          if (!error){
              cuisineArr[0] = data;
          } else {
              for (let i = 0; i < keysArr.length; i++){
                  cuisineArr[i] = keysArr[i];			
              }
              pool.query(
                `UPDATE user_info
                 SET restaurant_preferences = $1
                 WHERE email = $2`, [cuisineArr, user_email], (err, results) => {
                      if (err) {}
                 }
             );
          }
          axios({ // This API returns restaurant data from google
              url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?type=restaurant&radius=8000&keyword=${cuisineArr[0]}|${cuisineArr[1]}|${cuisineArr[2]}&location=${items.data.latitude},${items.data.longitude}&key=${googKey}`,
              method: 'GET',
          })
          .then(locations => {
              let locationsArr = locations.data.results;
              //console.log(locationsArr);
              if (locationsArr.length > 0){ // Checks if there are results, continues if so
                  locationsArr.sort((a, b) => { // sorts the restaurants by rating in descending order
                      return b.rating - a.rating;
                  });
                  let size = locationsArr.length;
                  let restaurants = [];
                  let place_id;
                  place_id = locationsArr[0].place_id;
                  axios({ // This API returns specfic data about each of the top rated 6 restaurants
                      url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=place_id,formatted_address,formatted_phone_number,name,website,opening_hours,rating,price_level&key=${googKey}`,
                      method: 'GET',
                  })
                  .then(place1 => {
                      restaurants.push(place1.data.result);
                      size--;
                      if (size){
                          place_id = locationsArr[1].place_id;
                          axios({ // This API returns specfic data about each of the top rated 6 restaurants
                              url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=place_id,formatted_address,formatted_phone_number,name,website,opening_hours,rating,price_level&key=${googKey}`,
                              method: 'GET',
                          })
                          .then(place2 => {
                              restaurants.push(place2.data.result);
                              size--;
                              if (size){
                                  place_id = locationsArr[2].place_id;
                                  axios({ // This API returns specfic data about each of the top rated 6 restaurants
                                      url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=place_id,formatted_address,formatted_phone_number,name,website,opening_hours,rating,price_level&key=${googKey}`,
                                      method: 'GET',
                                  })
                                  .then(place3 => {
                                      restaurants.push(place3.data.result);
                                      size--;
                                      if (size){
                                          place_id = locationsArr[3].place_id;
                                          axios({ // This API returns specfic data about each of the top rated 6 restaurants
                                              url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=place_id,formatted_address,formatted_phone_number,name,website,opening_hours,rating,price_level&key=${googKey}`,
                                              method: 'GET',
                                          })
                                          .then(place4 => {
                                              restaurants.push(place4.data.result);
                                              size--;
                                              if (size){
                                                  place_id = locationsArr[4].place_id;
                                                  axios({ // This API returns specfic data about each of the top rated 6 restaurants
                                                      url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=place_id,formatted_address,formatted_phone_number,name,website,opening_hours,rating,price_level&key=${googKey}`,
                                                      method: 'GET',
                                                  })
                                                  .then(place5 => {
                                                      restaurants.push(place5.data.result);
                                                      size--;
                                                      if (size){
                                                          place_id = locationsArr[5].place_id;
                                                          axios({ // This API returns specfic data about each of the top rated 6 restaurants
                                                              url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=place_id,formatted_address,formatted_phone_number,name,website,opening_hours,rating,price_level&key=${googKey}`,
                                                              method: 'GET',
                                                          })
                                                          .then(place6 => {
                                                              restaurants.push(place6.data.result);
                                                              console.log(restaurants);
                                                              res.render('pages/restaurants', {
                                                                  my_title: "Restaurants",
                                                                  data: restaurants,
                                                                  error: false
                                                                })
                                                          });
                                                      } else {
                                                          res.render('pages/restaurants', {
                                                              my_title: "Restaurants",
                                                              data: restaurants,
                                                              error: false
                                                            })
                                                      }
                                                  });
                                              } else {
                                                  res.render('pages/restaurants', {
                                                      my_title: "Restaurants",
                                                      data: restaurants,
                                                      error: false
                                                    })
                                              }
                                          });
                                      } else {
                                          res.render('pages/restaurants', {
                                          my_title: "Restaurants",
                                          data: restaurants,
                                          error: false
                                        })
                                      }
                                  });
                              } else {
                                  res.render('pages/restaurants', {
                                      my_title: "Restaurants",
                                      data: restaurants,
                                      error: false
                                    })
                              }
                          });
                      } else {
                          res.render('pages/restaurants', {
                              my_title: "Restaurants",
                              data: restaurants,
                              error: false
                            })
                      }
                  });
              } else { // If no results
                  res.render('pages/food-preferences', {
                      my_title: "Cuisine Preferences",
                      error: true,
                      message: "Error: No restaurants found with the parameters you specified"
                  });
              }
          });
      });
  } else { // re-renders page if not # of prefs selected, wack cuz the path is still /restaurants
      res.render('pages/food-preferences',{
          my_title: 'Cuisine Preferences',
          error: true,
          message: "Error: Please select between 1 and 3 cuisine choices"
      })
  };
});

app.post('/movie-preferences', (req, res) =>{
  finalPlaceId = req.body.rest_id;
  res.render('pages/movie-preferences', {
      my_title: "Movie Preferences",
      place_id: finalPlaceId,
      error: false
  });
});

app.post('/movies', (req, res) => {
  let keysArr = [];
  let data = req.body.data;
  let error = true;
  for (let key in data){ // this loop sums # of preferences
      if (data[key].length === 1){ // janky if statement to detect if only 1 pref selected
          error = false;
          break;
      }
      keysArr.push(key);
  }
  if ((keysArr.length <= 3 && keysArr.length > 0) || !error){
      pool.query(
              `UPDATE user_info
            SET movie_preferences = $1
            WHERE email = $2`, [req.body.data, user_email], (err, results) => {
                  if (err) {}
              }
          );

      var movies = [];
      
      var cinemas_nearby_settings = {
          "url": "https://api-gate2.movieglu.com/cinemasNearby/?n=1",
          "method": "GET",
          "timeout": 0,
          "headers": {
              "api-version": "v200",
              "Authorization": movieGlu_authorization,
              "client": "NRHL",
              "x-api-key": movieGlu_x_api_key,
              "device-datetime": movieGlu_device_datetime,
              "territory": movieGlu_territory,
              "geolocation": movieGlu_geolocation,
          },
      };
      
      console.log("1");
      axios(cinemas_nearby_settings)
          .then(function(response) {
              cinema_id = response.data.cinemas[0].cinema_id;
              cinema_name = response.data.cinemas[0].cinema_name;
              theater_coords_lat = response.data.cinemas[0].lat;
              theater_coords_lng = response.data.cinemas[0].lng;
              movie_name = cinema_name;

              theater_address = response.data.cinemas[0].address;
            //   theater_city = response.data.cinemas[0].county;
            //   theater_state = response.data.cinemas[0].state;

              console.log("Lat: " + theater_coords_lat);
              console.log("Lng: " + theater_coords_lng);
      
              console.log("Cinema Name: " + cinema_name);
              console.log("Cinema ID: " + cinema_id);
      
              console.log("\n");
      
              var cinema_show_times_settings = {
                  "url": `https://api-gate2.movieglu.com/cinemaShowTimes/?cinema_id=${cinema_id}&date=${movieGlu_device_date}`,
                  "method": "GET",
                  "timeout": 0,
                  "headers": {
                      "api-version": "v200",
                      "Authorization": movieGlu_authorization,
                      "client": "NRHL",
                      "x-api-key": movieGlu_x_api_key,
                      "device-datetime": movieGlu_device_datetime,
                      "territory": movieGlu_territory,
                  },
              };
      
              console.log("2");
              axios(cinema_show_times_settings)
                  .then(function(response2) {
                      const films_showing_arr_length = response2.data.films.length;
                          
                      for (var i = 0; i < films_showing_arr_length; i++) {
                          var film_name = response2.data.films[i].film_name;
                          var film_id = response2.data.films[i].film_id;
      
                          var film_showtimes_arr = [];
                          var film_showtimes = response2.data.films[i].showings.Standard.times;
      
                          for (var j = 0; j < film_showtimes.length; j++) {
                              film_showtimes_arr.push(film_showtimes[j].start_time);
                          }
      
                          var movie_info = {
                              film_id: film_id,
                              film_name: film_name,
                              film_showtimes: film_showtimes_arr,
                              film_genre: "blank"
                          };
      
                          movies.push(movie_info);
      
                          var film_detail_settings = {
                              "url": `https://api-gate2.movieglu.com/filmDetails/?film_id=${film_id}&size_category=Small`,
                              "method": "GET",
                              "timeout": 0,
                              "headers": {
                                  "api-version": "v200",
                                  "Authorization": movieGlu_authorization,
                                  "client": "NRHL",
                                  "x-api-key": movieGlu_x_api_key,
                                  "device-datetime": movieGlu_device_datetime,
                                  "territory": movieGlu_territory,
                              },
                          };
      
                          console.log("3");
                          axios(film_detail_settings)
                              .then(function(response3) {
                                  for (var i=0; i<movies.length; i++) {
                                      if(movies[i].film_id == response3.data.film_id){
                                          movies[i].film_genre = response3.data.genres[0].genre_name;
                                      }
                                  }
                              })
                              .catch(error => {
                                  console.log(error);
                                  res.render('pages/movie-preferences',{
                                      my_title: 'Movie Preferences',
                                      place_id: finalPlaceId,
                                      error: true,
                                      message: "Error: API call error. Please try again later."
                                  })
                              });
                      }
      
                      console.log("****** rendering now ******")
      
                      // Render Page
                      res.render('pages/movies', {
                          my_title: "Movies",
                          data: movies,
                          cinema_name: cinema_name,
                          place_id: finalPlaceId,
                          error: false,
                      })
                  })
                  .catch(error => {
                      console.log(error);
                      res.render('pages/movie-preferences',{
                          my_title: 'Movie Preferences',
                          place_id: finalPlaceId,
                          error: true,
                          message: "Error: API call error. Please try again later."
                      })
                  });
          })
          .catch(error => {
              console.log(error);
            res.render('pages/movie-preferences',{
                my_title: 'Movie Preferences',
                place_id: finalPlaceId,
                error: true,
                message: "Error: API call error. Please try again later."
            })
          });   
  } else { // re-renders page if not # of prefs selected
      res.render('pages/movie-preferences',{
          my_title: 'Movie Preferences',
          place_id: finalPlaceId,
          error: true,
          message: "Error: Please select between 1 and 3 movie choices"
      })
  };
});

app.post('/itinerary', (req, res) => {
    console.log(finalPlaceId);
    console.log("Theater Address: " + theater_address);

    var theater_coords = `${theater_coords_lat},${theater_coords_lng}`;

    axios({ // Grabs place details from the restaurant selected in the restaurants page
        url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${finalPlaceId}&fields=place_id,formatted_address,formatted_phone_number,geometry,url,name,website,opening_hours,rating&key=${googKey}`,
        method: 'GET',
    })
    .then(restaurant => {
        let data = restaurant.data.result;
        let hoursArr = data.opening_hours.weekday_text;
        day = new Date();
        let hours;
        if (hoursArr.length > 0){
            hours = hoursArr[day.getDate() % 6];
        } else {
            hours = "No data available";
        }
        restaurant_name = data.name;
        
        let restaurant_address = data.formatted_address;

        console.log("Rest address: " + restaurant_address);

        res.render('pages/itinerary', {
            data: data,
            restaurant_name: restaurant_name,
            movie_name: movie_name,
            open_hours: hours,
            restaurant_coords: restaurant_address,
            theater_coords: theater_address,
            my_title: "Itinerary"
        });
    });
  });


// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

//app.listen(3000);
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Express running → PORT ${server.address().port}`);
});

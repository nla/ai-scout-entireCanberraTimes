
const path = require('path') ;

const https = require("https") ;
const fs = require("fs") ;

const express = require('express') ;
const helmet = require('helmet') ;
const bodyParser = require('body-parser') ;
const cookieParser = require('cookie-parser') ;
const httpErrors = require('http-errors') ;
const axios = require('axios') ;
const morgan = require('morgan') ;
const log4js = require('log4js') ;
const rfs = require('rotating-file-stream') ;

require('dotenv').config() ;                            // reads .env, sets up process.ENV props

const app = express() ;
app.use(helmet()) ;
app.use(bodyParser.json({limit: '1mb'})) ;
app.use(bodyParser.urlencoded({limit: '1mb', extended: true, parameterLimit:50000})) ;
app.use(cookieParser()) ;


//  -----  logging  -----

const morganLogStream = rfs.createStream("access.log", {		// morgan output file
	interval: "1d", 						// new log each day
	compress: true,             // was "gzip",  but it did nothing...
	path: path.join(__dirname, "logs")
}) ;

app.use(morgan("combined", { stream: morganLogStream })) ;

log4js.configure({
	appenders: {
		everything: {
			type: 'dateFile',
			filename: path.join(__dirname, "logs", "output.log"),
			compress: true
		}
	},
	categories: {
		default: {
			appenders: ['everything'],
			level: 'warn'
		}
	}
}) ;


const log = log4js.getLogger() ;

//  -----  util setup  -----

const util = require('./util/utils') ;
util.init() ;
//  -----  solr setup  -----

const solr = require('./util/solr') ;
solr.init() ;

//  ----- config object passed to routers  -----

const appConfig = {
	port: process.env.PORT,
	urlPrefix: process.env.URL_PREFIX,
	solr: solr,
	util: util,
	embeddingURL: process.env.EMBEDDING_URL,
	summaryURL: process.env.SUMMARY_URL,
	inferenceEngine: process.env.INFERENCE_ENGINE,
	modelName: process.env.MODEL_NAME
} ;

console.log("appConfig initialised as " + JSON.stringify(appConfig)) ;

//  -----  static requests handled by express from /static  -----

app.use(appConfig.urlPrefix + '/static', express.static(path.join(__dirname, 'static'))) ;

//  -----  ejs config  -----
  
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//  ----- general routes

app.use(appConfig.urlPrefix + '/',        require('./routes/home')		.init(appConfig)) ;
app.use(appConfig.urlPrefix + '/search',  require('./routes/search')	.init(appConfig)) ;


//  -----  errors  -----

app.use(function(req, res, next) {                              // forward 404 to error handler
  next(httpErrors(404)) ;
});

app.use(function(err, req, res, next) {                 // error handler
  // set locals, only providing error in development
  res.locals.message = err.message ;
  res.locals.errStatus = err.status ;
  res.locals.error = req.app.get('env') === 'dev' ? err : {};

  log.info("Error " + err.status + " / " + err.message + " req: " +req.url + " params: " + JSON.stringify(req.params)) ;
  res.status(err.status || 500) ;
  res.render('error', {req: req}) ;
});

// app.get('/', (req, res) => {
//  res.send('Hello Clove!')
// })


log.info("url prefix:    " + appConfig.urlPrefix) ;
log.info("About to start server...") ;


//  -----  start server  -----

https
  .createServer( {
		key: fs.readFileSync("key.pem"),
		cert: fs.readFileSync("cert.pem"),
	},
	app)
  .listen(appConfig.port, ()=>{
    console.log(`server is running at port ${appConfig.port} with key/cert`) ;
  });


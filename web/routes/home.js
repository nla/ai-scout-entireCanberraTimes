const express = require('express') ;
const router = express.Router() ;
const log = require('log4js').getLogger('home') ;
const util = require('../util/utils') ;

let appConfig = null ;
        
function init(appConfigParm) {

  appConfig = appConfigParm ;
  router.get('/',		    async (req, res) => { index(req, res) }) ;
  return router ;  
}

async function index(req, res) {

  let stxt = '' ;
  let keywordScaling = 0.85 ;
  if (req.query) {
    if (req.query.stxt) stxt = req.query.stxt ;
    if (req.query.keywordScaling) keywordScaling = req.query.keywordScaling ;
  }
  res.render('home', {req: req, appConfig: appConfig, stxt: stxt, keywordScaling: keywordScaling}) ;
}

module.exports.init = init ;
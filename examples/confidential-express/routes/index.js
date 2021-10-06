var express = require('express');
var router = express.Router();
const keycloak = require('../app');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { secret: 'Unauthenticated' });
});

module.exports = router;

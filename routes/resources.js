var express = require('express')
var router = express.Router()
var cors = require('cors')
var fs = require('fs')
var path = require('path')

var whiteList = ['localhost:3000', 'cdn.ampproject.org', 'www.bing-amp.com']
var corsOptions = {
    origin: function(origin, callback) {
        if(whiteList.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

router.use(cors(corsOptions))

router.get('/', function(req, res, next) {
    let data = JSON.parse(fs.readFileSync(path.join(__dirname, '../patches', 'data.json'), 'utf8'))
    res.json(data)
})

module.exports = router
const debug = require('debug')('scraper')
const axios = require('axios')
const cheerio = require('cheerio')

// env vars
const chromeW_Ua = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
axios.defaults.baseUrl = "https://br.leagueoflegends.com/pt-br/news/game-updates/"
axios.defaults.headers.commons['User-Agent'] = chromeW_Ua
debug('Axios user-agent spoofing: ' + axios.defaults.headers.commons['User-Agent'])




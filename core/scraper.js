// const axios = require('axios')
// const cheerio = require('cheerio')
const pupp = require('puppeteer')
const fs = require('fs')

const baseURL = 'https://br.leagueoflegends.com/pt-br/news/game-updates'
// const chromeW_Ua = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
var ATTS = []
// env vars
// axios.defaults.baseURL = baseURL
// axios.defaults.headers.common['User-Agent'] = chromeW_Ua

// page structure
// const CONTENT = "[class*='Body']";
// const BODYCONTAINER = "#___gatsby";
const LOAD = "[class*='LoadMoreButton']"

;(async () => {
	const brow = await pupp.launch({ headless: false })
	const [pagina] = await brow.pages()
	await pagina.goto(baseURL, { timeout: 90000 })
	try {
		await pagina.$eval('body', (body) => {
			// formata body
			let content = body.querySelector("[class*='Body']")
			body.appendChild(content)
			body.querySelector('#___gatsby').remove()

			// abre atualizacoes
			body.querySelector('ol').querySelector('li:nth-child(2) button').click()
		})
		await pagina.waitFor(10000)

		ATTS = ATTS.concat(
			await pagina.$$eval('a', (atts) =>
				atts.map((att) => {
					let prev = {
						uri: att.href,
						img: att.querySelector('img').src,
						titulo: att.querySelector('h2').innerText,
						autor: att.querySelector("[class*='Author']").innerText,
						data: att.querySelector('time').dateTime,
					}
					att.remove()
					return prev
				})
			)
		)

		await pagina.click(LOAD)
		await pagina.waitForSelector('a')

		ATTS = ATTS.concat(
			await pagina.$$eval('a', (atts) =>
				atts.map((att) => {
					let prev = {
						uri: att.href,
						img: att.querySelector('img').src,
						titulo: att.querySelector('h2').innerText,
						autor: att.querySelector("[class*='Author']").innerText,
						data: att.querySelector('time').dateTime,
					}
					// att.remove()
					return prev
				})
			)
		)
	} catch (error) {
		brow.close()
		console.error(error)
	} finally {
		console.log(ATTS)
	}
})()

// axios.get('', {transformResponse: axios.defaults.transformResponse.concat(function(data, headers) {
//     let body = cheerio.load(data);
//     body = body('[class^="style__Body"]').html()
//     // last patches notes
//     return body
// })})
//     .then(res => {
//         let $ = cheerio.load(res.data);
//     })
//     .catch(console.error)

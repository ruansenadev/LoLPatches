// const axios = require('axios')
// const cheerio = require('cheerio')
const pupp = require('puppeteer')
const fs = require('fs')

const baseURL = 'https://br.leagueoflegends.com/pt-br/news/game-updates'
// const chromeW_Ua = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
// env vars
// axios.defaults.baseURL = baseURL
// axios.defaults.headers.common['User-Agent'] = chromeW_Ua

// path para salvar json
const localPatches = './patches.json'

// page structure
// const CONTENT = "[class*='Body']";
// const BODYCONTAINER = "#___gatsby";
const LOAD = "[class*='LoadMoreButton']"

var localATTS = []
var lastATT
var ATTS
if (fs.existsSync(localPatches)) {
	localATTS = JSON.parse(fs.readFileSync(localPatches, 'utf-8'))
	lastATT = localATTS[0]
}

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

		async function fetcher() {
			// tempo para req ajax
			await pagina.waitFor(5000)

			let agg = await pagina.$$eval('a', (atts) =>
				atts.map((att) => {
					let autor = att.querySelector("[class*='Author']")
					let prev = {
						uri: att.href,
						img: att.querySelector('img').src,
						titulo: att.querySelector('h2').innerText,
						autor: autor ? autor.innerText : '',
						data: att.querySelector('time').dateTime,
					}
					att.remove()
					return prev
				})
			)
			if (lastATT) {
				for (let i = 0; i < agg.length; i++) {
					if (agg[i].data === lastATT.data) {
						agg = agg.slice(0, i)
						break
						// encontrou ultima att entao divide ate antes dela e retorna
					}
				}
				return agg
			}
			if ((await pagina.$(LOAD)) == null) {
				// se chegou no fim e sua queue não estourou parabains o.o
				return agg
			} else {
				await pagina.click(LOAD)
				await pagina.waitForSelector('a')
				// concatena com retorno da nova chamada de fetcher
				return agg.concat(await fetcher())
			}
		}

		ATTS = await fetcher()
	} catch (error) {
		brow.close()
		console.error(error)
	} finally {
		if (ATTS.length) {
			console.log(ATTS.length + ' novos patches')
			ATTS = ATTS.concat(localATTS)
			lastATT = ATTS[0]
			fs.writeFile(
				localPatches,
				JSON.stringify(ATTS, null, 2),
				'utf-8',
				(e) => {
					if (e) {
						console.error(e)
						console.log('Falha ao tentar escrever novos patches :|')
					} else {
						console.log(`Atualizado patches em ${localPatches} com sucesso ^-^`)
					}
				}
			)
		} else {
			console.log('Aparentemente você já tem todos patches salvos, nice!')
		}
		console.log(
			`\n Data do último patch: ${new Date(lastATT.data).toLocaleDateString()}`
		)
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

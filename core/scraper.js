const axios = require('axios')
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')

const attURL =
	'https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-9-19/'

axios.defaults.headers.common['User-Agent'] =
	'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'
const d = new Date()

const errorsDir = 'erros'
const patchesDir = 'patches'
var folder
var SCRAP = {
	champs: [],
	runes: []
}

function createLog(e, frag = '') {
	fs.mkdir(path.join(patchesDir, errorsDir), {recursive: true}, (err) => {
		if(err) throw err;
		let logFile = d.toLocaleDateString().replace(/\//g, '_').concat('_scrap_log.txt')
		fs.appendFile(path.join(patchesDir, errorsDir, logFile), `(${new Date().toLocaleTimeString()}): \r\n${attURL}${frag?" - "+frag:""}\r\n${e}\r\n🔚🔚🔚🔚\r\n`, 'utf8', (err) => {
			if(err) throw err;
			console.log('Erro :T\tlog do erro: ' + path.join(patchesDir, errorsDir, logFile))
		})
	})
}

axios
	.get(attURL, {
		transformResponse: axios.defaults.transformResponse.concat(function (
			data,
			headers
		) {
			let page = cheerio.load(data)
			// create path for scrap data
			let title = page('h1').text()
			folder = title.replace(/\s(?=\d)/, "").replace(/\s/g, "_").toLowerCase()
			if(/\d{3}/.test(folder)) {
				folder = errorsDir
				throw new Error(title)
			}
			fs.mkdir(patchesDir, {recursive: true}, (err) => {
				if(err) throw err;
				fs.mkdirSync(path.join(patchesDir, folder), {recursive: true})
			})
			// slice page content
			page = page('#patch-notes-container').html()
			return page
		})
	})
	.then((res) => {
		const $ = cheerio.load(res.data)

		// --Champions--
		let patchFeatured = $('h3[id^="patch-"]')
		// filter by patch id with only a followed name that's the champ
		const champions = patchFeatured.toArray().filter((cEl) => $(cEl).attr('id').indexOf('-') == $(cEl).attr('id').lastIndexOf('-'))
		console.log($(champions).length + ' Champions')
		// format data for each note
		champions.reduce((champs, champ, i) => {
			try {
				champs.push({
					campeao: $(champ).text(),
					img: $(champ).siblings('a').children('img').attr('src'),
					mod: $(champ).siblings('p').text(),
					nota: $(champ).siblings('blockquote').text().trim()
				})
			} catch (error) {
				throw createLog(error, "Champion introduce scraping")
			}
			
			let changes
			try {
				changes = $(champ).siblings('h4').map((i, title) => {
					let attrs = $(title).nextUntil('div+:not(div)').map((i, atr) => {
						return {
							atributo: $(atr).children(':first-child').text(),
							antes: $(atr).children(':nth-child(2)').text(),
							depois: $(atr).children(':last-child').text()
						}
					}).toArray()
					attrs.forEach(a => {
						let rotulo = /[a-z]{2,}/.exec(a.atributo)
						if(rotulo) {
							a.atributo = a.atributo.split(rotulo[0])[1]
							a.rotulo = rotulo[0]
						}
					})
					let img = $(title).children('img').attr('src')
					let habilidade = {nome: $(title).text(), img, alteracoes: attrs}

					return habilidade
				}).toArray()
			} catch (error) {
				throw createLog(error, 'Champion skills scraping')
			}

			champs[i].habilidades = changes
			return champs
		}, SCRAP.champs)

		// --Runas--
		patchFeatured = $("[id*='runes']").parent()
		// select runes block wrapper
		const runes = patchFeatured.nextUntil('div+:not(div)').map((i, cEl) => {
			return $('h3', cEl).parent()
		}).toArray()
		console.log(runes.length + ' Runas')
		runes.reduce((runs, run, i) => {
			try {
				runs.push({
					runa: $('h3', run).text(),
					img: $('a > img', run).attr('src'),
					mod: $('p', run).text(),
					nota: $('blockquote', run).text().trim()
				})
			} catch (error) {
				throw createLog(error, "Rune introduce scraping")
			}
			
			let changes
			try {
				changes = $('div', run).map((i, chng) => {
					return {
						atributo: $(chng).children(':first-child').text(),
						antes: $(chng).children(':nth-child(2)').text(),
						depois: $(chng).children(':last-child').text()
					}
				}).toArray()
			} catch (error) {
				throw createLog(error, "Rune attributes scraping")
			}
			runs[i].alteracoes = changes
			return runs
		}, SCRAP.runes)
	})
	.then(() => {
		fs.writeFile(path.join(patchesDir, folder, 'data.json'), JSON.stringify(SCRAP, null, 2), (err) => {
			if(err) {throw createLog(err, 'Writting data')}
			console.log(`Writed data at path: ${path.join(patchesDir, folder, "data.json")}`)
		})
	})
	.catch(e => {
		if(e) createLog(e)
	})

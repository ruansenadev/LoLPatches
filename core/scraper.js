const axios = require('axios')
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')

const attURL =
	'https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-9-1/'

axios.defaults.headers.common['User-Agent'] =
	'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'

var patchesDir = 'patches'
var folder
var SCRAP = {
	champs: []
}

axios
	.get(attURL, {
		transformResponse: axios.defaults.transformResponse.concat(function (
			data,
			headers
		) {
			let page = cheerio.load(data)
			// create path for patch data
			let title = page('h1').text()
			folder = title.replace(/\s(?=\d)/, "").replace(/\s/g, "_").toLowerCase()
			fs.mkdir(patchesDir, {recursive: true}, (err) => {
				if(err) console.error(err)
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
			champs.push({
				campeao: $(champ).text(),
				img: $(champ).siblings('a').children('img').attr('src'),
				mod: $(champ).siblings('.summary').text(),
				nota: $(champ).siblings('blockquote').text().trim()
			})
			let changes = $(champ).siblings('h4').map((i, title) => {
				let attrs = $(title).nextUntil('h4,hr').map((i, atr) => {
					return {
						atributo: $(atr).children(':first-child').text(),
						antes: $(atr).children(':nth-child(2)').text(),
						depois: $(atr).children(':last-child').text()
					}
				}).toArray()
				attrs.forEach(a => {
					let rotulo = /novo|new|removido|removed/i.exec(a.atributo)
					if(rotulo) {
						a.atributo = a.atributo.split(rotulo[0])[1]
						a.rotulo = rotulo[0]
					}
				})
				return {nome: $(title).text(), alteracoes: attrs}
			}).toArray()
			champs[i].alteracoes = changes
			return champs
		}, SCRAP.champs)

	})
	.catch(console.error)
	.finally(() => {
		// console.log(SCRAP.champs)
		fs.writeFile('data.json', JSON.stringify(SCRAP, null, 2), (err) => {
			console.log(`Writed data at path: ${path.join(__dirname, patchesDir, folder, "data.json")}`)
		})
	})

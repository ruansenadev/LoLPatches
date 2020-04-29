const vision = require('@google-cloud/vision')
const async = require('async')
// const imageFt = 'imagens/testVision.jpg'
// const imageFt = 'imagens/inlineVision.jpg'
// const imageFt = 'imagens/noTitleVision.jpg'
// const images = ['imagens/testVision.jpg']
const images = ['imagens/testVision.jpg', 'imagens/inlineVision.jpg']

const client = new vision.ImageAnnotatorClient()
const margin = 20;

async function look(img) {
    let data = {}
    const [result] = await client.textDetection(img)
    let detections = result.textAnnotations
    if (!detections.length) {
        return data
    }
    // calc texts bounding boxes
    detections = detections.map(d => {
        let box = d.boundingPoly.vertices
        let midX = box[3].x + Math.round((box[2].x - box[3].x) / 2)
        return {
            text: d.description,
            boundingBox: { t: box[0].y, b: box[3].y, l: box[3].x, r: box[2].x, m: midX }
        }
    })
    // format phrases text
    let phrases = detections[0].text.trim().split('\n')
    // sanitize
    phrases.forEach((txt, i) => {
        if (/nota|atualização|\d+.\d*[a-z]*/ig.test(txt)) {
            phrases.splice(i, 1)
        }
    })
    for(let i = 0; i < detections.length; i++) {
        if(detections[i].text === phrases[0]) {
            detections.splice(0, i-1)
            break
        }
    }
    // calc phrases bounding boxes
    phrases = phrases.map((p, i) => {
        let box
        let include
        calc:
        for(let j = 1; j < detections.length; j++) {
            if(p.includes(detections[j].text)) {
                if(!include) {
                    // starts with
                    box = detections[j].boundingBox
                } else if(j === include) {
                    // expands box
                    box.r = detections[j].boundingBox.r
                    box.m = box.l + Math.round((box.r - box.l) / 2)
                } else {
                    // includes and isnt begin or followed its of a next text box
                    break calc
                }
                include = j
                detections.splice(j, 1)
                j--
            }
        }
        return {text: p, boundingBox: box}
    })
    // fiter titles
    titles = phrases.filter(phrase => /[A-Z]{2,}/.test(phrase.text))
    if (titles.length) {
        // cut from detections, name output
        titles.forEach(t => {
            data[t.text.toLowerCase()] = []
        })
    } else {
        // set default title output
        titles = [{text: 'novidades', boundingBox: detections[0].boundingBox}]
        data[[titles].text] = []
    }
    // titles.forEach(t => {
    //     console.log(t)
    // })
    // detections.forEach(d => {
    //     console.log(d)
    //     // console.log(d.description, d.boundingPoly)
    // })
    console.log(phrases)
    return data
}

async.series(images.map(m => {
    return function (cb) {
        look(m).then(data => { cb(null, data) }).catch(cb)
    }
}), (err, results) => {
    if (err) { return console.error(err) }
    results.forEach(data => {
        console.log(data)
    })
})

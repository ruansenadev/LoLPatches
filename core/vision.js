const vision = require('@google-cloud/vision')
const async = require('async')

const client = new vision.ImageAnnotatorClient()
const marginX = 26;

function titleType(title, array) {
    title = title.text
    let titleIndex = null
    let type = 0
    // TITLE CASES
    // 1. TITLE IS FOLLOWED AND HAS ANOTHER BELOW: 3
    // 2. TITLE IS FOLLOWED BY ONE: 2
    // 3. HAVE ANOTHER BELOW: 1
    // 4. HAS JUST ONE TITLE: 0
    let phrase
    count:
    for (let i = 0; i < array.length; i++) {
        phrase = array[i]
        if (phrase.type == 't') {
            // if no title found
            if (titleIndex === null) {
                if (title === phrase.text) {
                    titleIndex = i
                }
            } else {
                // title after have found
                if (titleIndex == (i - 1)) {
                    // is in-line
                    type += 2
                } else {
                    // is bellow
                    type += 1
                    break count
                }
            }
        }
    }
    return [type, titleIndex]
}

exports.look = async function (img) {
    let data = {}
    const [result] = await client.textDetection({
        "image": {
            "source": {
                "filename": img
            }
        },
        "imageContext": {
            "languageHints": ["pt", "en"]
        }
    })
    let detections = result.textAnnotations
    if (!detections.length) {
        return data
    }
    // calc texts bounding boxes
    detections = detections.map(d => {
        let box = d.boundingPoly.vertices
        let midX = box[3].x + Math.round((box[2].x - box[3].x) / 2)
        let lineH = Math.round(box[3].y - box[0].y)
        return {
            text: d.description,
            boundingBox: { t: box[0].y, b: box[3].y, l: box[3].x, r: box[2].x, m: midX, h: lineH }
        }
    })
    // format phrases text
    let phrases = detections[0].text.trim().split('\n')
    // sanitize
    phrases.forEach((txt, i) => {
        if (/nota|atualização|\d+\.\d+[a-z]*/ig.test(txt)) {
            phrases.splice(i, 1)
        }
    })
    for (let i = 0; i < detections.length; i++) {
        if (detections[i].text === phrases[0]) {
            // cuts begin that was sanitized in phrases
            detections.splice(0, i - 1)
            break
        }
    }
    // calc phrases bounding boxes
    phrases = phrases.map((p, i) => {
        let box
        let include
        calc:
        for (let j = 1; j < detections.length; j++) {
            if (p.includes(detections[j].text)) {
                if (!include) {
                    // starts with
                    box = detections[j].boundingBox
                } else if (j === include) {
                    // expands box
                    box.r = detections[j].boundingBox.r
                    box.m = box.l + Math.round((box.r - box.l) / 2)
                    // check if phrase has ended
                    if (!/\w/g.test(p.split(detections[j].text)[1])) {
                        detections.splice(j, 1)
                        j--
                        break
                    }
                } else {
                    // includes and isnt begin or followed its of a next text box
                    break calc
                }
                include = j
                detections.splice(j, 1)
                j--
            }
        }
        let type = /[a-z]/.test(p) ? 'p' : 't'
        return { text: p, type, boundingBox: box }
    })
    let titles = phrases.filter(phrase => {
        if(phrase.type == 't') {
            if(phrase.text == 'NEW') phrase.text = 'NOVIDADES'
            return phrase
        }
    })
    if (!titles.length) {
        // set default title
        let title = { text: 'novidades', type: 't', boundingBox: detections[0].boundingBox }
        titles = [title]
        phrases.unshift(title)
    }

    titles.forEach(t => {
        // count type of title
        let titleCase = titleType(t, phrases)

        let title1
        let title2
        let title2L
        let phrasesAfter
        let interval
        switch (titleCase[0]) {
            case 3:
                next:
                for (let i = titleCase[1] + 2; i < phrases.length; i++) {
                    if (phrases[i].type == 't') {
                        interval = phrases.splice(titleCase[1], i - titleCase[1])
                        break next
                    }
                }
                title1 = interval.splice(0, 1)
                title2 = interval.splice(0, 1)
                // right title has left margin of icon
                title2L = title2[0].boundingBox.l
                // start looking items second title and append others to the first
                interval.forEach(phrase => {
                    if ((phrase.boundingBox.r + marginX) >= title2L) {
                        title2.push(phrase)
                    } else {
                        title1.push(phrase)
                    }
                })
                interval = title1.concat(title2)

                // insert array in place
                phrasesAfter = phrases.splice(titleCase[1])
                phrases = phrases.concat(interval).concat(phrasesAfter)

                break
            case 2:
                interval = phrases.splice(titleCase[1])
                title1 = interval.splice(0, 1)
                title2 = interval.splice(0, 1)
                // right title has left margin of icon
                title2L = title2[0].boundingBox.l
                // start looking items second title and append others to the first
                interval.forEach(phrase => {
                    if ((phrase.boundingBox.r + marginX) >= title2L) {
                        title2.push(phrase)
                    } else {
                        title1.push(phrase)
                    }
                })
                interval = title1.concat(title2)

                // insert array in place
                phrasesAfter = phrases.splice(titleCase[1])
                phrases = phrases.concat(interval).concat(phrasesAfter)

                break
            case 1:
            // is in order
            default:
                // type 0 just phrases after is in order too
                break
        }
    })
    // join Y
    let pnL
    let pnR
    phrases = phrases.reduce((joined, p, i, ps) => {
        if (p.type == 'p') {
            // looks if next phrase is in lineheight margin
            for (let pa = 0; pa < ps.length; pa++) {
                if (ps[pa].type == 'p') {
                    pnL = ps[pa].boundingBox.l
                    pnR = ps[pa].boundingBox.r
                    // after and same column test
                    if (ps[pa].boundingBox.t > p.boundingBox.b && (p.boundingBox.m > pnL && p.boundingBox.m < pnR)) {
                        // margin y test
                        if ((p.boundingBox.b + p.boundingBox.h) >= ps[pa].boundingBox.t) {
                            // concats text expands box
                            p.text += ` ${ps[pa].text}`
                            p.boundingBox.l = pnL
                            p.boundingBox.r = pnR
                            p.boundingBox.b = ps[pa].boundingBox.b
                            // remove and keeps looking same pa indice
                            ps.splice(pa, 1)
                        }
                    }
                }
            }
        }
        joined.push(p)
        return joined
    }, [])
    // format to object
    let lastTitle
    phrases.forEach(phrase => {
        if (phrase.type == 't') {
            lastTitle = phrase.text.toLowerCase()
            data[lastTitle] = {items: []}
        } else {
            data[lastTitle].items.push({'nome': phrase.text})
        }
    })

    return data
}

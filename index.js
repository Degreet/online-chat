const { MongoClient, ObjectId } = require("mongodb")
const { createServer } = require('http')
const gmailMsg = require("gmail-send")
const fs = require('fs'), fsp = fs.promises
const Cookies = require('cookies')
const dotenv = require('dotenv')
dotenv.config()

const PORT = process.env.PORT || 3000
const pass = process.env.KEY
const server = createServer(requestHandler)
const uri = `mongodb+srv://Node:${pass}@cluster0-ttfss.mongodb.net/online-chat?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

async function requestHandler(req, resp) {
  console.log(req.url)
  const cookies = new Cookies(req, resp)
  console.log("cookies loaded!")

  let { url } = req
  if (url.startsWith('/api/')) {
    url = url.slice(5)

    if (url == "reg") {
      const user = JSON.parse(await streamToString(req))
      const candidate = await users.findOne({ email: user.email }) || await users.findOne({ name: user.name })
      const data = {}

      if (user.name.length < 3 || user.email.length < 3) {
        data.msg = "Введите email и имя!"
        data.success = false
      } else {
        if (!candidate) {
          user.date = genDate()
          user.token = generateToken()

          await users.insertOne(user)
          cookies.set("token", user.token)

          sendMsgToEmail(
            user.email,
            "Добро пожаловать на OnlineChat!",
            `Добро пожаловать, ${user.name}!`
          )

          data.msg = "Все готово!"
          data.success = true
        } else {
          data.msg = "Такой пользователь уже существует."
          data.success = false
        }
      }

      resp.end(JSON.stringify(data))
    } else if (url == "getMsg") {
      const msgData = await msgList.find().toArray()
      resp.end(JSON.stringify(msgData))
    } else if (url == "newMsg") {
      if (await checkCandidate(cookies)) {
        const candidate = await getCandidate(cookies)
        const msg = JSON.parse(await streamToString(req))
        msg.date = genDate()
        msg.author = candidate.name
        await msgList.insertOne(msg)
      }
    } else if (url == "auth") {
      const user = JSON.parse(await streamToString(req))
      const candidate = await getCandidate(user.email)
      const data = {}

      if (!candidate) {
        data.success = false
        data.msg = `Такого пользователя не существует!`
      } else {
        const code = generateCode()
        sendMsgToEmail(user.email, "Подтвердите код на OnlineChat", `Здравствуйте! Ваш код: ${code}`)
        await users.updateOne(candidate, { $set: { code } })
        data.success = true
      }

      resp.end(JSON.stringify(data))
    } else if (url == "codeCheck") {
      const user = JSON.parse(await streamToString(req))
      const codeForCheck = user.code
      const candidate = await getCandidate(user.email)
      const data = {}

      if (candidate) {
        const realCode = candidate.code

        if (realCode == codeForCheck) {
          const token = generateToken()
          await users.updateOne(candidate, { $set: { token } })
          cookies.set("token", token)
          data.success = true
        } else {
          data.success = false
          data.msg = `Не верный код!`
        }
      } else {
        data.success = false
        data.msg = `Вы не авторизованы!`
      }

      resp.end(JSON.stringify(data))
    } else if (url == "exit") {
      cookies.set("token", "")
      resp.end()
    }
  } else if (url == '/chat') {
    if (await checkCandidate(cookies)) {
      const msgData = await msgList.find().toArray()
      const [file] = await Promise.all([fsp.readFile(__dirname + "/public/chat.html")])

      const html = buildFile(
        "Онлайн чат",
        file.toString()
          .replace(/(id="msgList">)/, '$1' + msgData.map(buildMsg).join('')),
        "chat"
      )

      resp.setHeader('Content-Type', 'text/html')
      resp.end(html)
    } else {
      resp.end(`<script>location.href = "/"</script>`)
    }
  } else {
    let path = process.cwd() + '/public' + url.replace(/\/$/, '')

    try {
      const target = await fsp.stat(path).catch(_ => fsp.stat(path += '.html'))
      if (target.isDirectory()) path += '/index.html'
      const match = path.match(/\.(\w+)$/), ext = match ? match[1] : 'html'

      if (path.endsWith("/public/index.html")) {
        console.log("index starting")
        const [file] = await Promise.all([fsp.readFile(path)])
        const html = buildFile("Главная", file.toString(), "reg")
        resp.setHeader('Content-Type', 'text/html')
        resp.end(await checkCandidate(cookies) ? `<script>location.href = '/chat'</script>` : html)
        console.log("index end")
      } else {
        fs.createReadStream(path).pipe(resp)
        resp.setHeader('Content-Type', {
          html: 'text/html',
          json: 'application/json',
          css: 'text/css',
          ico: 'image/x-icon',
          jpg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          svg: 'image/svg+xml',
          js: 'application/javascript',
        }[ext])
      }
    } catch {
      resp.end('"... sorry, ' + url + ' is not available"')
    }
  }
}

function streamToString(stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

function sendMsgToEmail(email, subject, text) {
  gmailMsg({
    user: "onlinechatnodea@gmail.com",
    pass: process.env.GMAIL_PASS,
    to: email,
    subject,
    text
  })()
}

function buildFile(title, body, scriptFileName) {
  return /*html*/`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/5.0.0-alpha1/css/bootstrap.min.css" integrity="sha384-r4NyP46KrjDleawBgD5tp8Y7UzmLA05oM1iAEQ17CSuDqnUK2+k9luXQOfXJCJ4I" crossorigin="anonymous">
      <link rel="stylesheet" href="/css/main.css">
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/5.0.0-alpha1/js/bootstrap.min.js" integrity="sha384-oesi62hOLfzrys4LxRF63OJCXdXDipiYWBnvTl9Y9/TRlw5xlKIEHpNyvvDShgf/" crossorigin="anonymous"></script>
    </head>
    <body>
      ${body}

      <script src="/js/${scriptFileName}.js"></script>
    </body>
    </html>
  `
}

function buildMsg(msg) {
  return /*html*/`
    <li>
      <div class="msg">
        <span class="info text-muted">${msg.author}, ${msg.date}</span>
        <p class="text">${msg.text}</p>
      </div>
    </li>
  `
}

function generateCode() {
  let res = ''
  for (let i = 0; i < 6; i++) res += String(Math.floor(Math.random() * 9))
  return res
}

async function checkCandidate(cookies) {
  const token = cookies.get("token")
  const candidate = await users.findOne({ token })
  return candidate ? true : false
}

async function getCandidate(by) {
  if (typeof by == "string") {
    return await users.findOne({ email: by })
  } else {
    const token = by.get("token")
    return await users.findOne({ token })
  }
}

function generateToken() {
  let res = ''
  const chars = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890'
  for (let i = 0; i < 32; i++) res += chars[Math.floor(Math.random() * chars.length)]
  return res
}

function genDate() {
  return new Date().toISOString().slice(0, 19).replace("T", " ")
}

client.connect(err => {
  if (err) console.log(err)

  global.users = client.db("online-chat").collection("users")
  global.msgList = client.db("online-chat").collection("msg-list")

  server.listen(PORT, () => console.log('Server started at http://localhost:3000'))
  setTimeout(() => client.close(), 1e9)
})
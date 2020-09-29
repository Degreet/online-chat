function toLastMsg() {
  document.querySelector(`#msgList li:last-child`).scrollIntoView()
}

toLastMsg()

const msgInterval = setInterval(() => {
  fetch("/api/getMsg", { method: "POST" }).then(resp => resp.json()).then(data => {
    msgList.innerHTML = ''
    data.forEach(msg => {
      msgList.innerHTML += /*html*/`
        <li>
          <div class="msg">
            <span class="info text-muted">${msg.author}, ${msg.date}</span>
            <p class="text">${msg.text}</p>
          </div>
        </li>
      `
    })
  })
}, 100)

msgInp.onkeydown = e => {
  if (e.key == 'Enter') {
    const text = msgInp.value
    msgInp.value = ""

    fetch("/api/newMsg", {
      method: "POST",
      body: JSON.stringify({ text })
    }).then(() => {
      setTimeout(() => toLastMsg(), 400)
    })
  }
}

onkeydown = e => {
  if (e.key == 'Escape') {
    fetch("/api/exit", {
      method: "POST",
    }).then(() => location.href = '/')
  }
}
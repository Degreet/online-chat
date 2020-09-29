sendRegBtn.onclick = () => {
  const email = regEmailInp.value
  const name = usernameInp.value

  fetch("/api/reg", {
    method: "POST",
    body: JSON.stringify({ name, email })
  }).then(resp => resp.json()).then(data => {
    const alert = document.createElement("div")
    alert.className = `alert alert-${data.success ? "success" : "danger"}`
    alert.innerText = data.msg

    Object.assign(alert.style, {
      position: "absolute",
      top: "20px",
      left: "50px",
      right: "50px"
    })

    document.body.append(alert)
    if (data.success) setTimeout(() => location.href = "/chat", 1500)
  })
}

toAuthBtn.onclick = () => {
  regSect.hidden = true
  codeSect.hidden = true
  authSect.hidden = false
}

toRegBtn.onclick = () => {
  authSect.hidden = true
  codeSect.hidden = true
  regSect.hidden = false
}

sendAuthBtn.onclick = () => {
  codeSect.hidden = false
  regSect.hidden = true
  authSect.hidden = true

  const email = authEmailInp.value

  fetch("/api/auth", {
    method: "POST",
    body: JSON.stringify({ email })
  }).then(resp => resp.json()).then(data => {
    if (data.success) {
      codeSect.hidden = false
      regSect.hidden = true
      authSect.hidden = true

      confCodeBtn.onclick = () => {
        const code = codeInp.value

        if (code.length < 6) {
          const alert = document.createElement("div")
          alert.className = `alert alert-danger`
          alert.innerText = `Длина кода не менее 6 симв.!`

          Object.assign(alert.style, {
            position: "absolute",
            top: "20px",
            left: "50px",
            right: "50px"
          })

          document.body.append(alert)
        } else {
          fetch("/api/codeCheck", {
            method: "POST",
            body: JSON.stringify({ code, email })
          }).then(resp => resp.json()).then(data => {
            if (data.success) {
              location.href = "/chat"
            } else {
              const alert = document.createElement("div")
              alert.className = `alert alert-danger`
              alert.innerText = data.msg

              Object.assign(alert.style, {
                position: "absolute",
                top: "20px",
                left: "50px",
                right: "50px"
              })

              document.body.append(alert)
            }
          })
        }
      }
    } else {
      const alert = document.createElement("div")
      alert.className = `alert alert-danger`
      alert.innerText = data.msg

      Object.assign(alert.style, {
        position: "absolute",
        top: "20px",
        left: "50px",
        right: "50px"
      })

      document.body.append(alert)
    }
  })
}
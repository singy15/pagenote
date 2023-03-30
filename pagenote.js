(async ()=>{ 
  let createDom = (html) => { return (new DOMParser()).parseFromString(html,"text/html").body.children[0]; };
  let query = (selector) => document.querySelector(selector);
  let digest = (message) => {
    return new Promise(function(resolve){
      crypto.subtle.digest('SHA-256', new TextEncoder("utf-8").encode(message)).then((buf) => {
        return resolve(Array.from(new Uint8Array(buf))
          .map(function(b){return b.toString(16).padStart(2, '0')}).join(''));
      });
    });
  };

  query("#pagenote-canvas")?.remove();
  query("#pagenote-toggle")?.remove();
  query("#pagenote-col")?.remove();
  query("#pagenote-erase")?.remove();

  let html = query("html");
  let url = location.href;
  let urlDigest;
  await digest(url).then(s => {
    urlDigest = s;
  });
  let storageBasePath = "/pagenote";
  let savePath = storageBasePath + "/" + urlDigest;
  let prefColorPath = storageBasePath + "/pref-color";

  let cv = createDom(`<canvas id="pagenote-canvas" style="position:absolute; top:0px; left:0px;"></canvas>`);
  cv.width = html.scrollWidth;
  cv.height = html.scrollHeight;
  cv.style.width = html.scrollWidth;
  cv.style.height = html.scrollHeight;
  document.body.appendChild(cv);

  let btToggle = createDom(`<div id="pagenote-toggle" style="z-index:9999; cursor:pointer; width:32px; height:32px; border-radius:16px; background-color:#333; border:solid 2px #AAA; opacity:0.8; position:fixed; top:16px; left:16px;">&nbsp;</div>`);
  document.body.appendChild(btToggle);

  let col = createDom(`<input id="pagenote-col" type="color" style="z-index:9999; border-radius:0px; position:fixed; top:23px; left:54px; width:14px; height:18px;"/>`);
  col.value = (localStorage.getItem(prefColorPath))? localStorage.getItem(prefColorPath) : "#0000FF";
  document.body.appendChild(col);

  let btErase = createDom(`<div id="pagenote-erase" style="z-index:9999; cursor:pointer; width:16px; height:16px; border-radius:8px; background-color:#FFF; border:solid 2px #333; opacity:0.8; position:fixed; top:23px; left:80px;">&nbsp;</div>`);
  document.body.appendChild(btErase);

  let ctx = cv.getContext("2d");

  let enabled = true;
  let painting = false;
  let erase = false;
  let lastx = null;
  let lasty = null;
  let saveTimeout = null;
  let tempEnabled = false;

  html.addEventListener("keydown", (e) => {
    console.log(e);
    if(e.key === 'Control') {
      tempEnabled = true;
      changeMode(true);
    }
  });

  html.addEventListener("keyup", (e) => {
    console.log(e);
    if(e.key === 'Control') {
      tempEnabled = false;
      if(!enabled) {
        changeMode(false);
      }
    }
  });

  cv.addEventListener("mousedown", () => {
    painting = ((enabled || tempEnabled) ? true : painting);
  });

  cv.addEventListener("mousemove", (e) => {
    if(lastx == null) {
      [lastx,lasty] = [e.pageX,e.pageY];
    }

    if(painting) {
      if(!erase) {
        ctx.beginPath();
        ctx.moveTo(lastx,lasty);
        ctx.lineTo(e.pageX,e.pageY);
        ctx.lineWidth = 3;
        ctx.strokeStyle = col.value;
        ctx.stroke();
      } else {
        ctx.clearRect(e.pageX - 10, e.pageY - 10,  20, 20);
      }

      if(saveTimeout) {
        clearTimeout(saveTimeout);
      }

      saveTimeout = setTimeout(() => {
        localStorage.setItem(savePath, cv.toDataURL());
      }, 1000);
    }

    [lastx,lasty] = [e.pageX,e.pageY];
  });

  cv.addEventListener("mouseup", () => {
    painting = false;
  });

  let changeMode = (val) => {
    if(val) {
      html.style.cursor = "crosshair";
      cv.style.pointerEvents = "inherit";
    } else {
      html.style.cursor = "inherit";
      cv.style.pointerEvents = "none";
    }
  };

  btToggle.addEventListener("click", () => {
    enabled = !enabled;
    changeMode(enabled);
  });

  col.addEventListener("change", () => {
    localStorage.setItem(prefColorPath, col.value);
  });

  btErase.addEventListener("click", () => {
    erase = !erase;
    if(erase) {
      btToggle.style.backgroundColor = "#FFF";
      btToggle.style.borderColor = "#333";
    } else {
      btToggle.style.backgroundColor = "#333";
      btToggle.style.borderColor = "#AAA";
    }
  });

  changeMode(enabled);

  if(localStorage.getItem(savePath)) {
    let img = new Image();
    img.src = localStorage.getItem(savePath);
    setTimeout(() => {
      ctx.drawImage(img,0,0);
    }, 500);
  }
})()

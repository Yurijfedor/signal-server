const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");

// Завантажуємо SSL-сертифікат
const server = https.createServer({
  cert: fs.readFileSync("server.cert"),
  key: fs.readFileSync("server.key"),
});

const wss = new WebSocket.Server({ server });

let broadcaster = null;
let viewers = [];

wss.on("connection", (ws) => {
  console.log("🔗 WebSocket підключився");

  ws.on("message", (message) => {
    console.log("📩 Повідомлення від клієнта:", message); // Лог повідомлення
    try {
      const data = JSON.parse(message);
      console.log("📩 Повідомлення від клієнта:", data);

      if (data.offer) {
        broadcaster = ws;
        viewers.forEach((viewer) => {
          viewer.send(JSON.stringify({ offer: data.offer }));
        });
        console.log("🎥 Передано offer всім глядачам");
      } else if (data.answer) {
        if (broadcaster) {
          broadcaster.send(JSON.stringify({ answer: data.answer }));
        }
        console.log("🎥 Відправлено answer broadcaster'у");
      } else if (data.iceCandidate) {
        viewers.forEach((viewer) => {
          viewer.send(JSON.stringify({ iceCandidate: data.iceCandidate }));
        });
        console.log("🧊 Передано iceCandidate всім глядачам");
      }
    } catch (error) {
      console.error("❌ Помилка при парсингу повідомлення:", error);
    }
  });

  ws.on("close", () => {
    viewers = viewers.filter((viewer) => viewer !== ws);
    console.log("❌ WebSocket закрито, глядачі оновлено");
  });

  viewers.push(ws);
});

// Запускаємо сервер
server.listen(8080, "0.0.0.0", () => {
  console.log("🚀 Сервер запущено на wss://0.0.0.0:8080");
});

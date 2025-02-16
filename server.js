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

  // Обробка повідомлень від клієнта
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.offer) {
        // Якщо це offer, то встановлюємо broadcaster і передаємо його всім глядачам
        broadcaster = ws;
        viewers.forEach((viewer) => {
          viewer.send(JSON.stringify({ offer: data.offer }));
        });
      } else if (data.answer) {
        // Якщо це answer, то надсилаємо його broadcaster'у
        if (broadcaster) {
          broadcaster.send(JSON.stringify({ answer: data.answer }));
        }
      } else if (data.iceCandidate) {
        // Якщо це iceCandidate, передаємо його всім глядачам
        viewers.forEach((viewer) => {
          viewer.send(JSON.stringify({ iceCandidate: data.iceCandidate }));
        });
      }
    } catch (error) {
      console.error("❌ Помилка при парсингу повідомлення:", error);
    }
  });

  // Обробка закриття з'єднання
  ws.on("close", () => {
    viewers = viewers.filter((viewer) => viewer !== ws);
    console.log("❌ WebSocket закрито, глядачі оновлено");
  });

  // Додаємо підключеного глядача до списку
  viewers.push(ws);
});

// Запускаємо сервер
server.listen(8080, "0.0.0.0", () => {
  console.log("🚀 Сервер запущено на wss://0.0.0.0:8080");
});

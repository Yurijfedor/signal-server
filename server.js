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
    try {
      const data = JSON.parse(message);
      console.log("📩 Повідомлення від клієнта:", data);

      if (data.role === "broadcaster") {
        // Клієнт оголошує себе broadcaster'ом
        if (broadcaster && broadcaster !== ws) {
          console.warn("⚠️ Попередній broadcaster замінено");
          broadcaster.close(); // Закриваємо попереднього, якщо є
        }
        broadcaster = ws;
        console.log("🎥 Broadcaster призначено");
      } else if (data.offer) {
        if (ws !== broadcaster) {
          console.warn("⚠️ Offer отримано не від broadcaster'а, ігноруємо");
          return;
        }
        viewers.forEach((viewer) => {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ offer: data.offer }));
          }
        });
        console.log("🎥 Передано offer всім глядачам");
      } else if (data.answer) {
        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
          broadcaster.send(JSON.stringify({ answer: data.answer }));
          console.log("🎥 Відправлено answer broadcaster'у");
        } else {
          console.warn("⚠️ Broadcaster недоступний для answer");
        }
      } else if (data.iceCandidate) {
        if (ws === broadcaster) {
          // ICE кандидат від broadcaster'а до глядачів
          viewers.forEach((viewer) => {
            if (viewer.readyState === WebSocket.OPEN) {
              viewer.send(JSON.stringify({ iceCandidate: data.iceCandidate }));
            }
          });
          console.log("🧊 Передано iceCandidate від broadcaster'а до глядачів");
        } else {
          // ICE кандидат від глядача до broadcaster'а
          if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            broadcaster.send(
              JSON.stringify({ iceCandidate: data.iceCandidate })
            );
            console.log(
              "🧊 Передано iceCandidate від глядача до broadcaster'а"
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Помилка при парсингу повідомлення:", error);
    }
  });

  ws.on("close", () => {
    if (ws === broadcaster) {
      broadcaster = null;
      console.log("❌ Broadcaster відключено");
    } else {
      viewers = viewers.filter((viewer) => viewer !== ws);
      console.log("❌ Viewer відключено, глядачі оновлено");
    }
  });

  // За замовчуванням новий клієнт — глядач, якщо не вказано роль
  if (ws !== broadcaster) {
    viewers.push(ws);
    console.log("👀 Додано нового глядача");
  }
});

// Запускаємо сервер
server.listen(8080, "0.0.0.0", () => {
  console.log("🚀 Сервер запущено на wss://0.0.0.0:8080");
});

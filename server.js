const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");

const server = https.createServer({
  cert: fs.readFileSync("server.cert"),
  key: fs.readFileSync("server.key"),
});

const wss = new WebSocket.Server({ server });

let broadcaster = null;
let viewers = [];
let lastOffer = null; // Зберігаємо останній offer від broadcaster

wss.on("connection", (ws) => {
  console.log("🔗 WebSocket підключився");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📩 Повідомлення від клієнта:", data);

      if (data.role === "broadcaster") {
        broadcaster = ws;
        viewers = viewers.filter((v) => v !== ws);
        console.log("🎥 Broadcaster призначено");
      } else if (data.offer) {
        if (ws !== broadcaster) return;
        lastOffer = data.offer; // Зберігаємо offer
        viewers.forEach((viewer) => {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ offer: data.offer }));
            console.log("🎥 Передано offer глядачу");
          }
        });
        console.log("🎥 Передано offer всім глядачам");
      } else if (data.answer) {
        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
          broadcaster.send(JSON.stringify({ answer: data.answer }));
          console.log("🎥 Відправлено answer broadcaster'у");
        }
      } else if (data.iceCandidate) {
        if (ws === broadcaster) {
          viewers.forEach((viewer) => {
            if (viewer.readyState === WebSocket.OPEN) {
              viewer.send(JSON.stringify({ iceCandidate: data.iceCandidate }));
              console.log("🧊 Передано ICE candidate до глядача");
            }
          });
        } else if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
          broadcaster.send(JSON.stringify({ iceCandidate: data.iceCandidate }));
          console.log("🧊 Передано ICE candidate до broadcaster'а");
        }
      }
    } catch (error) {
      console.error("❌ Помилка при парсингу повідомлення:", error);
    }
  });

  ws.on("close", () => {
    if (ws === broadcaster) {
      broadcaster = null;
      lastOffer = null;
      console.log("❌ Broadcaster відключено");
    }
    viewers = viewers.filter((viewer) => viewer !== ws);
    console.log("❌ WebSocket закрито");
  });

  if (broadcaster && lastOffer && ws !== broadcaster) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ offer: lastOffer }));
      console.log("🎥 Надіслано збережений offer новому глядачу");
    }
    viewers.push(ws);
  } else if (!broadcaster || ws !== broadcaster) {
    viewers.push(ws);
    console.log("👀 Додано нового глядача");
  }
});

server.listen(8080, "0.0.0.0", () => {
  console.log("🚀 Сервер запущено на wss://0.0.0.0:8080");
});

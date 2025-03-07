const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server is running");
});

const wss = new WebSocket.Server({ server });

let broadcaster = null;
const viewers = new Map(); // Map для зберігання viewerId -> WebSocket

wss.on("connection", (ws) => {
  console.log("🔗 WebSocket підключився");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("📩 Повідомлення від клієнта:", data);

      if (data.role === "broadcaster") {
        broadcaster = ws;
        console.log("🎥 Broadcaster призначено");
      } else if (data.role === "viewer") {
        const viewerId = Date.now().toString(); // Унікальний ID для глядача
        viewers.set(viewerId, ws);
        ws.viewerId = viewerId; // Зберігаємо ID у WebSocket об’єкті
        console.log(`👀 Додано глядача ${viewerId}`);

        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
          broadcaster.send(JSON.stringify({ newViewer: viewerId }));
          console.log(
            `📢 Повідомлено broadcaster про нового глядача ${viewerId}`
          );
        }
      } else if (data.offer && data.viewerId) {
        const viewer = viewers.get(data.viewerId);
        if (viewer && viewer.readyState === WebSocket.OPEN) {
          viewer.send(JSON.stringify({ offer: data.offer }));
          console.log(`🎥 Передано offer глядачу ${data.viewerId}`);
        }
      } else if (data.answer && data.viewerId) {
        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
          broadcaster.send(
            JSON.stringify({ answer: data.answer, viewerId: data.viewerId })
          );
          console.log(
            `🎥 Передано answer від глядача ${data.viewerId} до broadcaster`
          );
        }
      } else if (data.iceCandidate && data.viewerId) {
        if (ws === broadcaster) {
          const viewer = viewers.get(data.viewerId);
          if (viewer && viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ iceCandidate: data.iceCandidate }));
            console.log(
              `🧊 Передано ICE candidate до глядача ${data.viewerId}`
            );
          }
        } else {
          if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            broadcaster.send(
              JSON.stringify({
                iceCandidate: data.iceCandidate,
                viewerId: data.viewerId,
              })
            );
            console.log(
              `🧊 Передано ICE candidate до broadcaster від ${data.viewerId}`
            );
          }
        }
      } else if (data.restart) {
        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
          broadcaster.send(JSON.stringify({ restart: true }));
          console.log("🔄 Передано команду перезапуску broadcaster'у");
        }
      }
    } catch (error) {
      console.error("❌ Помилка при парсингу повідомлення:", error);
    }
  });

  ws.on("close", () => {
    if (ws === broadcaster) {
      broadcaster = null;
      viewers.forEach((viewer) => viewer.close());
      viewers.clear();
      console.log("❌ Broadcaster відключено, всіх глядачів відключено");
    } else if (ws.viewerId) {
      viewers.delete(ws.viewerId);
      if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
        broadcaster.send(JSON.stringify({ viewerDisconnected: ws.viewerId }));
        console.log(`❌ Глядач ${ws.viewerId} відключено`);
      }
    }
  });
});

server.listen(8080, "0.0.0.0", () => {
  console.log("🚀 Сервер запущено на ws://0.0.0.0:8080");
});

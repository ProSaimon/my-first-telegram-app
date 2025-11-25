const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Инициализация базы данных
const db = new sqlite3.Database("./server/database.db");

// Создаем таблицу для счетчиков
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS user_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id BIGINT NOT NULL,
      username TEXT,
      first_name TEXT,
      counter_value INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);
});

// API для сохранения данных счетчика
app.post("/api/save-counter", (req, res) => {
  const { user_id, username, first_name, counter_value } = req.body;

  console.log("📥 Получены данные:", {
    user_id,
    username,
    first_name,
    counter_value,
  });

  db.run(
    `
    INSERT INTO user_counters (user_id, username, first_name, counter_value, last_updated)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      counter_value = excluded.counter_value,
      last_updated = CURRENT_TIMESTAMP
  `,
    [user_id, username, first_name, counter_value],
    function (err) {
      if (err) {
        console.error("❌ Ошибка сохранения:", err);
        return res.status(500).json({ error: "Ошибка сохранения" });
      }

      console.log("✅ Данные сохранены для пользователя:", user_id);
      res.json({
        success: true,
        message: "Данные сохранены",
      });
    }
  );
});

// API для получения всех данных (для админа)
app.get("/api/admin/stats", (req, res) => {
  db.all(
    `
    SELECT user_id, username, first_name, counter_value, last_updated 
    FROM user_counters 
    ORDER BY counter_value DESC
  `,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Ошибка получения данных" });
      }

      res.json({
        total_users: rows.length,
        users: rows,
      });
    }
  );
});

// API для получения данных конкретного пользователя
app.get("/api/user/:user_id", (req, res) => {
  const userId = req.params.user_id;

  db.get(
    `
    SELECT user_id, username, first_name, counter_value, last_updated 
    FROM user_counters 
    WHERE user_id = ?
  `,
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Ошибка получения данных" });
      }

      res.json(row || { user_id: userId, counter_value: 0 });
    }
  );
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

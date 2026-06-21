# Pet Hotel Platform — план разработки

## Цель
Веб-платформа для зоо-отелей: оцифровка ежедневных отчётов о проживании животных.
Заменяет Word-документы, которые раньше отправлялись владельцам вручную.

---

## Роли

| Роль | Возможности |
|------|-------------|
| **admin** | Управление сотрудниками, владельцами, питомцами, клетками/зонами, все отчёты, аналитика |
| **employee** | Создание ежедневных отчётов по закреплённым питомцам, выбор клетки при заселении |
| **owner** | Просмотр отчётов по своим питомцам, история проживания, фото/видео |

---

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Fastify |
| ORM | Prisma |
| БД | PostgreSQL (self-hosted) |
| Auth | JWT access token (15 мин) + refresh token (7 дней) httpOnly cookie |
| Пароли | bcrypt |
| Валидация | Zod (общие схемы на фронте и бэке) |
| Деплой | VPS + Nginx (reverse proxy) |

---

## Структура репозитория

```
pet-hotel/
├── apps/
│   ├── frontend/        # React + Vite
│   └── backend/         # Fastify + Prisma
├── packages/
│   └── shared/          # Общие Zod-схемы и TypeScript типы
└── docker-compose.yml   # PostgreSQL локально для разработки
```

---

## Модель данных

```
users                — id, email, password_hash, role, name, created_at
pets                 — id, name, species, breed, owner_id, photo_url, notes
cages                — id, number, zone, type (dog/cat/other), is_occupied
stays                — id, pet_id, cage_id, employee_id, check_in, check_out, status
reports              — id, stay_id, employee_id, date, day_status, created_at
report_metrics       — id, report_id, category, value, comment
report_activities    — id, report_id, activity_type, completed
report_observations  — id, report_id, observation, action, notify_owner
```

---

## Безопасность

- `httpOnly` cookie для refresh token — JS не достанет даже при XSS
- Prisma параметризует все запросы — SQL injection невозможен
- Middleware проверки роли на каждом эндпоинте (`requireRole('admin')`)
- Rate limit на `/auth/login` — 5 попыток/минута по IP
- CORS только для домена фронта
- Zod валидация на входе каждого эндпоинта

---

## Этапы разработки

### Этап 1 — Фундамент
- [ ] Monorepo (pnpm workspaces)
- [ ] Fastify + Prisma + схема БД
- [ ] Авторизация: register / login / refresh / logout
- [ ] Middleware проверки ролей
- [ ] Docker Compose для локального PostgreSQL

### Этап 2 — Административная панель
- [ ] CRUD: пользователи, питомцы, клетки
- [ ] Заселение / выезд питомца (stays)
- [ ] Назначение сотрудника на постояльца

### Этап 3 — Модуль отчётов (Employee)
- [ ] Список активных постояльцев
- [ ] Форма ежедневного отчёта (по прототипу пример.html)
- [ ] Сохранение метрик, активностей, наблюдений

### Этап 4 — Личный кабинет владельца
- [ ] Лента отчётов по питомцам
- [ ] Просмотр фото/видео
- [ ] Флаг "Сообщить владельцу" в наблюдениях

### Этап 5 — Полировка
- [ ] Адаптивная вёрстка
- [ ] Загрузка фото/видео к отчётам
- [ ] Фильтрация отчётов по датам
- [ ] Уведомления (email/push) — отложено

---

## Дизайн
Glassmorphism: тёмный фон (#050814), blur-карточки, accent #a5f3fc (cyan).
Референс: пример.html в корне проекта.

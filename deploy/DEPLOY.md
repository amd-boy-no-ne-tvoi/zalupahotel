# Деплой Pet Hotel на VPS

## Требования к серверу
- Ubuntu 22.04 LTS
- 1 GB RAM (минимум), 2 GB рекомендуется
- Node.js 20+, pnpm, PM2, PostgreSQL 16, Nginx, Certbot

---

## 1. Первоначальная настройка сервера

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установить pnpm
npm install -g pnpm

# Установить PM2
npm install -g pm2

# Установить Nginx
apt install -y nginx

# Установить Certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

---

## 2. PostgreSQL

```bash
# Установить PostgreSQL 16
apt install -y postgresql postgresql-contrib

# Создать БД и пользователя
sudo -u postgres psql <<'SQL'
CREATE USER pet_hotel_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE pet_hotel OWNER pet_hotel_user;
GRANT ALL PRIVILEGES ON DATABASE pet_hotel TO pet_hotel_user;
SQL
```

---

## 3. Загрузка кода на сервер

```bash
# Создать директорию проекта
mkdir -p /var/www/pet-hotel
cd /var/www/pet-hotel

# Клонировать репозиторий (если есть git remote)
git clone <YOUR_REPO_URL> .
# ИЛИ загрузить через scp с локальной машины:
# scp -r /path/to/pet\ hotel/* root@YOUR_SERVER:/var/www/pet-hotel/
```

---

## 4. Переменные окружения

```bash
# Backend
cp /var/www/pet-hotel/apps/backend/.env.production.example /var/www/pet-hotel/apps/backend/.env

# Отредактировать .env
nano /var/www/pet-hotel/apps/backend/.env
```

Заполнить в `.env`:
```env
DATABASE_URL="postgresql://pet_hotel_user:STRONG_PASSWORD_HERE@localhost:5432/pet_hotel"
JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="$(openssl rand -hex 32)"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="https://YOUR_DOMAIN.com"
NODE_ENV="production"
```

```bash
# Frontend (VITE_API_URL читается только во время сборки)
cp /var/www/pet-hotel/apps/frontend/.env.production.example /var/www/pet-hotel/apps/frontend/.env.production
nano /var/www/pet-hotel/apps/frontend/.env.production
```

```env
VITE_API_URL="https://YOUR_DOMAIN.com/api"
```

---

## 5. Первая установка и сборка

```bash
cd /var/www/pet-hotel

# Установить зависимости
pnpm install --frozen-lockfile

# Сгенерировать Prisma Client
cd apps/backend && pnpm db:generate

# Применить миграции
pnpm prisma migrate deploy

# Создать первого администратора и клетки
pnpm db:seed

# Собрать бэкенд
pnpm build
cd /var/www/pet-hotel

# Собрать фронтенд
cd apps/frontend && pnpm build
cd /var/www/pet-hotel

# Скопировать фронтенд в web root
mkdir -p /var/www/pet-hotel/frontend
cp -r apps/frontend/dist/* /var/www/pet-hotel/frontend/

# Создать папку для загрузок
mkdir -p /var/www/pet-hotel/backend/uploads

# Папка для логов PM2
mkdir -p /var/log/pet-hotel
```

---

## 6. Запуск через PM2

```bash
cd /var/www/pet-hotel

# Запустить
pm2 start deploy/ecosystem.config.cjs --env production

# Сохранить список процессов (автозапуск при ребуте)
pm2 save
pm2 startup  # выполнить команду, которую PM2 выдаст
```

Проверить, что сервер работает:
```bash
pm2 status
curl http://localhost:3000/auth/me
# Должен вернуть 401 — значит, API отвечает
```

---

## 7. Nginx + SSL

```bash
# Скопировать конфиг (предварительно заменить YOUR_DOMAIN.com)
sed 's/YOUR_DOMAIN.com/yourdomain.com/g' /var/www/pet-hotel/deploy/nginx.conf \
  > /etc/nginx/sites-available/pet-hotel

ln -s /etc/nginx/sites-available/pet-hotel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверить конфиг
nginx -t

# Получить SSL-сертификат
certbot --nginx -d yourdomain.com

# Перезапустить Nginx
systemctl reload nginx
```

---

## 8. Проверка после деплоя

```bash
# Логи бэкенда
pm2 logs pet-hotel-api

# Проверить https
curl https://yourdomain.com/api/auth/me
# → 401 — OK

# Открыть в браузере
# https://yourdomain.com → должен открыться фронтенд
```

Войти под первым admin:
- Email: `admin@pethotel.ru`
- Пароль: `secret123`

**Сменить пароль сразу после входа через /profile!**

---

## 9. Обновление кода (последующие деплои)

После `git push` на сервере:

```bash
cd /var/www/pet-hotel
bash deploy/deploy.sh
```

Скрипт автоматически: сделает `git pull`, установит зависимости, применит миграции, соберёт оба приложения и перезапустит PM2.

---

## 10. Автоматический бэкап БД

```bash
# Сделать скрипт исполняемым
chmod +x /var/www/pet-hotel/deploy/backup.sh

# Создать папки
mkdir -p /var/backups/pet-hotel
mkdir -p /var/log/pet-hotel

# Настроить доступ pg без пароля (через .pgpass)
echo "localhost:5432:pet_hotel:pet_hotel_user:STRONG_PASSWORD_HERE" > ~/.pgpass
chmod 600 ~/.pgpass

# Добавить в cron (запуск каждую ночь в 3:00)
crontab -e
```

Добавить строку:

```cron
0 3 * * * /var/www/pet-hotel/deploy/backup.sh >> /var/log/pet-hotel/backup.log 2>&1
```

Проверить вручную:

```bash
bash /var/www/pet-hotel/deploy/backup.sh
ls -lh /var/backups/pet-hotel/
```

Бэкапы хранятся 30 дней, затем автоматически удаляются.

---

## Полезные команды

```bash
pm2 status                        # статус процессов
pm2 logs pet-hotel-api --lines 50 # последние логи
pm2 restart pet-hotel-api         # перезапуск
pm2 stop pet-hotel-api            # остановить

sudo -u postgres psql pet_hotel   # войти в БД
systemctl status nginx             # статус nginx
certbot renew --dry-run            # проверить автопродление SSL
```

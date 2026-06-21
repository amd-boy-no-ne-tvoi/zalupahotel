# Деплой Pet Hotel на VPS (Docker)

## Требования к серверу
- Ubuntu 22.04 / Debian 12
- 1GB RAM минимум (2GB рекомендуется)
- Docker + Docker Compose v2
- Nginx
- Certbot (Let's Encrypt)

## 1. Установка Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Установка Nginx + Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 3. Настройка домена

В DNS-панели вашего домена добавьте A-запись:
```
Тип: A
Имя: @  (или subdomain)
Значение: IP_ВАШЕГО_VPS
TTL: 3600
```

Дождитесь распространения DNS (5–30 минут).

## 4. Получение SSL-сертификата

```bash
sudo certbot --nginx -d yourdomain.com
```

## 5. Загрузка кода на сервер

```bash
# На локальной машине:
git archive --format=tar.gz HEAD | ssh user@YOUR_VPS_IP 'cat > /tmp/pet-hotel.tar.gz'

# На сервере:
mkdir -p /srv/pet-hotel
cd /srv/pet-hotel
tar -xzf /tmp/pet-hotel.tar.gz
```

Или через git:
```bash
git clone https://github.com/YOUR/pet-hotel.git /srv/pet-hotel
cd /srv/pet-hotel
```

## 6. Настройка переменных окружения

```bash
cd /srv/pet-hotel
cp .env.example .env
nano .env  # заполните все значения
```

Для VAPID-ключей (push-уведомления):
```bash
docker run --rm node:20-alpine npx web-push generate-vapid-keys
```

## 7. Настройка Nginx на хосте

```bash
sudo nano /etc/nginx/sites-available/pet-hotel
# Вставьте содержимое deploy/nginx-host.conf
# Замените YOUR_DOMAIN.com на ваш домен

sudo ln -s /etc/nginx/sites-available/pet-hotel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Запуск

```bash
cd /srv/pet-hotel
docker compose up -d --build
```

Проверка логов:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

## 9. Проверка

- Откройте https://yourdomain.com — должен открыться Pet Hotel
- Откройте https://yourdomain.com/api/health — должен вернуть `{"ok":true}`

## Обновление

```bash
cd /srv/pet-hotel
git pull
docker compose up -d --build
```

## Бэкап базы данных

```bash
docker exec pet-hotel-db pg_dump -U pethotel pet_hotel | gzip > backup_$(date +%Y%m%d).sql.gz
```

## Полезные команды

```bash
# Перезапустить только бэкенд
docker compose restart backend

# Войти в контейнер бэкенда
docker exec -it pet-hotel-backend sh

# Просмотр использования ресурсов
docker stats

# Остановить всё
docker compose down

# Остановить и удалить данные (ОСТОРОЖНО!)
docker compose down -v
```

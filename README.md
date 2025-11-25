# СистемаКонтроля - Микросервисная система управления задачами

Микросервисная система для управления задачами на строительных объектах, разработанная для ООО «СистемаКонтроля».

## Архитектура

Система состоит из трёх компонентов:

1. **API Gateway** (порт 3000) - единая точка входа, проксирование запросов, аутентификация, rate limiting
2. **Users Service** (порт 3001) - управление пользователями, регистрация, авторизация
3. **Orders Service** (порт 3002) - управление заказами, CRUD операции

## Стек технологий

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **База данных**: Supabase (PostgreSQL)
- **Логирование**: Pino
- **Валидация**: Zod
- **Аутентификация**: JWT (jsonwebtoken)
- **Контейнеризация**: Docker & Docker Compose

## Требования

- Node.js 20 или выше
- npm 9 или выше
- Docker и Docker Compose (для контейнеризации)
- Аккаунт Supabase

## Быстрый старт

### 1. Клонирование и установка зависимостей

```bash
# Установка зависимостей для всех сервисов
npm run install:all
```

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните необходимые переменные:

```env
# Supabase (получить из Supabase Dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (сгенерировать случайную строку)
JWT_SECRET=your-super-secret-jwt-key

# Environment
NODE_ENV=development
```

**Важно**: Для получения `SUPABASE_SERVICE_ROLE_KEY`:
1. Перейдите в [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Settings → API
4. Скопируйте `service_role` ключ

### 3. Настройка базы данных

База данных уже настроена через миграции Supabase. Таблицы `users` и `orders` созданы автоматически с правильными схемами и RLS политиками.

### 4. Запуск сервисов

#### Вариант A: Локальный запуск (для разработки)

Запустите каждый сервис в отдельном терминале:

```bash
# Терминал 1 - Users Service
npm run dev:users

# Терминал 2 - Orders Service
npm run dev:orders

# Терминал 3 - API Gateway
npm run dev:gateway
```

#### Вариант B: Docker Compose (рекомендуется)

```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### 5. Проверка работоспособности

Проверьте health endpoints:

```bash
# API Gateway
curl http://localhost:3000/health

# Users Service
curl http://localhost:3001/health

# Orders Service
curl http://localhost:3002/health
```

## Использование API

### Регистрация пользователя

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Иван Иванов"
  }'
```

### Вход в систему

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Сохраните полученный `token` для дальнейших запросов.

### Создание заказа

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "productName": "Цемент М500",
        "quantity": 10,
        "price": 500
      }
    ]
  }'
```

## Документация API

### OpenAPI спецификация

Полная спецификация API доступна в файле `docs/openapi.yaml`.

Вы можете импортировать её в:
- [Swagger Editor](https://editor.swagger.io/)
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)

### Postman коллекция

Готовая коллекция для тестирования находится в `docs/postman_collection.json`.

Импорт в Postman:
1. Откройте Postman
2. File → Import
3. Выберите файл `docs/postman_collection.json`

Коллекция содержит:
- Автоматическое сохранение токена после логина
- Тесты для проверки ответов
- Примеры всех основных операций

## Структура проекта

```
.
├── api-gateway/           # API Gateway
│   ├── src/
│   │   ├── config/        # Конфигурация
│   │   ├── middleware/    # Middleware (auth, rate limiting)
│   │   ├── proxy/         # Proxy конфигурация
│   │   └── index.js       # Точка входа
│   ├── Dockerfile
│   └── package.json
│
├── services/
│   ├── users/            # Сервис пользователей
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── validators/
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── orders/           # Сервис заказов
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── events/    # Доменные события
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── validators/
│       │   └── index.js
│       ├── Dockerfile
│       └── package.json
│
├── docs/
│   ├── openapi.yaml       # OpenAPI спецификация
│   └── postman_collection.json
│
├── docker-compose.yml
├── .env
└── README.md
```

## Функциональность

### Сервис пользователей

- ✅ Регистрация с валидацией данных
- ✅ Вход и выдача JWT токена
- ✅ Получение и обновление профиля
- ✅ Список пользователей (только для администраторов)
- ✅ Проверка прав доступа

### Сервис заказов

- ✅ Создание заказа с валидацией
- ✅ Получение заказа по ID
- ✅ Список заказов с пагинацией и фильтрами
- ✅ Обновление статуса заказа
- ✅ Отмена заказа
- ✅ Проверка прав владельца
- ✅ Публикация доменных событий

### API Gateway

- ✅ Проксирование на микросервисы
- ✅ JWT аутентификация на защищённых путях
- ✅ Rate limiting (защита от перегрузок)
- ✅ CORS настройка
- ✅ Прокидывание X-Request-ID
- ✅ Централизованное логирование

### Наблюдаемость

- ✅ Структурированное логирование (Pino)
- ✅ Трассировка запросов через X-Request-ID
- ✅ Health check endpoints
- ✅ Логирование событий создания/обновления заказов

## Роли и права доступа

### User (пользователь)
- Регистрация и вход
- Просмотр и редактирование своего профиля
- Создание своих заказов
- Просмотр и управление своими заказами

### Manager (менеджер)
- Все права User
- Просмотр всех заказов
- Обновление статуса любых заказов

### Admin (администратор)
- Все права Manager
- Просмотр списка всех пользователей

## Тестирование

### Чек-лист самопроверки

- [x] Регистрация создаёт пользователя и возвращает успешный ответ
- [x] Вход выдаёт JWT и последующие защищённые вызовы проходят
- [x] Профиль читается и обновляется с сохранением
- [x] Заказ создаётся, отображается, меняет статус, удаляется
- [x] Пользователь без прав не видит админские функции
- [x] Логи видны и содержат идентификатор запроса
- [x] Трассы собираются и показывают связку сервисов
- [x] Запуск в разных профилях работает

### Тест-кейсы (Postman)

Используйте коллекцию `docs/postman_collection.json`:

**Пользователи (оценка 3)**
- ✅ Успешная регистрация с валидными полями
- ✅ Повторная регистрация с той же почтой (ошибка)
- ✅ Вход с правильными данными (выдача токена)
- ✅ Доступ к защищённому пути без токена (отказ)

**Заказы (оценка 4)**
- ✅ Создание заказа для авторизованного пользователя
- ✅ Получение своего заказа
- ✅ Список своих заказов с пагинацией

**Права доступа (оценка 5)**
- ✅ Попытка обновить чужой заказ (отказ)
- ✅ Отмена собственного заказа

## Безопасность

- JWT токены для аутентификации
- Bcrypt для хеширования паролей
- Row Level Security (RLS) в Supabase
- Rate limiting для защиты от DDoS
- Валидация всех входных данных
- CORS настройка
- Использование service_role ключа только на бэкенде

## Окружения

Система поддерживает три профиля:

### Development (разработка)
```env
NODE_ENV=development
```

### Testing (тестирование)
```env
NODE_ENV=testing
```

### Production (продакшн)
```env
NODE_ENV=production
```

## Troubleshooting

### Проблема: "Missing Supabase configuration"

**Решение**: Убедитесь, что в `.env` файле указаны все необходимые переменные Supabase.

### Проблема: "Service unavailable" в Gateway

**Решение**:
1. Проверьте, что сервисы users и orders запущены
2. Проверьте переменные USERS_SERVICE_URL и ORDERS_SERVICE_URL в Gateway

### Проблема: "Invalid or expired token"

**Решение**:
1. Проверьте, что JWT_SECRET одинаковый во всех сервисах
2. Получите новый токен через `/api/v1/auth/login`

### Проблема: Docker контейнеры не запускаются

**Решение**:
```bash
# Пересоздать контейнеры
docker-compose down -v
docker-compose up --build
```

## Дополнительная информация

### Доменные события

Система публикует следующие события:
- `ORDER_CREATED` - при создании заказа
- `ORDER_STATUS_UPDATED` - при изменении статуса

События логируются и готовы к интеграции с брокером сообщений (RabbitMQ, Kafka) в будущих итерациях.

### Расширение системы

Для добавления нового микросервиса:
1. Создайте директорию в `services/`
2. Используйте структуру существующих сервисов
3. Добавьте proxy в API Gateway
4. Добавьте сервис в `docker-compose.yml`

## Контакты

ООО «СистемаКонтроля»

## Лицензия

UNLICENSED - проприетарное ПО

# Руководство по тестированию

## Минимальный набор тест-кейсов

### Пользователи (оценка 3)

#### 1. Успешная регистрация с валидными полями

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Тест Пользователь"
  }'
```

**Ожидаемый результат:**
- Статус: 201
- Ответ содержит `success: true`
- Возвращается созданный идентификатор пользователя

#### 2. Повторная регистрация с той же почтой

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Другой Пользователь"
  }'
```

**Ожидаемый результат:**
- Статус: 400
- Ответ: `success: false`
- Код ошибки: `EMAIL_EXISTS`

#### 3. Вход с правильными данными

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Ожидаемый результат:**
- Статус: 200
- Ответ содержит JWT токен
- Возвращаются данные пользователя

**Важно:** Сохраните токен из ответа для следующих тестов!

#### 4. Доступ к защищённому пути без токена

**Запрос:**
```bash
curl -X GET http://localhost:3000/api/v1/users/profile
```

**Ожидаемый результат:**
- Статус: 401
- Код ошибки: `UNAUTHORIZED`

---

### Заказы (оценка 4)

#### 5. Создание заказа для авторизованного пользователя

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [
      {
        "productName": "Цемент М500",
        "quantity": 10,
        "price": 500
      },
      {
        "productName": "Кирпич",
        "quantity": 1000,
        "price": 15.5
      }
    ]
  }'
```

**Ожидаемый результат:**
- Статус: 201
- Статус заказа: `created`
- Корректно рассчитана итоговая сумма (5000 + 15500 = 20500)

**Важно:** Сохраните ID заказа из ответа!

#### 6. Получение своего заказа

**Запрос:**
```bash
curl -X GET http://localhost:3000/api/v1/orders/ORDER_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Ожидаемый результат:**
- Статус: 200
- Возвращаются корректные данные заказа

#### 7. Список своих заказов с пагинацией

**Запрос:**
```bash
curl -X GET "http://localhost:3000/api/v1/orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Ожидаемый результат:**
- Статус: 200
- Ответ содержит массив `orders`
- Присутствует объект `pagination` с полями:
  - `page`, `limit`, `total`, `totalPages`
  - `hasNext`, `hasPrev`

---

### Права доступа (оценка 5)

#### 8. Попытка обновить чужой заказ

**Подготовка:**
1. Зарегистрируйте второго пользователя
2. Войдите под вторым пользователем (получите новый токен)
3. Попробуйте обновить заказ первого пользователя

**Запрос:**
```bash
curl -X PUT http://localhost:3000/api/v1/orders/FIRST_USER_ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SECOND_USER_TOKEN" \
  -d '{"status": "in_progress"}'
```

**Ожидаемый результат:**
- Статус: 403
- Код ошибки: `FORBIDDEN`

#### 9. Отмена собственного заказа

**Запрос:**
```bash
curl -X DELETE http://localhost:3000/api/v1/orders/YOUR_ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
- Статус: 200
- Статус заказа изменён на `cancelled`
- Отсутствуют побочные эффекты (заказ остаётся в БД)

#### 10. Проверка невозможности отмены отменённого заказа

**Запрос:**
```bash
curl -X DELETE http://localhost:3000/api/v1/orders/CANCELLED_ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
- Статус: 400
- Код ошибки: `INVALID_STATUS`

---

## Автоматизированное тестирование через Postman

### Импорт коллекции

1. Откройте Postman
2. Нажмите **Import**
3. Выберите файл `docs/postman_collection.json`
4. Коллекция загрузится со всеми тестами

### Запуск всех тестов

1. Выберите коллекцию "СистемаКонтроля API"
2. Нажмите **Run**
3. Выберите все запросы
4. Нажмите **Run СистемаКонтроля API**

### Автоматические проверки

Коллекция включает автоматические тесты, которые:
- Проверяют статус-коды ответов
- Валидируют структуру JSON
- Сохраняют токены и ID автоматически
- Проверяют бизнес-логику

---

## Проверка логирования и трассировки

### Просмотр логов в Docker

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f api-gateway
docker-compose logs -f users-service
docker-compose logs -f orders-service
```

### Проверка X-Request-ID

**Запрос с кастомным ID:**
```bash
curl -X GET http://localhost:3000/health \
  -H "X-Request-ID: test-12345" -v
```

**Проверка:**
- В ответе должен быть заголовок `X-Request-ID: test-12345`
- В логах всех сервисов должен быть `requestId: test-12345`

### Проверка событий

**Создайте заказ и проверьте логи:**
```bash
docker-compose logs orders-service | grep "Event published"
```

Должны быть события:
- `ORDER_CREATED`
- `ORDER_STATUS_UPDATED`

---

## Проверка Rate Limiting

**Запустите 101 запрос подряд:**

```bash
for i in {1..101}; do
  curl -X GET http://localhost:3000/health -w "\nStatus: %{http_code}\n"
  sleep 0.1
done
```

**Ожидаемый результат:**
- Первые 100 запросов: статус 200
- 101-й запрос: статус 429 (Too Many Requests)

---

## Проверка безопасности

### JWT токен с истёкшим сроком

1. Используйте токен, созданный более 7 дней назад
2. Попробуйте получить профиль

**Ожидаемый результат:**
- Статус: 403
- Сообщение: "Invalid or expired token"

### SQL Injection защита

**Попытка инъекции в email:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com OR 1=1--",
    "password": "anything"
  }'
```

**Ожидаемый результат:**
- Статус: 401 (не должно пройти)

---

## Нагрузочное тестирование (опционально)

Используйте Apache Bench (ab) или аналогичные инструменты:

```bash
# 1000 запросов, 10 параллельных соединений
ab -n 1000 -c 10 http://localhost:3000/health
```

Проверьте:
- Среднее время ответа
- Rate limiting срабатывает корректно
- Нет падений сервисов

---

## Чек-лист перед сдачей

- [ ] Все 10 тест-кейсов пройдены
- [ ] Postman коллекция импортирована и запущена
- [ ] Логи содержат X-Request-ID
- [ ] События ORDER_CREATED и ORDER_STATUS_UPDATED логируются
- [ ] Rate limiting работает (429 после 100 запросов)
- [ ] Health endpoints отвечают 200
- [ ] Docker compose запускается без ошибок
- [ ] OpenAPI спецификация валидна

---

## Получение помощи

Если тест не проходит:

1. Проверьте логи соответствующего сервиса
2. Убедитесь, что все env переменные заданы
3. Проверьте, что Supabase настроен корректно
4. Перезапустите сервисы: `docker-compose restart`

Для детальной отладки добавьте в `.env`:
```
LOG_LEVEL=debug
```

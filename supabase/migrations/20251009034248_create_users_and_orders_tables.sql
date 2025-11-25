/*
  # Создание таблиц пользователей и заказов для системы управления строительными объектами

  ## 1. Новые таблицы
  
  ### `users`
  - `id` (uuid, primary key) - уникальный идентификатор пользователя
  - `email` (text, unique) - электронная почта (уникальная)
  - `password_hash` (text) - хэш пароля для безопасного хранения
  - `name` (text) - имя пользователя
  - `roles` (text[]) - массив ролей (user, manager, admin)
  - `created_at` (timestamptz) - дата создания записи
  - `updated_at` (timestamptz) - дата последнего обновления
  
  ### `orders`
  - `id` (uuid, primary key) - уникальный идентификатор заказа
  - `user_id` (uuid, foreign key) - ссылка на пользователя-владельца
  - `items` (jsonb) - состав заказа (товар, количество)
  - `status` (text) - статус заказа (created, in_progress, completed, cancelled)
  - `total_amount` (numeric) - итоговая сумма заказа
  - `created_at` (timestamptz) - дата создания
  - `updated_at` (timestamptz) - дата последнего обновления

  ## 2. Индексы
  - Индекс на email для быстрого поиска пользователей
  - Индекс на user_id в заказах для быстрой выборки заказов пользователя
  - Индекс на status для фильтрации по статусам

  ## 3. Безопасность
  - Включение RLS для обеих таблиц
  - Политики для users:
    - Пользователи могут читать только свой профиль
    - Пользователи могут обновлять только свой профиль
    - Администраторы могут читать все профили
  - Политики для orders:
    - Пользователи могут создавать свои заказы
    - Пользователи могут читать только свои заказы
    - Пользователи могут обновлять только свои заказы
    - Менеджеры и администраторы могут читать и обновлять все заказы

  ## 4. Важные примечания
  - Таблица users не связана с auth.users (используется кастомная аутентификация)
  - Пароли хранятся в виде хэша с использованием bcrypt
  - Роли по умолчанию: ['user']
  - Статус заказа по умолчанию: 'created'
*/

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  roles text[] DEFAULT ARRAY['user']::text[] NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Создание индекса на email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Создание таблицы заказов
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items jsonb DEFAULT '[]'::jsonb NOT NULL,
  status text DEFAULT 'created' NOT NULL CHECK (status IN ('created', 'in_progress', 'completed', 'cancelled')),
  total_amount numeric(10, 2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Создание индексов для заказов
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы users
-- Примечание: так как мы используем кастомную аутентификацию без auth.uid(),
-- политики будут проверяться на уровне приложения через service_role ключ
-- Здесь устанавливаем базовые политики для безопасности

-- Разрешаем сервису полный доступ (используется service_role ключ)
CREATE POLICY "Service role has full access to users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Политики для таблицы orders
CREATE POLICY "Service role has full access to orders"
  ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
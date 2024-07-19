## Развертывание
Из корня проекта:

1. `docker-compose up` - поднимется бэк, бд, redis и websocket-сервис

2. `docker-compose exec app alembic revision` - создастся ревизия для бд

    `Generating /code/migrations/versions/bf7d48b18bc4_.py ...  done` 
    - название миграции - `bf9d48b18bc4`

3. `docker-compose exec app alembic upgrade ${название миграции}` - накатится миграция в бд

    - `${название миграции}` берем из предыдущего шага
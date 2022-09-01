# Curso de NestJS Persistencia de Datos con TypeORM

## Configuración, presentación del proyecto e instalación

  **Nuestras variavles de entorno**
  ```bash
  # .env, .stag.env, .prod.env
  DATABASE_NAME=my_db
  DATABASE_PORT=1000
  API_KEY='4321'
  PORT=3000
  ```

  **Arrancamos el proyecto**
  ```bash
  npm run start:dev
  ```

## Configuración de PostgresSQL en Docker
  Debemos tener la extension [YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) en nuestro Visual Studio Code

  Archivos:
  ```bash
  # .gitignore
  *.env
  /postgres_data
  ```
  ```yaml
  # docker-compose.yml
  version: '3.3'

  services:
    postgres:
      image: postgres:13
      environment:
      - POSTGRES_DB=my_db
      - POSTGRES_USER=root
      - POSTGRES_PASSWORD=123456
      ports:
        - '5432:5432'
      volumes:
        - ./postgres_data:/var/lib/postgresql/data
  ```

  Comandos:
  ```bash
  docker-compose up -d postgres
  docker-compose ps
  docker-compose down
  ```
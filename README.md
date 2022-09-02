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

## Explorando postgres con interfaces gráficas y terminal

  **Terminal**

  Comandos:
  ```bash
  #Vemos si el contenedor esta encendido
  docker-compose ps
  #Ver el log del contenedor como esta corriendo
  docker-compose logs -f postgres
  #Entramos al contenedor
  docker-compose exec postgres bash
  #Vemos la estructura del contenedor de que se compone
  ls
  #conexion a la base de datos
  psql -h localhost -d my_db -U root
  #Dentro de la base de datos podemos ver su estructura
  \d+
  #salir de la base de datos
  \q
  #salir del contenedor
  exit
  ```

  **Gráfica**

  - [pgAdmin](https://www.pgadmin.org/) para administración PostgreSQL.

    Archivos:
    ```yaml
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

      pgadmin:
        image: dpage/pgadmin4
        environment:
        - PGADMIN_DEFAULT_EMAIL=root@admin.com
        - PGADMIN_DEFAULT_PASSWORD=root
        ports:
          - "5050:80"
    ```
    Comandos:
    ```bash
    #levantamos nuestro servicio de pyadmin
    docker-compose up -d pgadmin
    #nuestros servicios
    docker-compose ps
    #id del contenedor
    docker ps
    #ver la ip que asignaron al contenedor
    docker inspect "id_container"
    
    ```
    En el navegador nos conectamos al ***localhost:5050*** donde se encuentra el pgadmin.

  - [DBeaver](https://dbeaver.io/)  puede centralizar todas las bases de datos.
  ![](https://static.platzi.com/media/user_upload/2021-05-20_23-55-e11fabca-3b1a-4e1c-8f54-10cf499b8f1a.jpg)

  Creamos nuestra table:
  ```bash
  CREATE TABLE tasks (
    id serial PRIMARY KEY,
    title VARCHAR ( 255 ) NOT NULL,
    completed boolean DEFAULT false
  );
  ```

## Integración de node-postgres con NestJS
  Conexion de NestJS con la base de datos que se encuentra en Postgres utilizando el driver node para postgres **[node-postgres](https://node-postgres.com/)** y su tipado.

  Instalación:
  ```bash
  #node-postgres
  npm install pg
  #tipado
  npm i @types/pg -D
  ```

## Conexión como inyectable y ejecutando un SELECT
  - Múltiples motores de bases de datos relacionales usaremos [sequelize](https://www.npmjs.com/package/sequelize)
  - [TypeORM](https://typeorm.io/)
  - http://localhost:3000/tasks

  Archivos:
  ```typescript
  // src/database/database.module.ts
  import { Client } from 'pg';

  const client = new Client({  // 👈 client
    user: 'root',
    host: 'localhost',
    database: 'my_db',
    password: '123456',
    port: 5432,
  });

  client.connect();
  ...

  @Global()
  @Module({
    providers: [
      ...
      {
        provide: 'PG',
        useValue: client, // 👈 provider as value
      },
    ],
    exports: ['API_KEY', 'PG'], // 👈 add in exports
  })
  export class DatabaseModule {}
  ```
  ```typescript
  // src/app.service.ts
  import { Client } from 'pg';
  @Injectable()
  export class AppService {
    constructor(
      @Inject('PG') private clientPg: Client, // 👈 inject PG
      ...
    ) {}

    getTasks() { // 👈 new method
      return new Promise((resolve, reject) => {
        this.clientPg.query('SELECT * FROM tasks', (err, res) => {
          if (err) {
            reject(err);
          }
          resolve(res.rows);
        });
      });
    }
  }
  ```
  ```typescript
  // src/app.controller.ts
  @Controller()
  export class AppController {

    @Get('tasks') // 👈 new endpoint
    tasks() {
      return this.appService.getTasks();
    }
  }
  ```
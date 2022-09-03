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

## Usando variables de ambiente
  Las variables de entorno son cadenas que contienen información acerca del entorno para el sistema y el usuario que ha iniciado sesión en ese momento. Algunos programas de software usan la información para determinar dónde se colocan los archivos (como los archivos temporales).

  **http://localhost:3000/users/tasks**

  ```bash
  #en los soiguientes archivos .env, .stag.env, .prod.env
  POSTGRES_DB=my_db
  POSTGRES_USER=nico
  POSTGRES_PASSWORD=postgres
  POSTGRES_PORT=5432
  POSTGRES_HOST=localhost
  ```
  ```typescript
  // src/config.ts
  import { registerAs } from '@nestjs/config';
  export default registerAs('config', () => {
    return {
      database: {
        name: process.env.DATABASE_NAME,
        port: process.env.DATABASE_PORT,
      },
      postgres: { // 👈 add config
        dbName: process.env.POSTGRES_DB,
        port: parseInt(process.env.POSTGRES_PORT, 10),
        password: process.env.POSTGRES_PASSWORD,
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST,
      },
      apiKey: process.env.API_KEY,
    };
  });
  ```
  ```typescript
  // src/database/database.module.ts
  import { ConfigType } from '@nestjs/config';
  import config from '../config';

  @Global()
  @Module({
    providers: [
      ...
      {
        provide: 'PG', 
        useFactory: (configService: ConfigType<typeof config>) => { // 👈 
          const { user, host, dbName, password, port } = configService.postgres;
          const client = new Client({
            user,
            host,
            database: dbName,
            password,
            port,
          });
          client.connect();
          return client;
        },
        inject: [config.KEY],
      },
    ],
    exports: ['API_KEY', 'PG'],
  })
  export class DatabaseModule {}
  ```
  ```typescript
  // src/users/services/users.service.ts
  import { Client } from 'pg';
  @Injectable()
  export class UsersService {
    constructor(
      ...,
      @Inject('PG') private clientPg: Client, // 👈 inject PG
    ) {}

    getTasks() {
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
  // src/users/controllers/users.controller.ts
  @Controller('users')
  export class UsersController {
    
    @Get('tasks') // 👈 new endpoint
    getTasks() {
      return this.usersService.getTasks();
    }

  }
  ```

## Usando variables de ambiente
  ORM (Object Relational Mapping) es una técnica de programación que nos ayuda a manipular y consultar la información almacenada dentro de una base de datos usando programación orientada a objetos. Un ORM se encarga de la conexión y también de manejar todo con base en modelos o entidades.

  Una principal característica de un ORM es que hace más transparente las conexiones a PostgreSQL y MySQL, además nos protege de algunas vulnerabilidades de SQL y facilita algunas validaciones a la información.

  Un ORM - Object Relational Mapping o Mapeador de Objetos Relacionales - es un modelo de programación que nos permite mapear las estructuras de una base de datos relacional y vincularla a entidades lógicas.

  ### Para qué sirve un ORM
  Como esto es una abstracción, no vamos a tener que ejecutar código SQL directamente para hacer una búsqueda, una inserción o una actualización. La ORM va a dar métodos muy prácticos para utilizarlo dentro de nuestro código.

  Un ORM nos ayuda en la extracción de código complejo SQL, sin embargo, nunca esta de mas que en verdad sepas cómo hacer tus propias consultas SQL en caso de que necesites una consulta muy potente o avanzada.

  ### Instalando [TypeORM](https://typeorm.io/)
  TypeORM está desarrollado con typescript, así que la integración con NestJS va a hacer buena.

  Podemos usar: 
  - [TypeORM Integration with NestJS][https://docs.nestjs.com/techniques/database] o
  - [SQL (Sequelize) in NestJS][https://docs.nestjs.com/recipes/sql-sequelize]

  Para hacer la integración, lo primero que debes hacer es instalar la dependencia
  ```bash
  npm install --save @nestjs/typeorm typeorm
  ```
  ```typescript
  // src/database/database.module.ts
  import { TypeOrmModule } from '@nestjs/typeorm'; // 👈 import

  @Global()
  @Module({
    imports: [
      TypeOrmModule.forRootAsync({ // 👈 use TypeOrmModule
        inject: [config.KEY],
        useFactory: (configService: ConfigType<typeof config>) => {
          const { user, host, dbName, password, port } = configService.postgres;
          return {
            type: 'postgres',
            host,
            port,
            username: user,
            password,
            database: dbName,
          };
        },
      }),
    ],
    ...
    exports: ['API_KEY', 'PG', TypeOrmModule], // 👈 add in exports
  })
  export class DatabaseModule {}
  ```

## Creando tu primera entidad
  TypeORM es compatible con todos los tipos de columnas compatibles con bases de datos más utilizados. Los tipos de columna son específicos del tipo de base de datos; esto proporciona más flexibilidad sobre cómo se verá el esquema de su base de datos.

  - [Column types][https://typeorm.io/entities#column-types]
  - [Active Record vs Data Mapper](https://typeorm.io/active-record-data-mapper)
  - [Entities](https://typeorm.io/entities)

  ```typescript
  // src/products/entities/product.entity.ts
  import { PrimaryGeneratedColumn, Column, Entity } from 'typeorm';

  @Entity()
  export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true })
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'int' })
    price: number;

    @Column({ type: 'int' })
    stock: number;

    @Column({ type: 'varchar' })
    image: string;
  }
  ```
  ```typescript
  // src/products/products.module.ts
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { Product } from './entities/product.entity';

  @Module({
    imports: [TypeOrmModule.forFeature([Product])], // 👈 Include entitites
    controllers: [ProductsController, CategoriesController, BrandsController],
    providers: [ProductsService, BrandsService, CategoriesService],
    exports: [ProductsService],
  })
  export class ProductsModule {}
  ```
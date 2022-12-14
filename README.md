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

## TypeORM: [Active Record vs. Data Mapper Pattern](https://orkhan.gitbook.io/typeorm/docs/active-record-data-mapper)

  - **Active Record**

  En el enfoque de TypeORM Active Record, definimos todos los métodos de consulta dentro de la propia clase del modelo . En otras palabras, podemos realizar operaciones CRUD directamente utilizando métodos modelo. 

  - **Data Mapper Pattern** la cual usaremos separando responsabilidades

  El patrón TypeORM Data Mapper también se conoce como el patrón Repository . En este patrón, definimos todos los métodos de consulta en clases separadas. Estas clases se conocen como repositorios. 

  **Archivos**
  ```typescript
  // src/products/services/products.service.ts
  import { InjectRepository } from '@nestjs/typeorm'; // 👈 import
  import { Repository } from 'typeorm'; // 👈 import
  import { Product } from './../entities/product.entity'; // 👈 entity
  import { CreateProductDto, UpdateProductDto } from './../dtos/products.dtos';

  @Injectable()
  export class ProductsService {
    constructor(
      @InjectRepository(Product) private productRepo: Repository, // 👈 Inject
    ) {}

    findAll() {
      return this.productRepo.find();  // 👈 use repo
    }

    findOne(id: number) {
      const product = this.productRepo.findOne(id);  // 👈 use repo
      if (!product) {
        throw new NotFoundException(`Product #${id} not found`);
      }
      return product;
    }
    ...
  }
  ```

  ```typescript
  // src/users/services/users.service.ts
  async getOrderByUser(id: number) {
    const user = this.findOne(id);
    return {
      date: new Date(),
      user,
      products: await this.productsService.findAll(),
    };
  }
  ```

  ```typescript
  // src/database/database.module.ts
  @Global()
  @Module({
    imports: [
      TypeOrmModule.forRootAsync({
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
            synchronize: true, // 👈 new attr
            autoLoadEntities: true, // 👈 new attr
          };
        },
      }),
    ],
    ...
  })
  export class DatabaseModule {}
  ```

## Crear, actualizar y eliminar
  Creación, actulización y eliminar un nuevo producto.
  Todas las operaciones CRUD.

## Cambiar a Mysql demo (opcional)
  La configuracion para mysql es la siguiente y de phpmyadmin:
  ```bash
  docker-compose up -d phpmyadmin
  #detener un contenedor
  docker stop "id_container"
  #ver los contenedores solo del proyecto
  docker-compose ps
  #instalamos driver de mysql
  npm i mysql2
  ```
  ```yaml
  #docker-compose.yml
  mysql:
    image: mysql:5
    environment:
     - MYSQL_DATABASE=my_db
     - MYSQL_USER=root
     - MYSQL_ROOT_PASSWORD=123456
    ports:
      - '3306:3306'
    volumes:
      - ./mysql_data:/var/lib/mysql

  phpmyadmin:
    image: phpmyadmin/phpmyadmin
    environment:
     - MYSQL_ROOT_PASSWORD=123456
     - PMA_HOST=mysql
    ports:
      - '8080:80'
    depends_on:
      - mysql
  ```
  Probamos nuestro PHPMyAdmin:
  ```bash
  http://localhost:8080/
  ```

## Sync Mode vs. Migraciones en TypeORM
  
  - [Migrations](https://docs.djangoproject.com/en/3.2/topics/migrations/)
  - [Database: Migrations](https://laravel.com/docs/9.x/migrations)
  - [How migrations work](https://typeorm.io/migrations)

  Formas de controlar los cambios en la base de datos
  
  ### Sync Mode
  flag <code>synchronize: true</code> esto hace que los cambios que hagamos sobre nuestro modelo de clases impacte directamente en las tablas.
  recomendaciones

  Solo sobre entorno de desarrollo y testing. En produccion es una practica riesgosa, porque cualquier cambio en el codigo, se pueda corromper la base de datos. Para eso se crearon las migraciones

  ### Django
  Dice que las migraciones es la forma que django propaga los modelos a las bases de datos
  
  ### Laravel
  Son como un control de version de la bd permitiendo que el equipo pueda definir y compartir el esquema de la base de datos.
  
  ### TypeORM
  Las migraciones son solo un con query tipo sql con el esquema y los cambios aplicados (updates).

## Configurando migraciones y npm scripts
  Configuración:
  ```typescript
  #creamos el archivo "data.source.ts" dentro de src/database/
  import { DataSource } from 'typeorm';

  export const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'root',
    password: '123456',
    database: 'my_db',
    logging: true,
    synchronize: false,
    entities: ['src/**/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
  });
  ```

  Script:
  ```json
  #dentro del package.json añadimos los siguientes scripts
  "scripts":{
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data.source.ts",
    "migration:generate": "npm run typeorm migration:generate src/database/migrations/migration"
  }

  Terminal:
  ```bash
  #comandos en la terminal para generar nuestra migracion
  npm run migration:run
  ```

## Corriendo migraciones
  Script dentro de package.json:
  ```json
  "scripts":{
    #reemplazar node-commonjs por node-esm
    "typeorm": "typeorm-ts-node-esm -d src/database/data.source.ts",
    "migration:run": "npm run typeorm migration:run",
    "migration:show": "npm run typeorm migration:show",
    #no usar con cuidado drop lo borra todo
    "migration:drop": "npm run typeorm migration:drop",
    "migration:revert": "npm run typeorm migration:revert"
  }
  ```

  Dentro de nuestro archivo de data.source.ts desactivemos la opcion de synchronize,
  lo cual solo trabajaremos por medio de migraciones que cada cambio realizamos sincroniza 
  el modelo de forma automatica.
  ```typescript
  return {
    ...
    synchronize: false,
    ...
  }
  ```
  Comandos en la terminal:
  ```bash
  #generamos nuestra migracion
  npm run migration:generate
  #corremos nuestra migracion, al ejecutar nuevamente solo correran las nuevas migraciones
  npm run migration:run
  #observamos la migracion corrio correctamente
  npm run migration:show
  ```

## Modificando una entidad
  Dentro de nuestro archivo product.entity añadireños un par de campos
  el cual enviaremos los cambios atraves de migraciones.
  ```typescript
  import { 
    PrimaryGeneratedColumn, 
    Column, 
    Entity, 
    CreateDateColumn, 
    UpdateDateColumn 
  } from 'typeorm';

  @Entity()
  export class Product {
    ...
    @CreateDateColumn({
      type: 'timestamptz',
      default: () => 'CURRENT_TIMESTAMP',
    })
    createAt: Date;

    @UpdateDateColumn({
      type: 'timestamptz',
      default: () => 'CURRENT_TIMESTAMP',
    })
    updateAt: Date;
  }
  ```

  Comandos terminal:
  ```bash
  #generamos nuestra nueva migracion
  npm run migration:generate src/database/migrations/add-fields
  #corremos las migraciones
  npm run migration:run
  #verificamos
  npm run migration:show
  ``` 

## Relaciones uno a uno: Dentro de las entidades de User y Customer
  Uno a uno es una relación donde A contiene solo una instancia de B y B contiene solo una instancia de A. Tomemos por ejemplo User y Customer. El user puede tener un solo customer, y un solo customer es propiedad de un solo user.

  @JoinColumn(): Solo debe ir a un lado maneja la referencia dentro de la base de datos, el
  cual va cargar con la relacion en este caso en user.entity

  Nueva migracion para user y customer:
  ```bash
  #generasmos la migracion
  npm run migration:generate src/database/migrations/create-user-customer
  #la corremos
  npm run migration:run
  ```

  Conectandonos al contener:
  ```bash
  #al contenedor
  docker-compose exec postgres bash
  #a la base de datos
  psql -h localhost -d my_db -U root
  #ver una tabla en especifico
  \d+ user
  ```

## Resolviendo la relación uno a uno en el controlador
  Creamos una nueva migracion para los cambios realizados:
  ```bash
  npm run migration:generate src/database/migrations/fix-ids
  npm run migration:run
  ```

  Nos movemos a insomia o postman creamos usarios con los cambios realizados.

## Relaciones uno a muchos una Marca a muchos Productos
  Muchos a uno / uno a muchos es una relación en la que A contiene varias instancias de B, pero B contiene solo una instancia de A. Tomemos por ejemplo Marca y Prodcutos. La marca puede tener varios productos. 

  - [Many-to-one / one-to-many relations](https://typeorm.io/many-to-one-one-to-many-relations)

  Generamos nueva migración
  ```bash
  npm run migration:generate src/database/migrations/brand-to-products
  npm run migration:run

  #al contenedor
  docker-compose exec postgres bash
  #a la base de datos
  psql -h localhost -d my_db -U root
  #ver una tabla en especifico
  \d+ user
  ```

## Resolviendo la relación uno a muchos en el controlador
  Saber todos los productos que tiene una marca, tambien el producto tiene relacion hacia la marca.

## Relaciones muchos a muchos 
  [Many-to-many](https://typeorm.io/many-to-many-relations) es una relación en la que A contiene varias instancias de B y B contiene varias instancias de A. Tomemos por ejemplo un producto puede tener varias categorías y cada categoría puede tener varios productos. 

  La relacion entre las tablas se establece una tabla terniaria en ese ejemplo se llama
  **product_categories_category** contiene los ids.

  Generamos nuestra migración:
  ```bash
  #generasmos la migracion
  npm run migration:generate src/database/migrations/products-tomany-categories
  #la corremos
  npm run migration:run
  ```

## Resolviendo la relación muchos a muchos en el controlador
  Manipulacion en en los controladores.
  Resolver el problema de findByIds que las nuevas versiones no buena practica

## Manipulación de arreglos en relaciones muchos a muchos
  - Remover una categoría de un producto
    ```bash
    # delete category by product
    http://localhost:3000/products/7/category/2
    ```
  - Agregar categoría a un producto
    ```bash
    # add category to product
    http://localhost:3000/products/7/category/1
    ```

## Relaciones muchos a muchos personalizadas
  Tenemos nuestra orden de compra, donde una orden tiene muchos programas asi como muchos productos pueden pertenecer a una orden de compra usariamos many to many,
  que pasa si en la tabla terniaria queremos agregarle un atributo mas por ejemplo la cantidad cada producto **"producto A = total, producto B = total"** necisitaremos campos customizados creando una nueva entidad. En la orden de compra.

  Creamos una nueva migracion:
  ```bash
  npm run migration:generate src/database/migrations/orders
  npm run migration:run
  ```
  Si queremos agregar mas campos a una tabla terniaria debemos añadirlo uno mismo.

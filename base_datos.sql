CREATE TABLE persona (
 id SERIAL PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL,
 correo VARCHAR(150) NOT NULL,
 direccion VARCHAR(250),
 celular BIGINT UNIQUE
);
CREATE TABLE persona_natural (
    id SERIAL PRIMARY KEY,
    id_persona INTEGER REFERENCES persona(id),
    apellido VARCHAR(250) NOT NULL,
    cedula VARCHAR(80),
    fecha_nacimiento DATE,
    genero CHAR,
    tipo_persona VARCHAR(50)
);

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    id_persona INTEGER REFERENCES persona(id),
    codigo VARCHAR(50),
    tipo_cliente VARCHAR(250) NOT NULL,
    foto VARCHAR(250) ,
    estado INTEGER
);


CREATE TABLE trabajador
(
    id SERIAL primary key,
    id_persona INTEGER REFERENCES persona(id),
    foto VARCHAR(250) ,
    estado INTEGER 
);


CREATE TABLE salario
( 
    id SERIAL PRIMARY KEY,
    id_trabajador INTEGER REFERENCES trabajador(id),
    salario_actual NUMERIC(10,2) NOT NULL,
    salario_anterior NUMERIC(10,2),
    estado INTEGER
);

CREATE TABLE categoria_producto
(
    id SERIAL PRIMARY KEY ,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(250),
    estado INTEGER
);

CREATE TABLE sub_categoria_producto(
    id SERIAL PRIMARY KEY,
    id_categoria INTEGER REFERENCES categoria_producto(id),
    nombre VARCHAR(250) NOT NUll,
    descripcion VARCHAR(250),
    estado INTEGER
);

CREATE TABLE producto
(
    id SERIAL PRIMARY KEY,
    id_sub_categoria INTEGER REFERENCES sub_categoria_producto(id),
    nombre VARCHAR(120) NOT NULL,
    descripcion varchar(250) NOT NULL,
    logo VARCHAR(250),
    estado INTEGER
);
CREATE TABLE lote_producto
(
    id SERIAL PRIMARY KEY,
    id_producto INTEGER REFERENCES producto(id),
    numero_lote VARCHAR(50) NOT NULL,
    fecha_vencimiento DATE,
    cantidad INTEGER NOT NULL,
    estado INTEGER
);

CREATE TABLE movimiento_inventario
(
    id SERIAL PRIMARY KEY,
    id_lote INTEGER REFERENCES lote_producto(id),
    tipo_movimiento VARCHAR(20) NOT NULL,
    cantidad INTEGER NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE precio(
    id SERIAL PRIMARY KEY,
    id_producto INTEGER REFERENCES producto(id),
    precio NUMERIC(10,2) NOT NULL,
    estado INTEGER
);

CREATE TABLE horarios (
    id SERIAL PRIMARY KEY,
    dia VARCHAR(255) NOT NULL,
    hora_apertura TIME,
    hora_cierre TIME ,
    estado INTEGER NOT NULL
);
CREATE TABLE servicios(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(250),
    foto VARCHAR(250),
    estado INTEGER
);

CREATE TABLE precio_servicios(
    id SERIAL PRIMARY KEY,
    id_servicios INTEGER REFERENCES servicios(id),
    precio NUMERIC(10,2) NOT NULL,
    estado INTEGER
);

CREATE TABLE reservacion(
    id SERIAL PRIMARY KEY,
    idcliente INTEGER REFERENCES clientes(id),
    idhorario INTEGER REFERENCES horarios(id),
    idservicio INTEGER REFERENCES servicios(id),
    codigo VARCHAR(50) unique,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    subtotal DECIMAL(10,2),
    observacion VARCHAR(250),
    estado INTEGER 
);

CREATE TABLE tipo_venta (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(250) NOT NUll,
    descripcion VARCHAR(250),
    estado INTEGER
);

CREATE TABLE venta(
    id SERIAL PRIMARY KEY,
    id_tipo INTEGER REFERENCES tipo_venta(id),
    id_cliente INTEGER REFERENCES clientes(id),
    codigo VARCHAR(255),
    tipo_entrega VARCHAR(5000),
    fecha DATE,
    fecha_entrega DATE,
    descuento NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    estado INTEGER
);


CREATE TABLE detalle_venta
(
    id SERIAL PRIMARY KEY,
    id_venta INTEGER REFERENCES venta(id),
    id_servicio INTEGER REFERENCES servicios(id),
    precio_unitario NUMERIC NOT NULL,
    cantidad INTEGER NOT NULL,
    subtotal numeric NOT NULL
);


CREATE TABLE venta_servicios(
    id SERIAL PRIMARY KEY,
    id_venta INTEGER REFERENCES venta(id),
    id_reservacion INTEGER REFERENCES reservacion(id),
    subtotal numeric NOT NUll 
);

CREATE TABLE modulo(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(250),
    icono VARCHAR(500),
    estado INTEGER 
);

CREATE TABLE sub_modulo(
    id SERIAL PRIMARY KEY,
    id_modulo INTEGER REFERENCES modulo(id),
    nombre VARCHAR(250) NOT NUll,
    enlace VARCHAR(500)NOT NULL
);



CREATE TABLE grupo_usuarios
(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(250) NOT NULL,
    estado INTEGER 
);


CREATE TABLE usuario
(
    id SERIAL PRIMARY KEY,
    id_grupo INTEGER REFERENCES grupo_usuarios(id),
    id_persona INTEGER REFERENCES persona(id),
    usuario VARCHAR(200) NOT NULL,
    contraseña VARCHAR(250) NOT NULL,
    estado INTEGER 
);


CREATE TABLE privilegio_modulo(
    id SERIAL PRIMARY KEY,
    id_sub INTEGER REFERENCES sub_modulo(id),
    id_usuario INTEGER REFERENCES usuario(id),
    fecha_registro DATE DEFAULT NOW()
);


CREATE TABLE permiso(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(250)
);


CREATE TABLE permiso_modulo (
    id SERIAL PRIMARY KEY,
    id_permiso INTEGER REFERENCES permiso(id),
    id_modulo INTEGER REFERENCES modulo(id)
);


CREATE TABLE permiso_usuario(
    id SERIAL PRIMARY KEY,
    id_permiso_modulo INTEGER REFERENCES permiso_modulo(id),
    id_usuario INTEGER REFERENCES usuario(id)
);

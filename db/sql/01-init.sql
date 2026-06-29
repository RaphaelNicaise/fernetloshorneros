CREATE DATABASE IF NOT EXISTS db_fernetloshorneros;
USE db_fernetloshorneros;

CREATE TABLE IF NOT EXISTS usuario_lista_espera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    provincia VARCHAR(100) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255) NOT NULL,
    limite INT NOT NULL DEFAULT 0, -- 0 significa sin limite
    stock INT NOT NULL DEFAULT 0,
    status ENUM('disponible','proximamente','agotado') NOT NULL DEFAULT 'disponible'
);

CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    external_reference VARCHAR(100), -- Aquí guardaremos un UUID o referencia única si quieres
    cupon_codigo VARCHAR(50) DEFAULT NULL,
    cupon_descuento DECIMAL(10, 2) DEFAULT 0,
    stock_reserved BOOLEAN DEFAULT FALSE,
    stock_reserved_at TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS pedido_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto VARCHAR(50) NOT NULL, -- ID original del producto
    title VARCHAR(255), -- Guardamos el nombre por si cambia el producto original
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    mp_payment_id VARCHAR(50) NOT NULL, -- ID de pago que te da MercadoPago
    status VARCHAR(50) NOT NULL, -- 'approved', 'rejected', etc.
    payment_method VARCHAR(50), -- 'credit_card', 'account_money', etc.
    total DECIMAL(10, 2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id)
);

CREATE TABLE IF NOT EXISTS envios (
    id VARCHAR(30) PRIMARY KEY, -- ID corto generado para external_id de Zipnova
    id_pedido INT NOT NULL,
    rate_id VARCHAR(100) DEFAULT 'correo-argentino-fijo', -- ID de la tarifa (ahora manual)
    service_type VARCHAR(50) DEFAULT 'standard_delivery', -- tipo de servicio (ahora siempre standard_delivery)
    logistic_type VARCHAR(50) DEFAULT NULL, -- legacy Zipnova
    carrier_id INT DEFAULT NULL, -- legacy Zipnova
    point_id VARCHAR(100) DEFAULT NULL, -- legacy Zipnova
    costo DECIMAL(10, 2) NOT NULL,
    -- Datos de dirección
    provincia VARCHAR(100),
    ciudad VARCHAR(100),
    codigo_postal VARCHAR(10),
    direccion VARCHAR(255),
    numero VARCHAR(20),
    extra VARCHAR(255), -- piso, depto, observaciones
    nombre_cliente VARCHAR(100) NOT NULL,
    email_cliente VARCHAR(100) NOT NULL,
    dni_cliente VARCHAR(20) NOT NULL,
    telefono_cliente VARCHAR(30) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'to_ship', 'shipped', 'cancelled'
    tracking_code VARCHAR(100) DEFAULT NULL, -- código de seguimiento de Correo Argentino
    zipnova_shipment_id VARCHAR(100) DEFAULT NULL, -- id del envio creado en Zipnova (legacy)
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(50) NOT NULL UNIQUE,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings (key_name, value) VALUES ('min_purchase_amount', '1000') ON DUPLICATE KEY UPDATE value=value;
INSERT INTO settings (key_name, value) VALUES ('fixed_shipping_cost', '5000') ON DUPLICATE KEY UPDATE value=value;
INSERT INTO settings (key_name, value) VALUES ('maintenance_mode', 'false') ON DUPLICATE KEY UPDATE value=value;

-- Tabla para plantillas de email personalizadas
CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_key VARCHAR(100) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  html_content LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla para cupones de descuento
CREATE TABLE IF NOT EXISTS cupones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  tipo_descuento ENUM('porcentaje', 'fijo', 'envio_gratis') NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  limite_usos INT DEFAULT NULL,
  usos_actuales INT DEFAULT 0,
  fecha_expiracion TIMESTAMP NULL DEFAULT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla para gestión de lotes
CREATE TABLE IF NOT EXISTS lotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT FALSE
);

-- Modificar tabla pedidos para asociarla a un lote
ALTER TABLE pedidos 
  ADD COLUMN lote_id INT DEFAULT NULL;
----------------------------------------

-- Tabla de ingredientes para producción
CREATE TABLE IF NOT EXISTS ingredientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  unidad ENUM('litros', 'gramos') NOT NULL DEFAULT 'gramos',
  es_fijo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar Alcohol como ingrediente fijo
INSERT INTO ingredientes (nombre, unidad, es_fijo) VALUES ('Alcohol', 'litros', TRUE) ON DUPLICATE KEY UPDATE es_fijo=TRUE;

-- Tabla de barriles para gestión de producción
CREATE TABLE IF NOT EXISTS barriles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identificador VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) DEFAULT NULL,
  capacidad_litros DECIMAL(10, 2) NOT NULL,
  litros_actuales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  estado ENUM('vacio','en_proceso','listo') NOT NULL DEFAULT 'vacio',
  ultima_mezcla TIMESTAMP NULL DEFAULT NULL,
  notas TEXT DEFAULT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registro de actividades por barril
CREATE TABLE IF NOT EXISTS barril_registros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barril_id INT NOT NULL,
  tipo ENUM('ingrediente','mezcla','extraccion','nota') NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  ingrediente_id INT DEFAULT NULL,
  cantidad_litros DECIMAL(10, 2) DEFAULT NULL,
  cantidad_gramos DECIMAL(10, 2) DEFAULT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barril_id) REFERENCES barriles(id) ON DELETE CASCADE,
  FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id) ON DELETE SET NULL
);

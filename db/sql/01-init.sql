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
    status ENUM('disponible','proximamente','agotado') NOT NULL DEFAULT 'disponible'
);

CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    external_reference VARCHAR(100) -- Aquí guardaremos un UUID o referencia única si quieres
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
CREATE DATABASE IF NOT EXISTS db_fernetloshorneros;
USE db_fernetloshorneros;

CREATE TABLE IF NOT EXISTS usuario_lista_espera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    provincia VARCHAR(100) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
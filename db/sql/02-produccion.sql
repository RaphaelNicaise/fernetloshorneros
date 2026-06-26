USE db_fernetloshorneros;

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

-- Insertar horarios para los días de la semana (lunes a viernes)
INSERT INTO horarios (dia, hora_apertura, hora_cierre, estado)
VALUES
    ('Lunes', '09:00', '18:00', 1),
    ('Martes', '09:00', '18:00', 1),
    ('Miércoles', '09:00', '18:00', 1),
    ('Jueves', '09:00', '18:00', 1),
    ('Viernes', '09:00', '18:00', 1);

-- Insertar horarios para el fin de semana (sábado y domingo)
INSERT INTO horarios (dia, hora_apertura, hora_cierre, estado)
VALUES
    ('Sábado', '10:00', '16:00', 1),
    ('Domingo', '10:00', '16:00', 2);

---Insert de servicios de pruebas	
INSERT INTO servicios (nombre, descripcion, foto, estado)
VALUES
  ('Lavado Básico', 'Lavado exterior del automóvil', 'lavado_basico.jpg', 1),
  ('Lavado Premium', 'Lavado exterior e interior del automóvil', 'lavado_premium.jpg', 1),
  ('Lavado de Motor', 'Limpieza del motor del automóvil', 'lavado_motor.jpg', 1);

----- INSERT de precios de servicios
INSERT INTO precio_servicios (id_servicios, precio, estado)
VALUES
  (1, 20.00, 1), -- Precio del Lavado Básico: $20.00
  (2, 40.00, 1), -- Precio del Lavado Premium: $40.00
  (3, 30.00, 1); -- Precio del Lavado de Motor: $30.00

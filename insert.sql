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
	
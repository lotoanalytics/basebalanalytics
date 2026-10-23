insert into public.torneos (id, nombre, subtitulo, lema, orden) values
  ('invernal', 'Pelota Invernal', 'LIDOM · República Dominicana', 'Pelota invernal · LIDOM', 1),
  ('caribe',   'Serie del Caribe', 'Campeones de cada país',      'Serie del Caribe',        2),
  ('clasico',  'Clásico Mundial',  'Selecciones nacionales',      'Clásico Mundial',         3);

insert into public.equipos (torneo_id, codigo, nombre, animal, color1, color2, color_oscuro) values
  ('invernal','TL','Tigres',   'tigre',   '#2e78ff','#0b2a6e',null),
  ('invernal','GC','Gigantes', 'caballo', '#b03a52','#3a0d16',null),
  ('invernal','TE','Toros',    'toro',    '#ff9a2e','#b84400','#7a2c00'),
  ('invernal','EO','Estrellas','elefante','#22c86a','#0b4d27',null),
  ('invernal','AC','Águilas',  'aguila',  '#ffd21f','#a87b00','#6b4c00'),
  ('invernal','LE','Leones',   'leon',    '#ff3a4a','#7a0d16',null);

insert into public.equipos (torneo_id, codigo, nombre, bandera) values
  ('caribe','MEX','MEX','MEX'), ('caribe','MXV','MXV','MEX'), ('caribe','PUR','PUR','PUR'),
  ('caribe','DOM','DOM','DOM'), ('caribe','PAN','PAN','PAN'),
  ('clasico','CA','CA','CA'), ('clasico','ISR','ISR','ISR'), ('clasico','VEN','VEN','VEN'),
  ('clasico','EEUU','EEUU','EEUU'), ('clasico','ITA','ITA','ITA'), ('clasico','DOM','DOM','DOM'),
  ('clasico','JP','JP','JP'), ('clasico','PUR','PUR','PUR'), ('clasico','KOR','KOR','KOR'),
  ('clasico','MEX','MEX','MEX'), ('clasico','NL','NL','NL'), ('clasico','PAN','PAN','PAN'),
  ('clasico','NIC','NIC','NIC');

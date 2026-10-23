-- ===== Baseball Analytics: tablas base =====

-- Función para la columna "actualizado"
create or replace function public.poner_actualizado()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado := now();
  return new;
end $$;

-- 1) Torneos (Pelota Invernal, Serie del Caribe, Clásico Mundial)
create table public.torneos (
  id          text primary key,                 -- 'invernal', 'caribe', 'clasico'
  nombre      text not null,
  subtitulo   text,
  lema        text,
  temporada   text,                             -- ej. '2026-27'
  orden       smallint not null default 0,
  activo      boolean not null default true,
  actualizado timestamptz not null default now()
);

-- 2) Equipos de cada torneo
create table public.equipos (
  id          bigint generated always as identity primary key,
  torneo_id   text not null references public.torneos(id) on update cascade on delete cascade,
  codigo      text not null,                    -- TL, GC, MEX, DOM...
  nombre      text not null,
  animal      text,                             -- dibujo propio: tigre, caballo, toro, elefante, aguila, leon
  bandera     text,                             -- código de bandera para países (MEX, DOM...)
  color1      text,
  color2      text,
  color_oscuro text,
  actualizado timestamptz not null default now(),
  unique (torneo_id, codigo)
);

-- 3) Juegos: calendario y resultados en una sola tabla
create table public.juegos (
  id            bigint generated always as identity primary key,
  torneo_id     text not null references public.torneos(id) on update cascade on delete cascade,
  fecha         date not null,
  hora          time,                           -- hora de República Dominicana
  visitante     text not null,
  casa          text not null,
  estado        text not null default 'programado'
                check (estado in ('programado','en_vivo','final','pospuesto','suspendido')),
  carreras_visitante smallint, carreras_casa smallint,
  hits_visitante     smallint, hits_casa     smallint,
  errores_visitante  smallint, errores_casa  smallint,
  ganador       text,                           -- lanzador ganador
  perdedor      text,                           -- lanzador perdedor
  salvamento    text,
  motivo        text,                           -- ej. 'Por lluvias'
  fuente        text,                           -- de dónde vino el dato
  fuente_id     text,                           -- id del juego en la fuente (para no duplicar)
  actualizado   timestamptz not null default now(),
  foreign key (torneo_id, visitante) references public.equipos(torneo_id, codigo) on update cascade,
  foreign key (torneo_id, casa)      references public.equipos(torneo_id, codigo) on update cascade,
  check (visitante <> casa),
  unique (torneo_id, fuente_id)
);
create index juegos_torneo_fecha on public.juegos (torneo_id, fecha desc);
create index juegos_estado on public.juegos (estado) where estado = 'en_vivo';
create index juegos_visitante on public.juegos (torneo_id, visitante);
create index juegos_casa on public.juegos (torneo_id, casa);

-- 4) Detalle del juego en vivo (bases, conteo, bateador...)
create table public.juego_en_vivo (
  juego_id      bigint primary key references public.juegos(id) on delete cascade,
  entrada       text,                           -- 'Baja 7ma'
  al_bate       text check (al_bate in ('visitante','casa')),
  bolas         smallint not null default 0 check (bolas between 0 and 3),
  strikes       smallint not null default 0 check (strikes between 0 and 2),
  outs          smallint not null default 0 check (outs between 0 and 3),
  primera       boolean not null default false,
  segunda       boolean not null default false,
  tercera       boolean not null default false,
  bateador      text,
  lanzador      text,
  ultima_jugada text,
  nota          text,                           -- 'Cambio de lanzador'
  actualizado   timestamptz not null default now()
);

-- 5) Tabla de posiciones (la oficial; si está vacía, la página la calcula con los juegos)
create table public.posiciones (
  torneo_id   text not null,
  equipo      text not null,
  ganados     smallint not null default 0,
  perdidos    smallint not null default 0,
  actualizado timestamptz not null default now(),
  primary key (torneo_id, equipo),
  foreign key (torneo_id, equipo) references public.equipos(torneo_id, codigo) on update cascade on delete cascade
);

-- 6) Avisos enviados por el robot de béisbol (su propia tabla, para no mandar avisos repetidos)
create table public.avisos_enviados (
  id          bigint generated always as identity primary key,
  juego_id    bigint not null references public.juegos(id) on delete cascade,
  tipo        text not null,                    -- 'inicio', 'final', 'pospuesto'...
  enviado     timestamptz not null default now(),
  unique (juego_id, tipo)
);

-- Triggers de "actualizado"
create trigger t_torneos_act   before update on public.torneos       for each row execute function public.poner_actualizado();
create trigger t_equipos_act   before update on public.equipos       for each row execute function public.poner_actualizado();
create trigger t_juegos_act    before update on public.juegos        for each row execute function public.poner_actualizado();
create trigger t_vivo_act      before update on public.juego_en_vivo for each row execute function public.poner_actualizado();
create trigger t_pos_act       before update on public.posiciones    for each row execute function public.poner_actualizado();

-- Seguridad: todos pueden LEER los datos públicos; solo el robot (service_role) escribe.
alter table public.torneos         enable row level security;
alter table public.equipos         enable row level security;
alter table public.juegos          enable row level security;
alter table public.juego_en_vivo   enable row level security;
alter table public.posiciones      enable row level security;
alter table public.avisos_enviados enable row level security;  -- sin políticas: nadie de afuera la ve

create policy "leer torneos"     on public.torneos       for select to anon, authenticated using (true);
create policy "leer equipos"     on public.equipos       for select to anon, authenticated using (true);
create policy "leer juegos"      on public.juegos        for select to anon, authenticated using (true);
create policy "leer en vivo"     on public.juego_en_vivo for select to anon, authenticated using (true);
create policy "leer posiciones"  on public.posiciones    for select to anon, authenticated using (true);

-- Posiciones calculadas solas a partir de los juegos finales (para Serie del Caribe y Clásico)
create view public.posiciones_calculadas with (security_invoker = true) as
with r as (
  select torneo_id,
         case when carreras_visitante > carreras_casa then visitante else casa end as gana,
         case when carreras_visitante > carreras_casa then casa else visitante end as pierde
  from public.juegos
  where estado = 'final' and carreras_visitante is not null and carreras_casa is not null
    and carreras_visitante <> carreras_casa
)
select e.torneo_id, e.codigo as equipo,
       (select count(*) from r where r.torneo_id = e.torneo_id and r.gana = e.codigo)::int   as ganados,
       (select count(*) from r where r.torneo_id = e.torneo_id and r.pierde = e.codigo)::int as perdidos
from public.equipos e;

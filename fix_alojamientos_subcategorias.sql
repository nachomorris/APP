-- ============================================================
-- Fix de datos: subcategorías de alojamiento
-- Correr en el SQL Editor de Supabase (una sola vez).
-- Asigna subcategory_id a cada ficha de alojamiento según el
-- archivo real alojamientos_2026-07-10.xlsx (columna 'Tipo').
-- Solo hace UPDATE por legacy_id, no inserta ni duplica nada.
-- ============================================================

-- cabanas (72 fichas)
update public.businesses set subcategory_id = 'cabanas'
where legacy_id in (
  'abuelito-antonio-cabanas',
  'ak-tu-lugar',
  'antu-kuyen',
  'aroma-de-potrero',
  'augurios-del-sol-2',
  'ayres-de-funes',
  'balcones-del-lago',
  'bella-vista',
  'brisa-del-lago',
  'brisa-serrana',
  'cabanas-holtfor',
  'cabanas-inaki-anexo-cafeteria',
  'cabanas-lucero',
  'castillo-de-sol',
  'cefiro',
  'claro-de-luna',
  'colores-de-los-funes',
  'complejo-retana',
  'cumelem',
  'del-duende',
  'del-fuego',
  'dona-emilia',
  'el-colibri',
  'el-crepusculo',
  'el-fin-del-afan',
  'el-nogal',
  'el-reparo',
  'encanto-puntano',
  'estacion-potrero',
  'eureka',
  'gemas-del-lago',
  'koba',
  'kume',
  'la-colina',
  'la-gringa',
  'la-lomita',
  'la-soleada',
  'las-acacias',
  'las-encinas',
  'las-mercedes',
  'las-piedras',
  'las-torcazas',
  'los-arroyitos',
  'los-fresnos',
  'los-molles',
  'los-pinos-1',
  'ludmar',
  'lunas-y-soles',
  'lunas-y-soles-2',
  'mirando-al-valle',
  'molinos-de-vientos',
  'montearena',
  'munay',
  'murmullo-del-rio',
  'naife',
  'oliber-cabanas',
  'pauvalen-1-y-2',
  'pueblo-de-jesus',
  'quela',
  'ranchito-de-suenos',
  'retana',
  'rincon-del-rio',
  'rincon-potrero',
  'ruca-kiyen',
  'sol-dorado',
  'solares-de-potrero',
  'sololosta-cabanas',
  'tata-y-la-emilia',
  'terra-soles',
  'tronco-silvestre',
  'turmalina',
  'valle-la-vaguada'
);

-- apart-hotel (6 fichas)
update public.businesses set subcategory_id = 'apart-hotel'
where legacy_id in (
  'aguamansa-apart-hotel',
  'amantea-apart-hotel',
  'apart-altos-de-aliwen',
  'el-triunfo-apart',
  'la-quebrada-apart-hotel',
  'oasis-apart'
);

-- casa (7 fichas)
update public.businesses set subcategory_id = 'casa'
where legacy_id in (
  'casa-alquiler-por-dia',
  'casa-de-las-flores',
  'casa-majo',
  'la-casa-de-mune',
  'la-mamalia-casa-en-alquiler',
  'la-norma-casa-en-alquiler',
  'lo-de-esther'
);

-- complejo (8 fichas)
update public.businesses set subcategory_id = 'complejo'
where legacy_id in (
  'complejo-el-mirador',
  'los-alelies',
  'los-paraisos',
  'lunamakena-2',
  'pisco-yaku',
  'ramadas',
  'villa-king',
  'villa-las-lomas'
);

-- departamentos (1 fichas)
update public.businesses set subcategory_id = 'departamentos'
where legacy_id in (
  'destello-del-lago'
);

-- hosteria (2 fichas)
update public.businesses set subcategory_id = 'hosteria'
where legacy_id in (
  'hosteria-lihuen',
  'los-naranjos'
);

-- hotel (2 fichas)
update public.businesses set subcategory_id = 'hotel'
where legacy_id in (
  'hotel-potrero-de-los-funes',
  'hotel-puntano'
);

-- hostal (1 fichas)
update public.businesses set subcategory_id = 'hostal'
where legacy_id in (
  'la-casa-del-tata-hostal'
);

-- posada (2 fichas)
update public.businesses set subcategory_id = 'posada'
where legacy_id in (
  'posada-spa-terrazas',
  'posada-valle-del-sol'
);

-- 'aitue' figura como Tipo = 'Indeterminado' en la planilla: se deja
-- sin subcategoría a propósito (no había dato para asignarle).
--   aitue (Aitue)
-- Estas fichas de alojamiento no aparecen en la planilla (no se tocan):
--   agua-clara-parador (Agua Clara - Parador)

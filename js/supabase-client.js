/**
 * Configuración del cliente Supabase y Helper de Sincronización (Offline-First)
 * IASD Belén
 */

const SUPABASE_URL = 'https://ojfpzlvayjfzzqtqydgy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZnB6bHZheWpmenpxdHF5ZGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDIzOTYsImV4cCI6MjEwMDIxODM5Nn0.iLCgGBZPP0Zv0cU3xpbNq1rdb9C4AbBKyXV8Mr665NE';

// Helper para convertir cualquier formato de fecha (incluyendo fechas en español con "a. m. / p. m.") a formato ISO compatible con PostgreSQL
function formatDateForDb(val) {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  }
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  try {
    const str = String(val).replace(/a\.\s*m\./i, 'AM').replace(/p\.\s*m\./i, 'PM');
    const match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (match) {
      let day = parseInt(match[1], 10);
      let month = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      if (day <= 31 && month <= 12) {
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
  } catch (e) {}

  return new Date().toISOString();
}

// Inicializar cliente si la librería global supabase existe
let supabaseClient = null;

if (typeof supabase !== 'undefined' && supabase.createClient) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Cliente Supabase inicializado correctamente.');
  
  // Refrescar caché de esquema para las tablas principales
  try {
    const tablas = [
      'examenes', 'pedidos_libros', 'interesados', 'anuncios', 'cronograma_predicadores', 
      'galeria_fotos', 'transmisiones', 'inscripciones_cursos', 'libros', 'encuestas', 'votos_encuestas',
      'bd_aventureros', 'bd_conquistadores', 'bd_guias_mayores',
      'cuotas_aventureros', 'cuotas_conquistadores', 'cuotas_guias_mayores',
      'eventos_aventureros', 'eventos_conquistadores', 'eventos_guias_mayores'
    ];
    tablas.forEach(t => {
      supabaseClient.from(t).select('*').limit(0).catch(() => {});
    });
    console.log('🔄 Caché de esquema de Supabase refrescado.');
  } catch (e) {}
} else {
  console.warn('⚠️ La librería Supabase SDK no está cargada aún. Asegúrate de incluir el CDN o script local en el HTML.');
}

window.supabaseClient = supabaseClient;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

/**
 * Mapeo de claves primarias compuestas o específicas por tabla
 */
const TABLE_MATCH_COLS = {
  inscripciones_cursos: 'alumno_documento,id_curso',
  alumnos_identidades: 'documento',
  logros_alumnos: 'alumno_documento,logro_id',
  votos_encuestas: 'encuesta_id,usuario_identificador',
  cronograma_predicadores: 'id',
  pedidos_libros: 'id',
  libros: 'id',
  anuncios: 'id',
  interesados: 'id',
  examenes: 'id',
  respuestas_examenes: 'id',
  encuestas: 'id',
  galeria_fotos: 'id',
  transmisiones: 'id',
  eventos_iglesia: 'id',
  bd_aventureros: 'id',
  bd_conquistadores: 'id',
  bd_guias_mayores: 'id',
  cuotas_aventureros: 'id',
  cuotas_conquistadores: 'id',
  cuotas_guias_mayores: 'id',
  eventos_aventureros: 'id',
  eventos_conquistadores: 'id',
  eventos_guias_mayores: 'id',
  miembros_clubes: 'id',
  cuotas_clubes: 'id',
  eventos_clubes: 'id'
};
window.TABLE_MATCH_COLS = TABLE_MATCH_COLS;

const clubMemberTransformer = {
  toDb(item) {
    if (!item) return null;
    return {
      id: item.id != null ? String(item.id) : undefined,
      nombre: item.nombre || '',
      apellido: item.apellido || '',
      documento: item.documento || item.cc || '',
      fecha_nacimiento: item.fecha_nacimiento || item.fechaNacimiento || null,
      tutor_nombre: item.tutor_nombre || item.tutor || '',
      celular: item.celular || item.telefono || '',
      unidad: item.unidad || '',
      cargo: item.cargo || 'Miembro',
      tipo_sangre: item.tipo_sangre || item.tipoSangre || '',
      cartillas: Array.isArray(item.cartillas) ? item.cartillas.join(', ') : (item.cartillas || ''),
      especialidades: Array.isArray(item.especialidades) ? item.especialidades.join(', ') : (item.especialidades || ''),
      estado: item.estado || 'activo'
    };
  },
  fromDb(data) {
    if (!data) return data;
    const mapRow = r => ({
      ...r,
      cc: r.cc || r.documento || '',
      documento: r.documento || r.cc || '',
      fechaNacimiento: r.fechaNacimiento || r.fecha_nacimiento || '',
      fecha_nacimiento: r.fecha_nacimiento || r.fechaNacimiento || '',
      tipoSangre: r.tipoSangre || r.tipo_sangre || '',
      tipo_sangre: r.tipo_sangre || r.tipoSangre || '',
      tutor: r.tutor || r.tutor_nombre || '',
      tutor_nombre: r.tutor_nombre || r.tutor || ''
    });
    return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
  }
};

const clubCuotasTransformer = {
  toDb(item) {
    if (!item) return null;
    return {
      id: item.id != null ? String(item.id) : undefined,
      nombre: item.nombre || item.miembro_nombre || '',
      pagos: item.pagos || {}
    };
  },
  fromDb(data) {
    if (!data) return data;
    const mapRow = r => ({
      ...r,
      nombre: r.nombre || r.miembro_nombre || '',
      pagos: r.pagos || {}
    });
    return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
  }
};

const clubEventTransformer = {
  toDb(item) {
    if (!item) return null;
    return {
      id: item.id != null ? String(item.id) : undefined,
      titulo: item.titulo || item.nombre || '',
      descripcion: item.descripcion || '',
      fecha: item.fecha || item.date || new Date().toISOString().split('T')[0],
      hora: item.hora || '09:00',
      lugar: item.lugar || ''
    };
  },
  fromDb(data) {
    if (!data) return data;
    const mapRow = r => ({
      ...r,
      titulo: r.titulo || r.nombre || '',
      date: r.date || r.fecha || ''
    });
    return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
  }
};

/**
 * Transformadores de Esquema para Mapeos de Nombre de Columna
 */
const TABLE_TRANSFORMERS = {
  bd_aventureros: clubMemberTransformer,
  bd_conquistadores: clubMemberTransformer,
  bd_guias_mayores: clubMemberTransformer,
  miembros_clubes: clubMemberTransformer,

  cuotas_aventureros: clubCuotasTransformer,
  cuotas_conquistadores: clubCuotasTransformer,
  cuotas_guias_mayores: clubCuotasTransformer,
  cuotas_clubes: clubCuotasTransformer,

  eventos_aventureros: clubEventTransformer,
  eventos_conquistadores: clubEventTransformer,
  eventos_guias_mayores: clubEventTransformer,
  eventos_clubes: clubEventTransformer,
  eventos_iglesia: clubEventTransformer,

  alumnos_identidades: {
    toDb(item) {
      if (!item) return null;
      const fechaVal = formatDateForDb(item.fechaRegistro || item.fecharegistro || item.fecha_registro);
      return {
        documento: item.documento != null ? String(item.documento).trim() : '',
        nombre: item.nombre || '',
        whatsapp: item.whatsapp || item.telefono || item.documento || '',
        grupo: item.grupo || 'General',
        pin: item.pin != null ? String(item.pin) : '',
        fechaRegistro: fechaVal,
        fecharegistro: fechaVal
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        fechaRegistro: r.fechaRegistro || r.fecharegistro || r.fecha_registro || new Date().toISOString(),
        fecharegistro: r.fecharegistro || r.fechaRegistro || r.fecha_registro || new Date().toISOString()
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  encuestas: {
    toDb(item) {
      if (!item) return null;
      const preg = item.pregunta || item.titulo || '';
      return {
        id: item.id != null ? String(item.id) : undefined,
        pregunta: preg,
        titulo: preg,
        opciones: item.opciones || [],
        votos: item.votos || [],
        activa: item.activa !== false
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        pregunta: r.pregunta || r.titulo || '',
        titulo: r.titulo || r.pregunta || ''
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  inscripciones_cursos: {
    toDb(item) {
      if (!item) return null;
      let doc = 'anonimo';
      try {
        const raw = localStorage.getItem('alumnoIdentidad');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.documento) doc = String(parsed.documento).trim();
        }
      } catch (e) {}

      const cursoNombre = typeof item === 'string' ? item : (item.id_curso || item.curso || item.nombre);
      if (!cursoNombre) return null;

      return {
        alumno_documento: typeof item === 'object' && item.alumno_documento ? String(item.alumno_documento).trim() : doc,
        id_curso: String(cursoNombre),
        progreso: typeof item === 'object' && item.progreso != null ? Number(item.progreso) : 0,
        estado: typeof item === 'object' && item.estado ? item.estado : 'en_proceso'
      };
    },
    fromDb(rows) {
      if (!Array.isArray(rows)) return rows;
      return rows.map(r => typeof r === 'string' ? r : (r.id_curso || r.curso)).filter(Boolean);
    }
  },

  libros: {
    toDb(item) {
      if (!item) return null;
      const estadoVal = item.estado || (item.disponible === false ? 'Prestado' : 'Disponible');
      const payload = {
        id: item.id != null ? String(item.id) : undefined,
        titulo: item.titulo || '',
        autor: item.autor || 'Desconocido',
        categoria: item.categoria || 'General',
        disponible: item.disponible !== false && estadoVal !== 'Prestado' && estadoVal !== 'En curso',
        estado: estadoVal,
        portada_url: item.portada_url || item.portada || '',
        portada: item.portada_url || item.portada || '',
        descripcion: item.descripcion || '',
        numero_inventario: item.numero_inventario || item.numeroInventario || ''
      };
      return payload;
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        estado: r.estado || (r.disponible === false ? 'Prestado' : 'Disponible'),
        portada: r.portada || r.portada_url || '',
        portada_url: r.portada_url || r.portada || '',
        numeroInventario: r.numeroInventario || r.numero_inventario || '',
        numero_inventario: r.numero_inventario || r.numeroInventario || ''
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  pedidos_libros: {
    toDb(item) {
      if (!item) return item;
      const libroId = item.libro_id != null ? String(item.libro_id) : (item.libroId != null ? String(item.libroId) : null);
      const libroTit = item.libro_titulo || item.titulo_libro || item.tituloLibro || item.libro || '';
      const solNom = item.solicitante_nombre || item.solicitante || item.nombre || '';
      const solCont = item.solicitante_contacto || item.contacto || item.whatsapp || item.telefono || '';
      const fechaVal = formatDateForDb(item.fecha_solicitud || item.fecha_pedido || item.fecha);

      return {
        id: item.id != null ? String(item.id) : undefined,
        libro_id: libroId,
        libro_titulo: libroTit,
        titulo_libro: libroTit,
        solicitante_nombre: solNom,
        solicitante: solNom,
        solicitante_contacto: solCont,
        contacto: solCont,
        email: item.email || item.correo || '',
        estado: item.estado || 'Pendiente',
        fecha_solicitud: fechaVal,
        fecha_pedido: fechaVal
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        libroId: r.libroId || r.libro_id || null,
        libro_id: r.libro_id || r.libroId || null,
        libro_titulo: r.libro_titulo || r.titulo_libro || r.libro || '',
        solicitante: r.solicitante || r.solicitante_nombre || '',
        solicitante_nombre: r.solicitante_nombre || r.solicitante || '',
        contacto: r.contacto || r.solicitante_contacto || '',
        solicitante_contacto: r.solicitante_contacto || r.contacto || '',
        email: r.email || ''
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  interesados: {
    toDb(item) {
      if (!item) return item;
      const fechaVal = formatDateForDb(item.fecha_contacto || item.fecha);
      return {
        id: item.id != null ? String(item.id) : undefined,
        nombre: item.nombre || '',
        telefono: item.telefono || item.whatsapp || item.celular || '',
        whatsapp: item.whatsapp || item.telefono || item.celular || '',
        direccion: item.direccion || '',
        email: item.email || '',
        estudio_interes: item.estudio_interes || item.estudio || item.interes || 'Estudio Bíblico',
        estado: item.estado || 'nuevo',
        contactado: item.contactado === true,
        fecha: fechaVal,
        fecha_contacto: fechaVal,
        notas: item.notas || ''
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        whatsapp: r.whatsapp || r.telefono || '',
        telefono: r.telefono || r.whatsapp || '',
        fecha_contacto: r.fecha_contacto || r.fecha || '',
        fecha: r.fecha || r.fecha_contacto || '',
        contactado: r.contactado === true
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  anuncios: {
    toDb(item) {
      if (!item) return item;
      return {
        id: item.id != null ? String(item.id) : undefined,
        titulo: item.titulo || '',
        contenido: item.contenido || item.descripcion || '',
        categoria: item.categoria || 'General',
        ubicacion: item.ubicacion || item.lugar || '',
        fecha_inicio: item.fecha_inicio || item.fechaInicio || item.fecha || null,
        hora_inicio: item.hora_inicio || item.horaInicio || item.hora || null,
        fecha_fin: item.fecha_fin || item.fechaFin || null,
        hora_fin: item.hora_fin || item.horaFin || null,
        imagen: item.imagen || item.imagen_url || '',
        imagen_url: item.imagen_url || item.imagen || '',
        activo: item.activo !== false
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        fechaInicio: r.fechaInicio || r.fecha_inicio || '',
        fecha_inicio: r.fecha_inicio || r.fechaInicio || '',
        horaInicio: r.horaInicio || r.hora_inicio || '',
        hora_inicio: r.hora_inicio || r.horaInicio || '',
        fechaFin: r.fechaFin || r.fecha_fin || '',
        fecha_fin: r.fecha_fin || r.fechaFin || '',
        horaFin: r.horaFin || r.hora_fin || '',
        hora_fin: r.hora_fin || r.horaFin || '',
        imagen_url: r.imagen_url || r.imagen || '',
        imagen: r.imagen || r.imagen_url || ''
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  cronograma_predicadores: {
    toDb(item) {
      if (!item) return null;
      if (item.fecha || item.predicador || item.actividad) {
        const act = item.actividad || item.culto_tipo || item.culto || 'Sábado Mañana';
        const f = item.fecha || new Date().toISOString().split('T')[0];
        const idVal = item.id ? String(item.id) : `${act.replace(/\s+/g, '_')}_${f}`;
        return {
          id: idVal,
          fecha: f,
          predicador: typeof item.predicador === 'string' ? item.predicador : (item.nombre || ''),
          culto_tipo: act,
          actividad: act,
          tema: item.tema || '',
          curso: item.curso || '',
          recurrente: item.recurrente === true,
          semanas: item.semanas ? Number(item.semanas) : 1
        };
      }
      return null;
    },
    fromDb(data) {
      if (!data) return data;
      if (Array.isArray(data)) {
        const result = {};
        data.forEach(r => {
          if (r && (r.fecha || r.id)) {
            const act = r.actividad || r.culto_tipo || 'Culto';
            const f = r.fecha || r.id;
            if (!result[act]) result[act] = {};
            result[act][f] = r.predicador || '';
          }
        });
        return result;
      }
      return data;
    }
  },

  galeria_fotos: {
    toDb(item) {
      if (!item) return item;
      return {
        id: item.id != null ? String(item.id) : undefined,
        titulo: item.titulo || '',
        descripcion: item.descripcion || '',
        imagen: item.imagen || item.url || '',
        url: item.url || item.imagen || '',
        categoria: item.categoria || 'General',
        fecha: formatDateForDb(item.fecha),
        creadopor: item.creadopor || item.creadoPor || 'admin'
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        url: r.url || r.imagen || '',
        imagen: r.imagen || r.url || ''
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  transmisiones: {
    toDb(item) {
      if (!item) return item;
      return {
        id: item.id != null ? String(item.id) : undefined,
        titulo: item.titulo || '',
        url_video: item.url_video || item.url || '',
        url: item.url || item.url_video || '',
        tipo: item.tipo || 'YouTube',
        activo: item.activo !== false,
        activa: item.activa !== false,
        fecha: formatDateForDb(item.fecha)
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        url_video: r.url_video || r.url || '',
        url: r.url || r.url_video || ''
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  examenes: {
    toDb(item) {
      if (!item) return item;
      const cant = item.cantidadpreguntas ?? item.cantidad_preguntas ?? item.cantidadPreguntas ?? (item.preguntas ? item.preguntas.length : 0);
      return {
        id: item.id != null ? String(item.id) : undefined,
        id_curso: String(item.id_curso || item.cursoId || item.curso || 'general'),
        titulo: item.titulo || '',
        descripcion: item.descripcion || '',
        duracion_min: item.duracion_min || item.duracion || 30,
        preguntas: item.preguntas || [],
        cantidadpreguntas: cant,
        cantidad_preguntas: cant,
        activo: item.activo !== false
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        cantidadPreguntas: r.cantidadpreguntas ?? r.cantidad_preguntas ?? r.cantidadPreguntas ?? (r.preguntas ? r.preguntas.length : 0),
        cantidadpreguntas: r.cantidadpreguntas ?? r.cantidad_preguntas ?? r.cantidadPreguntas ?? (r.preguntas ? r.preguntas.length : 0),
        cantidad_preguntas: r.cantidad_preguntas ?? r.cantidad_preguntas ?? r.cantidadPreguntas ?? (r.preguntas ? r.preguntas.length : 0)
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  },

  respuestas_examenes: {
    toDb(item) {
      if (!item) return item;
      return {
        id: item.id != null ? String(item.id) : undefined,
        examen_id: String(item.examen_id || item.examenId || ''),
        alumno_documento: String(item.alumno_documento || item.documento || ''),
        alumno_nombre: item.alumno_nombre || item.nombre || '',
        calificacion: Number(item.calificacion || 0),
        respuestas: item.respuestas || {},
        intento: Number(item.intento || 1),
        estado: item.estado || 'aprobado',
        fecha_rendido: formatDateForDb(item.fecha_rendido || item.fecha)
      };
    },
    fromDb(data) {
      if (!data) return data;
      const mapRow = r => ({
        ...r,
        examenId: r.examenId || r.examen_id || '',
        documento: r.documento || r.alumno_documento || '',
        nombre: r.nombre || r.alumno_nombre || ''
      });
      return Array.isArray(data) ? data.map(mapRow) : mapRow(data);
    }
  }
};

/**
 * Motor de Sincronización Transparente (Offline-First)
 */
const SupabaseSync = {
  get(key, table, defaultValue, transformFromDb) {
    let localData = defaultValue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) localData = JSON.parse(raw);
    } catch (e) {}

    if (window.supabaseClient) {
      window.supabaseClient.from(table).select('*').then(({ data, error }) => {
        if (!error && data) {
          const customTransform = transformFromDb || (TABLE_TRANSFORMERS[table] ? TABLE_TRANSFORMERS[table].fromDb : null);
          const formatted = customTransform ? customTransform(data) : data;
          localStorage.setItem(key, JSON.stringify(formatted));
          window.dispatchEvent(new CustomEvent(`supabase_synced_${key}`, { detail: formatted }));
        }
      }).catch(err => console.warn(`[SupabaseSync] Error leyendo ${table}:`, err));
    }

    return localData;
  },

  set(key, table, value, matchColOverride, transformToDb) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}

    if (!window.supabaseClient) return;

    try {
      const matchCol = matchColOverride || TABLE_MATCH_COLS[table] || 'id';
      const transformer = transformToDb || (TABLE_TRANSFORMERS[table] ? TABLE_TRANSFORMERS[table].toDb : null);

      let rawItems = [];
      if (table === 'cronograma_predicadores' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [act, fechasObj] of Object.entries(value)) {
          if (fechasObj && typeof fechasObj === 'object') {
            for (const [f, val] of Object.entries(fechasObj)) {
              if (val) {
                const pred = typeof val === 'object' ? (val.predicador || val.nombre || '') : String(val);
                const temaVal = typeof val === 'object' ? (val.tema || '') : '';
                rawItems.push({
                  id: `${act.replace(/\s+/g, '_')}_${f}`,
                  actividad: act,
                  culto_tipo: act,
                  fecha: f,
                  predicador: pred,
                  tema: temaVal
                });
              }
            }
          }
        }
      } else if (Array.isArray(value)) {
        rawItems = value;
      } else if (typeof value === 'object' && value !== null) {
        rawItems = Object.values(value);
      } else if (value != null) {
        rawItems = [value];
      }

      let payload = rawItems;
      if (transformer) {
        payload = rawItems.map(item => transformer(item)).filter(Boolean);
      }

      if (payload && payload.length > 0) {
        window.supabaseClient.from(table).upsert(payload, { onConflict: matchCol })
          .then(({ error }) => {
            if (error) console.error(`[SupabaseSync] Error al guardar en ${table}:`, error);
            else console.log(`[SupabaseSync] ✅ Sincronizado ${table}`);
          })
          .catch(err => console.warn(`[SupabaseSync] Error de red en ${table}:`, err));
      }

      // Sincronizar eliminaciones en Supabase
      this._syncDeletions(table, matchCol, payload || []);
    } catch (e) {
      console.error(`[SupabaseSync] Excepción al guardar en ${table}:`, e);
    }
  },

  _syncDeletions(table, matchCol, currentPayload) {
    if (!window.supabaseClient || !matchCol || matchCol.includes(',')) return;

    const currentIds = new Set(
      (currentPayload || [])
        .map(item => item && item[matchCol] != null ? String(item[matchCol]) : null)
        .filter(Boolean)
    );

    window.supabaseClient.from(table).select(matchCol).then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        const deletedIds = data
          .map(row => row && row[matchCol] != null ? String(row[matchCol]) : null)
          .filter(id => id && !currentIds.has(id));

        if (deletedIds.length > 0) {
          window.supabaseClient.from(table).delete().in(matchCol, deletedIds)
            .then(({ error: delErr }) => {
              if (delErr) console.error(`[SupabaseSync] Error eliminando registros en ${table}:`, delErr);
              else console.log(`[SupabaseSync] 🗑️ Sincronizada eliminación de ${deletedIds.length} elemento(s) en ${table}`);
            });
        }
      }
    }).catch(() => {});
  },

  insert(key, table, row, transformRow) {
    let localList = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) localList = JSON.parse(raw);
    } catch (e) {}

    if (Array.isArray(localList)) {
      localList.push(row);
      try { localStorage.setItem(key, JSON.stringify(localList)); } catch (e) {}
    }

    if (!window.supabaseClient) return;

    const transformer = transformRow || (TABLE_TRANSFORMERS[table] ? TABLE_TRANSFORMERS[table].toDb : null);
    const payload = transformer ? transformer(row) : row;
    
    window.supabaseClient.from(table).insert([payload])
      .then(({ error }) => {
        if (error) console.error(`[SupabaseSync] Error al insertar en ${table}:`, error);
        else console.log(`[SupabaseSync] ✅ Insertado en ${table}`);
      })
      .catch(err => console.warn(`[SupabaseSync] Error de red insertando en ${table}:`, err));
  },

  delete(key, table, colName, value) {
    const col = colName || TABLE_MATCH_COLS[table] || 'id';
    let localList = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) localList = JSON.parse(raw);
    } catch (e) {}

    if (Array.isArray(localList)) {
      localList = localList.filter(item => item && String(item[col]) !== String(value));
      try { localStorage.setItem(key, JSON.stringify(localList)); } catch (e) {}
    } else if (typeof localList === 'object' && localList !== null) {
      delete localList[value];
      try { localStorage.setItem(key, JSON.stringify(localList)); } catch (e) {}
    }

    if (!window.supabaseClient) return;

    window.supabaseClient.from(table).delete().eq(col, value)
      .then(({ error }) => {
        if (error) console.error(`[SupabaseSync] Error eliminando en ${table}:`, error);
        else console.log(`[SupabaseSync] ✅ Eliminado de ${table}`);
      })
      .catch(err => console.warn(`[SupabaseSync] Error de red eliminando en ${table}:`, err));
  }
};

window.SupabaseSync = SupabaseSync;


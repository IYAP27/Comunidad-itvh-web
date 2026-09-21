import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const niveles: Record<string, number> = { moderador: 1, admin: 2 };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !serviceRole) return json({ error: 'Configuración incompleta.' }, 500);

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'No autenticado.' }, 401);
  const token = authHeader.slice(7);

  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const uid = userData?.user?.id;
  if (userError || !uid) return json({ error: 'Sesión inválida.' }, 401);

  const { data: adminRow, error: adminError } = await admin
    .from('tabla_admins')
    .select('id,nivel')
    .eq('perfil_id', uid)
    .maybeSingle();
  if (adminError || !adminRow) return json({ error: 'Acceso administrativo requerido.' }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const accion = String(body?.accion || '');
  const payload = body?.payload || {};

  const exigir = (nivel: 'moderador' | 'admin') => {
    if ((niveles[adminRow.nivel] || 0) < niveles[nivel]) throw new Error('FORBIDDEN');
  };

  const auditar = async (objetivoTipo: string, objetivoId: string | null, motivo: string, metadata: Record<string, unknown> = {}) => {
    await admin.from('auditoria_admin').insert({
      admin_perfil_id: uid,
      accion,
      objetivo_tipo: objetivoTipo,
      objetivo_id: objetivoId,
      motivo,
      metadata,
    });
  };

  try {
    switch (accion) {
      case 'cambiar_estado_usuario': {
        const perfilId = String(payload.perfil_id || '');
        const estado = String(payload.estado || '');
        if (!perfilId || !['activo', 'suspendido', 'expulsado'].includes(estado)) return json({ error: 'Datos inválidos.' }, 400);
        if (perfilId === uid) return json({ error: 'No puedes modificar tu propia cuenta.' }, 403);
        exigir(estado === 'expulsado' ? 'admin' : 'moderador');

        const { data: targetAdmin } = await admin.from('tabla_admins').select('nivel').eq('perfil_id', perfilId).maybeSingle();
        if (targetAdmin && adminRow.nivel !== 'admin') return json({ error: 'Un moderador no puede modificar una cuenta administrativa.' }, 403);

        const { data: previo } = await admin.from('perfiles').select('estado_cuenta,nombre_usuario').eq('id', perfilId).maybeSingle();
        const { error } = await admin.from('perfiles').update({ estado_cuenta: estado }).eq('id', perfilId);
        if (error) throw error;
        await auditar('perfil', perfilId, String(payload.motivo || ''), { estado_anterior: previo?.estado_cuenta ?? null, estado_nuevo: estado, nombre_usuario: previo?.nombre_usuario ?? null });
        return json({ ok: true });
      }

      case 'asignar_admin': {
        exigir('admin');
        const perfilId = String(payload.perfil_id || '');
        const nivel = String(payload.nivel || '');
        if (!perfilId || !['moderador', 'admin'].includes(nivel)) return json({ error: 'Datos inválidos.' }, 400);
        if (perfilId === uid) return json({ error: 'No puedes modificar tu propio nivel desde esta acción.' }, 403);
        const { error } = await admin.from('tabla_admins').insert({ perfil_id: perfilId, nivel });
        if (error) throw error;
        await auditar('perfil', perfilId, 'Asignación administrativa desde backend.', { nivel });
        return json({ ok: true });
      }

      case 'revocar_admin': {
        exigir('admin');
        const perfilId = String(payload.perfil_id || '');
        if (!perfilId) return json({ error: 'Perfil requerido.' }, 400);
        if (perfilId === uid) return json({ error: 'No puedes revocar tus propios permisos.' }, 403);
        const { data: previo } = await admin.from('tabla_admins').select('nivel').eq('perfil_id', perfilId).maybeSingle();
        const { error } = await admin.from('tabla_admins').delete().eq('perfil_id', perfilId);
        if (error) throw error;
        await auditar('perfil', perfilId, 'Revocación administrativa desde backend.', { nivel_previo: previo?.nivel ?? null });
        return json({ ok: true });
      }

      case 'asignar_insignia': {
        exigir('admin');
        const perfilId = String(payload.perfil_id || '');
        const tipo = String(payload.tipo || '').trim();
        if (!perfilId || !tipo || tipo.length > 120) return json({ error: 'Insignia inválida.' }, 400);
        const { error } = await admin.from('insignias').insert({ perfil_id: perfilId, tipo, otorgada_por: adminRow.id });
        if (error) throw error;
        await auditar('perfil', perfilId, 'Asignación de insignia desde backend.', { tipo });
        return json({ ok: true });
      }

      case 'eliminar_insignia': {
        exigir('admin');
        const insigniaId = String(payload.insignia_id || '');
        if (!insigniaId) return json({ error: 'Insignia requerida.' }, 400);
        const { data: insignia } = await admin.from('insignias').select('perfil_id,tipo').eq('id', insigniaId).maybeSingle();
        const { error } = await admin.from('insignias').delete().eq('id', insigniaId);
        if (error) throw error;
        await auditar('insignia', insigniaId, 'Eliminación de insignia desde backend.', { perfil_id: insignia?.perfil_id ?? null, tipo: insignia?.tipo ?? null });
        return json({ ok: true });
      }

      case 'resolver_reporte': {
        exigir('moderador');
        const tabla = String(payload.tabla || '');
        const reporteId = String(payload.reporte_id || '');
        const estado = String(payload.estado || '');
        if (!['reportes', 'reportes_contenido'].includes(tabla) || !reporteId || !['resuelto', 'ignorado', 'pendiente'].includes(estado)) return json({ error: 'Datos inválidos.' }, 400);
        const update: Record<string, unknown> = { estado };
        if (tabla === 'reportes_contenido') {
          update.resuelto_por = uid;
          update.resuelto_en = new Date().toISOString();
        }
        const { error } = await admin.from(tabla).update(update).eq('id', reporteId);
        if (error) throw error;
        await auditar(tabla, reporteId, `Reporte marcado como ${estado} desde backend.`, { estado });
        return json({ ok: true });
      }

      default:
        return json({ error: 'Acción no soportada.' }, 400);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') return json({ error: 'Permisos insuficientes.' }, 403);
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Error interno.' }, 500);
  }
});

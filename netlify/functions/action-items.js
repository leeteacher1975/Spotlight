import { getStore } from '@netlify/blobs';

// Netlify Functions v2 방식 (export default + config.path) — entries.js/evidence-hunt.js와 동일한 패턴.
// v1(exports.handler) 방식은 Netlify Blobs의 zero-config 자동 인증이 보장되지 않아
// "Blobs 스토어를 초기화하지 못했습니다" 에러를 일으킨 전례가 있으므로 반드시 v2로 유지할 것.

const STORE_NAME = 'za2030-action-items';
const ENTRIES_KEY = 'entries';
const MAX_PER_PERSON = 2;
const MAX_LEN = 300;
const MAX_NAME_LEN = 40;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

function clean(str, max) {
  return (str || '').toString().trim().slice(0, max);
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let store;
  try {
    store = getStore(STORE_NAME);
  } catch (err) {
    return json({
      error: 'Blobs 스토어를 초기화하지 못했습니다. (Netlify Blobs가 이 사이트에서 활성화되어 있는지 확인해 주세요)',
      detail: String(err && err.message),
    }, 500);
  }

  try {
    if (req.method === 'GET') {
      const entries = (await store.get(ENTRIES_KEY, { type: 'json' })) || [];
      return json(entries);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const name = clean(body.name, MAX_NAME_LEN);
      const team = clean(body.team, MAX_NAME_LEN);
      const actionText = clean(body.actionText, MAX_LEN);
      const impact = !!body.impact;
      const control = !!body.control;
      const feasibility = !!body.feasibility;
      const deviceToken = clean(body.deviceToken, 100);

      if (!name || !team || !actionText || !deviceToken) {
        return json({ error: '이름, 소속, 액션 내용은 필수 항목입니다.' }, 400);
      }

      const entries = (await store.get(ENTRIES_KEY, { type: 'json' })) || [];
      const myCount = entries.filter((e) => e.deviceToken === deviceToken).length;
      if (myCount >= MAX_PER_PERSON) {
        return json({ error: `1인당 최대 ${MAX_PER_PERSON}건까지 제안할 수 있습니다.` }, 400);
      }

      const entry = {
        id: crypto.randomUUID(),
        name,
        team,
        actionText,
        impact,
        control,
        feasibility,
        likes: 0,
        likedBy: [],
        deviceToken,
        createdAt: new Date().toISOString(),
      };
      entries.push(entry);
      await store.setJSON(ENTRIES_KEY, entries);
      return json(entry, 201);
    }

    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const { id, deviceToken, action } = body;
      if (!id || !deviceToken || !['like', 'unlike'].includes(action)) {
        return json({ error: '잘못된 요청입니다.' }, 400);
      }
      const entries = (await store.get(ENTRIES_KEY, { type: 'json' })) || [];
      const idx = entries.findIndex((e) => e.id === id);
      if (idx === -1) return json({ error: '항목을 찾을 수 없습니다.' }, 404);

      const entry = entries[idx];
      entry.likedBy = Array.isArray(entry.likedBy) ? entry.likedBy : [];
      if (action === 'like') {
        if (!entry.likedBy.includes(deviceToken)) entry.likedBy.push(deviceToken);
      } else {
        entry.likedBy = entry.likedBy.filter((t) => t !== deviceToken);
      }
      entry.likes = entry.likedBy.length;
      entries[idx] = entry;
      await store.setJSON(ENTRIES_KEY, entries);
      return json(entry);
    }

    if (req.method === 'DELETE') {
      const body = await req.json().catch(() => ({}));
      const { id, deviceToken, adminToken } = body;
      let entries = (await store.get(ENTRIES_KEY, { type: 'json' })) || [];

      // 관리자: 전체 삭제
      if (adminToken !== undefined) {
        const expected = process.env.ADMIN_TOKEN || 'za2030admin';
        if (adminToken !== expected) {
          return json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
        }
        if (!id) {
          await store.setJSON(ENTRIES_KEY, []);
          return json({ ok: true, cleared: true });
        }
        entries = entries.filter((e) => e.id !== id);
        await store.setJSON(ENTRIES_KEY, entries);
        return json({ ok: true });
      }

      // 본인: 본인이 작성한 항목만 삭제 가능
      if (!id || !deviceToken) return json({ error: '잘못된 요청입니다.' }, 400);
      const target = entries.find((e) => e.id === id);
      if (!target) return json({ error: '항목을 찾을 수 없습니다.' }, 404);
      if (target.deviceToken !== deviceToken) {
        return json({ error: '본인이 작성한 항목만 삭제할 수 있습니다.' }, 403);
      }
      entries = entries.filter((e) => e.id !== id);
      await store.setJSON(ENTRIES_KEY, entries);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('action-items function error:', err);
    return json({ error: '서버 오류가 발생했습니다.' }, 500);
  }
};

export const config = { path: '/api/action-items' };

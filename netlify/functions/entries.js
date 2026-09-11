// ZA2030 우리 팀의 핵심 요소 보드 — 서버리스 백엔드 (Netlify Functions v2 + Netlify Blobs)
//
// Functions v2(표준 Request/Response 방식)를 사용합니다. v1 방식(exports.handler)은
// Netlify Blobs의 zero-config 자동 인증이 보장되지 않아 "MissingBlobsEnvironmentError"가
// 발생할 수 있는 것으로 확인되어(Netlify 공식 문서 및 커뮤니티 사례 기준) v2로 작성했습니다.
//
// 엔드포인트: /api/entries (아래 config.path로 직접 매핑, /.netlify/functions/entries 로도 접근 가능)
//
// GET               -> 전체 응답 목록 조회 (공개)
// POST              -> 새 응답 등록 (name, team, pillar, reason, token 필요)
//                      body.action === 'clear-all' 이면 관리자 전체삭제 (adminPassword 필요)
//                      body.action === 'like' | 'unlike' 이면 공감 토글 (id, token 필요)
// PUT               -> 본인 응답 수정 (id, token 일치해야 함)
// DELETE            -> 본인 응답 삭제 (id, token 일치해야 함)

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'za2030-priority-board';
const KEY = 'entries';

// 배포 시 Netlify 사이트 환경변수(ADMIN_TOKEN)를 반드시 설정하세요.
// 설정하지 않으면 아래 기본값이 사용됩니다 (테스트용, 실사용 시 반드시 변경).
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'za2030admin';

const VALID_PILLARS = [
  'customer-at-the-core',
  'speed',
  'truly-global',
  'high-performance-team',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

async function readEntries(store) {
  const data = await store.get(KEY, { type: 'json' });
  return Array.isArray(data) ? data : [];
}

async function readJsonBody(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let store;
  try {
    store = getStore(STORE_NAME);
  } catch (err) {
    return json(500, {
      error: 'Blobs 스토어를 초기화하지 못했습니다. (Netlify Blobs가 이 사이트에서 활성화되어 있는지 확인해 주세요)',
      detail: String(err && err.message),
    });
  }

  try {
    if (req.method === 'GET') {
      const entries = await readEntries(store);
      return json(200, entries);
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body) return json(400, { error: '요청 형식이 올바르지 않습니다.' });

      // 관리자 전체삭제
      if (body.action === 'clear-all') {
        if (typeof body.adminPassword !== 'string' || body.adminPassword !== ADMIN_TOKEN) {
          return json(401, { error: '관리자 비밀번호가 올바르지 않습니다.' });
        }
        await store.setJSON(KEY, []);
        return json(200, { ok: true });
      }

      // 공감(좋아요) 토글
      if (body.action === 'like' || body.action === 'unlike') {
        const { id, token: likeToken } = body;
        if (!id || !likeToken) return json(400, { error: 'id와 token이 필요합니다.' });

        const entries = await readEntries(store);
        const idx = entries.findIndex((e) => e.id === id);
        if (idx === -1) return json(404, { error: '응답을 찾을 수 없습니다.' });

        const entry = entries[idx];
        entry.likedBy = Array.isArray(entry.likedBy) ? entry.likedBy : [];
        if (body.action === 'like') {
          if (!entry.likedBy.includes(likeToken)) entry.likedBy.push(likeToken);
        } else {
          entry.likedBy = entry.likedBy.filter((t) => t !== likeToken);
        }
        entry.likes = entry.likedBy.length;
        entries[idx] = entry;

        await store.setJSON(KEY, entries);
        return json(200, entry);
      }

      const { name, team, pillar, reason, token } = body;
      if (!name || !team || !pillar || !reason || !token) {
        return json(400, { error: '이름, 소속, 선택 항목, 이유를 모두 입력해 주세요.' });
      }
      if (!VALID_PILLARS.includes(pillar)) {
        return json(400, { error: '유효하지 않은 선택 항목입니다.' });
      }

      const entries = await readEntries(store);

      // 1인 1픽: 같은 기기 토큰으로 이미 제출한 기록이 있으면 거부
      if (entries.some((e) => e.token === token)) {
        return json(409, { error: '이미 제출한 응답이 있습니다. 기존 응답을 수정하거나 삭제한 뒤 다시 시도해 주세요.' });
      }

      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: String(name).trim().slice(0, 50),
        team: String(team).trim().slice(0, 50),
        pillar,
        reason: String(reason).trim().slice(0, 1000),
        token: String(token),
        createdAt: new Date().toISOString(),
      };

      entries.push(entry);
      await store.setJSON(KEY, entries);
      return json(200, entry);
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      if (!body) return json(400, { error: '요청 형식이 올바르지 않습니다.' });

      const { id, token, name, team, pillar, reason } = body;
      if (!id || !token) return json(400, { error: 'id와 token이 필요합니다.' });
      if (pillar && !VALID_PILLARS.includes(pillar)) {
        return json(400, { error: '유효하지 않은 선택 항목입니다.' });
      }

      const entries = await readEntries(store);
      const idx = entries.findIndex((e) => e.id === id);
      if (idx === -1) return json(404, { error: '응답을 찾을 수 없습니다.' });
      if (entries[idx].token !== token) return json(403, { error: '수정 권한이 없습니다.' });

      entries[idx] = {
        ...entries[idx],
        name: name !== undefined ? String(name).trim().slice(0, 50) : entries[idx].name,
        team: team !== undefined ? String(team).trim().slice(0, 50) : entries[idx].team,
        pillar: pillar !== undefined ? pillar : entries[idx].pillar,
        reason: reason !== undefined ? String(reason).trim().slice(0, 1000) : entries[idx].reason,
        updatedAt: new Date().toISOString(),
      };

      await store.setJSON(KEY, entries);
      return json(200, entries[idx]);
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody(req);
      if (!body) return json(400, { error: '요청 형식이 올바르지 않습니다.' });

      const { id, token } = body;
      if (!id || !token) return json(400, { error: 'id와 token이 필요합니다.' });

      const entries = await readEntries(store);
      const idx = entries.findIndex((e) => e.id === id);
      if (idx === -1) return json(404, { error: '응답을 찾을 수 없습니다.' });
      if (entries[idx].token !== token) return json(403, { error: '삭제 권한이 없습니다.' });

      entries.splice(idx, 1);
      await store.setJSON(KEY, entries);
      return json(200, { ok: true });
    }

    return json(405, { error: '지원하지 않는 요청입니다.' });
  } catch (err) {
    return json(500, { error: '서버 오류가 발생했습니다: ' + err.message });
  }
};

export const config = {
  path: '/api/entries',
};
